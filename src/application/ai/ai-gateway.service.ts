import {
  AiClientDto,
  AiTaskDto,
  TextStreamChunk,
  UnifiedAudioRequest,
  UnifiedAudioResponse,
  UnifiedImageRequest,
  UnifiedImageTaskResponse,
  UnifiedTextRequest,
  UnifiedTextResponse,
  UnifiedVideoRequest,
  UnifiedVideoTaskResponse,
  AIProfile,
  CatalogResponse,
} from "@/src/domain/ai/models";
import {
  IAiRepository,
  IImageProvider,
  ITaskQueue,
  ITextProvider,
  ITtsProvider,
  IVideoProvider,
} from "@/src/domain/ai/contracts";
import { KeyManagerService } from "./key-manager.service";
import {
  AiRateLimitExceededError,
  AiTaskNotFoundError,
  AiUnauthorizedClientError,
  AiValidationError,
} from "@/src/domain/ai/errors";

export interface GatewayAuthContext {
  client: AiClientDto;
  ipAddress?: string;
  byokKey?: string; // Client có thể tự gửi header X-Provider-Key
}

export class AiGatewayService {
  private repository: IAiRepository;
  private keyManager: KeyManagerService;
  private queue: ITaskQueue;

  private textProviders = new Map<string, ITextProvider>();
  private imageProviders = new Map<string, IImageProvider>();
  private videoProviders = new Map<string, IVideoProvider>();
  private audioProviders = new Map<string, ITtsProvider>();

  // In-memory sliding rate limiter per client
  private clientRequestCounts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(deps: {
    repository: IAiRepository;
    keyManager: KeyManagerService;
    queue: ITaskQueue;
    textProviders?: ITextProvider[];
    imageProviders?: IImageProvider[];
    videoProviders?: IVideoProvider[];
    audioProviders?: ITtsProvider[];
  }) {
    this.repository = deps.repository;
    this.keyManager = deps.keyManager;
    this.queue = deps.queue;

    deps.textProviders?.forEach((p) =>
      this.textProviders.set(p.providerName, p),
    );
    deps.imageProviders?.forEach((p) =>
      this.imageProviders.set(p.providerName, p),
    );
    deps.videoProviders?.forEach((p) =>
      this.videoProviders.set(p.providerName, p),
    );
    deps.audioProviders?.forEach((p) =>
      this.audioProviders.set(p.providerName, p),
    );
  }

  registerTextProvider(provider: ITextProvider) {
    this.textProviders.set(provider.providerName, provider);
  }
  registerImageProvider(provider: IImageProvider) {
    this.imageProviders.set(provider.providerName, provider);
  }
  registerVideoProvider(provider: IVideoProvider) {
    this.videoProviders.set(provider.providerName, provider);
  }
  registerAudioProvider(provider: ITtsProvider) {
    this.audioProviders.set(provider.providerName, provider);
  }

  /**
   * Xác thực Client và kiểm tra Rate Limiting
   */
  async authenticateClient(
    apiKeyHeader?: string | null,
    ipAddress?: string,
  ): Promise<GatewayAuthContext> {
    if (!apiKeyHeader) {
      throw new AiUnauthorizedClientError(
        "Missing X-API-KEY or Authorization header",
      );
    }

    const token = apiKeyHeader.startsWith("Bearer ")
      ? apiKeyHeader.slice(7).trim()
      : apiKeyHeader.trim();
    const client = await this.repository.getClientByApiKey(token);

    if (!client || client.status !== "ACTIVE") {
      throw new AiUnauthorizedClientError("Invalid or deactivated API key");
    }

    // Rate Limiting Check
    const now = Date.now();
    let rateRecord = this.clientRequestCounts.get(client.id);
    if (!rateRecord || now > rateRecord.resetAt) {
      rateRecord = { count: 0, resetAt: now + 60 * 1000 };
      this.clientRequestCounts.set(client.id, rateRecord);
    }

    rateRecord.count++;
    if (rateRecord.count > client.rateLimitPerMin) {
      throw new AiRateLimitExceededError(
        `Client exceeded limit of ${client.rateLimitPerMin} requests per minute`,
      );
    }

    return { client, ipAddress };
  }

  /**
   * TEXT LLM ENGINE: Đồng bộ
   */
  async generateText(
    request: UnifiedTextRequest,
    auth: GatewayAuthContext,
  ): Promise<UnifiedTextResponse> {
    const providerName = (request.provider || "openai").toLowerCase();
    this.validatePermissions(auth.client, providerName, "TEXT");
    if (
      (request.tools?.length ||
        request.messages.some(
          (m) => m.role === "tool" || m.tool_calls?.length,
        )) &&
      !["openai", "openrouter"].includes(providerName)
    ) {
      throw new AiValidationError(
        "Selected provider does not support gateway tool calling; use openai or openrouter.",
      );
    }

    const provider = this.textProviders.get(providerName);
    if (!provider) {
      throw new AiValidationError(
        `Unsupported text provider '${providerName}'`,
      );
    }

    const startTime = Date.now();
    try {
      const response = await this.keyManager.executeWithRetry(
        providerName,
        auth.byokKey ? null : auth.client.id,
        async (apiKey) => {
          const keyToUse = auth.byokKey || apiKey;
          return await provider.generateText(request, keyToUse);
        },
      );

      // Audit Log
      await this.repository.createUsageLog({
        clientId: auth.client.id,
        taskType: "TEXT",
        provider: providerName,
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        latencyMs: Date.now() - startTime,
        statusCode: 200,
        ipAddress: auth.ipAddress,
      });

      return response;
    } catch (err) {
      await this.repository.createUsageLog({
        clientId: auth.client.id,
        taskType: "TEXT",
        provider: providerName,
        model: request.model || "default",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - startTime,
        statusCode: (err as { status?: number })?.status || 500,
        errorMessage: err instanceof Error ? err.message : String(err),
        ipAddress: auth.ipAddress,
      });
      throw err;
    }
  }

  /**
   * TEXT LLM ENGINE: Server-Sent Events (SSE) Streaming
   */
  async *streamText(
    request: UnifiedTextRequest,
    auth: GatewayAuthContext,
  ): AsyncIterable<TextStreamChunk> {
    const providerName = (request.provider || "openai").toLowerCase();
    this.validatePermissions(auth.client, providerName, "TEXT");
    if (
      (request.tools?.length ||
        request.messages.some(
          (m) => m.role === "tool" || m.tool_calls?.length,
        )) &&
      !["openai", "openrouter"].includes(providerName)
    ) {
      throw new AiValidationError(
        "Selected provider does not support gateway tool calling; use openai or openrouter.",
      );
    }

    const provider = this.textProviders.get(providerName);
    if (!provider) {
      throw new AiValidationError(
        `Unsupported text provider '${providerName}'`,
      );
    }

    const key = await this.keyManager.getAvailableKey(
      providerName,
      auth.client.id,
    );
    const keyToUse = auth.byokKey || key.keySecret;
    const stream = provider.streamText(request, keyToUse);

    let totalChars = 0;
    const startTime = Date.now();

    try {
      for await (const chunk of stream) {
        totalChars += chunk.deltaText.length;
        yield chunk;
      }

      await this.repository.createUsageLog({
        clientId: auth.client.id,
        taskType: "TEXT",
        provider: providerName,
        model: request.model || "default",
        promptTokens: 0,
        completionTokens: Math.ceil(totalChars / 4),
        totalTokens: Math.ceil(totalChars / 4),
        latencyMs: Date.now() - startTime,
        statusCode: 200,
        ipAddress: auth.ipAddress,
      });
      await this.keyManager.markKeySuccess(key.id);
    } catch (err) {
      await this.keyManager.markKeyRateLimited(key.id);
      throw err;
    }
  }

  /**
   * IMAGE GEN ENGINE: Async Queue & Task Registration
   */
  async generateImage(
    request: UnifiedImageRequest,
    auth: GatewayAuthContext,
  ): Promise<UnifiedImageTaskResponse> {
    const providerName = (request.provider || "fal-ai").toLowerCase();
    this.validatePermissions(auth.client, providerName, "IMAGE");

    const provider = this.imageProviders.get(providerName);
    if (!provider) {
      throw new AiValidationError(
        `Unsupported image provider '${providerName}'`,
      );
    }

    // 1. Tạo task trong DB
    const task = await this.repository.createTask({
      clientId: auth.client.id,
      taskType: "IMAGE",
      provider: providerName,
      model: request.model || "flux/schnell",
      prompt: request.prompt,
      inputParams: request as unknown as Record<string, unknown>,
      callbackUrl: request.callbackUrl,
    });

    // 2. Gọi provider tạo task bên phía upstream
    const taskResponse = await this.keyManager.executeWithRetry(
      providerName,
      auth.client.id,
      async (apiKey) => {
        return await provider.createImageTask(request, apiKey);
      },
    );

    // 3. Đẩy vào background task queue để worker polling và xử lý webhook/S3
    await this.queue.enqueue({
      taskId: task.id,
      taskType: "IMAGE",
      provider: providerName,
      model: task.model,
      payload: request as unknown as Record<string, unknown>,
      callbackUrl: request.callbackUrl,
      clientId: auth.client.id,
    });

    return {
      taskId: task.id,
      status: "PENDING",
      provider: providerName,
      model: task.model,
      estimatedSeconds: taskResponse.estimatedSeconds || 15,
      createdAt: task.createdAt.toISOString(),
    };
  }

  /**
   * VIDEO GEN ENGINE: Async Heavy Task
   */
  async generateVideo(
    request: UnifiedVideoRequest,
    auth: GatewayAuthContext,
  ): Promise<UnifiedVideoTaskResponse> {
    const providerName = (request.provider || "luma").toLowerCase();
    this.validatePermissions(auth.client, providerName, "VIDEO");

    const provider = this.videoProviders.get(providerName);
    if (!provider) {
      throw new AiValidationError(
        `Unsupported video provider '${providerName}'`,
      );
    }

    const task = await this.repository.createTask({
      clientId: auth.client.id,
      taskType: "VIDEO",
      provider: providerName,
      model: request.model || "ray-2",
      prompt: request.prompt,
      inputParams: request as unknown as Record<string, unknown>,
      callbackUrl: request.callbackUrl,
    });

    const taskResponse = await this.keyManager.executeWithRetry(
      providerName,
      auth.client.id,
      async (apiKey) => {
        return await provider.createVideoTask(request, apiKey);
      },
    );

    await this.queue.enqueue({
      taskId: task.id,
      taskType: "VIDEO",
      provider: providerName,
      model: task.model,
      payload: request as unknown as Record<string, unknown>,
      callbackUrl: request.callbackUrl,
      clientId: auth.client.id,
    });

    return {
      taskId: task.id,
      status: "PENDING",
      provider: providerName,
      model: task.model,
      estimatedSeconds: taskResponse.estimatedSeconds || 120,
      createdAt: task.createdAt.toISOString(),
    };
  }

  /**
   * AUDIO / TTS ENGINE: Stream & Buffer
   */
  async synthesizeAudio(
    request: UnifiedAudioRequest,
    auth: GatewayAuthContext,
  ): Promise<UnifiedAudioResponse> {
    const providerName = (request.provider || "openai-tts").toLowerCase();
    this.validatePermissions(auth.client, providerName, "AUDIO");

    const provider = this.audioProviders.get(providerName);
    if (!provider) {
      throw new AiValidationError(
        `Unsupported audio provider '${providerName}'`,
      );
    }

    const startTime = Date.now();
    const result = await this.keyManager.executeWithRetry(
      providerName,
      auth.client.id,
      async (apiKey) => {
        return await provider.synthesizeAudio(request, apiKey);
      },
    );

    await this.repository.createUsageLog({
      clientId: auth.client.id,
      taskType: "AUDIO",
      provider: providerName,
      model: request.model || "default",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: request.text.length,
      latencyMs: Date.now() - startTime,
      statusCode: 200,
      ipAddress: auth.ipAddress,
    });

    return result;
  }

  /**
   * Truy vấn trạng thái Task
   */
  async getTask(taskId: string, auth: GatewayAuthContext): Promise<AiTaskDto> {
    const task = await this.repository.getTaskById(taskId);
    if (!task) {
      throw new AiTaskNotFoundError(taskId);
    }
    // Bảo vệ đa người dùng: client chỉ xem được task của chính mình (nếu task có clientId)
    if (task.clientId && task.clientId !== auth.client.id) {
      throw new AiTaskNotFoundError(taskId);
    }
    return task;
  }

  /**
   * Lấy danh mục Model/Provider (Catalog) theo quyền của caller (không lộ API secrets)
   * Kiểm tra động theo trạng thái API Key trong Database
   */
  async getCatalog(
    auth: GatewayAuthContext,
    requestedCapability?: string,
  ): Promise<CatalogResponse> {
    const allowedProviders = auth.client.allowedProviders || ["*"];
    const isAllowedProvider = (p: string) =>
      allowedProviders.includes("*") || allowedProviders.includes(p);
    const allowedTasks = auth.client.allowedTasks || ["*"];
    const isAllowedTask = (t: string) =>
      allowedTasks.includes("*") || allowedTasks.includes(t);

    // Kiểm tra trạng thái Key thật trong database
    const allKeys = await this.repository.getAllKeys();
    const activeProviders = new Set<string>();
    for (const k of allKeys) {
      if (
        k.status === "ACTIVE" ||
        (k.status === "RATE_LIMITED" &&
          k.cooldownUntil &&
          new Date() >= new Date(k.cooldownUntil))
      ) {
        activeProviders.add(k.provider.toLowerCase());
      }
    }
    // Edge-TTS là provider miễn phí không cần key
    activeProviders.add("edgetts");

    // Dynamic AI Profiles Registry
    const allProfiles: AIProfile[] = [
      {
        profileId: "text.chat.fast",
        version: 1,
        displayName: "GPT-4o Mini",
        description:
          "Mô hình phản hồi nhanh, tối ưu chi phí cho hội thoại và lập kịch bản",
        capability: "text.generate",
        providerId: "openai",
        upstreamModelId: "gpt-4o-mini",
        executionMode: "gateway_proxy",
        status: activeProviders.has("openai") ? "enabled" : "degraded",
        limits: { maxOutputTokens: 4096 },
        supportedParameters: [
          "temperature",
          "maxTokens",
          "stream",
          "systemPrompt",
        ],
        pricing: { estimatedCostUsd: 0.00015, currency: "USD" },
      },
      {
        profileId: "text.chat.pro",
        version: 1,
        displayName: "GPT-4o",
        description: "Mô hình lập luận cao cấp cho đạo diễn phân cảnh chi tiết",
        capability: "text.generate",
        providerId: "openai",
        upstreamModelId: "gpt-4o",
        executionMode: "gateway_proxy",
        status: activeProviders.has("openai") ? "enabled" : "degraded",
        limits: { maxOutputTokens: 8192 },
        supportedParameters: [
          "temperature",
          "maxTokens",
          "stream",
          "systemPrompt",
        ],
        pricing: { estimatedCostUsd: 0.0025, currency: "USD" },
      },
      {
        profileId: "text.gemini.flash",
        version: 1,
        displayName: "Gemini 2.0 Flash",
        description: "Mô hình Google tốc độ cao và ngữ cảnh lớn",
        capability: "text.generate",
        providerId: "gemini",
        upstreamModelId: "gemini-2.0-flash",
        executionMode: "gateway_proxy",
        status: activeProviders.has("gemini") ? "enabled" : "degraded",
        limits: { maxOutputTokens: 8192 },
        supportedParameters: [
          "temperature",
          "maxTokens",
          "stream",
          "systemPrompt",
        ],
        pricing: { estimatedCostUsd: 0.0001, currency: "USD" },
      },
      {
        profileId: "text.gemini.pro",
        version: 1,
        displayName: "Gemini 1.5 Pro",
        description: "Mô hình Google lập luận sâu sắc cho kịch bản chuyên sâu",
        capability: "text.generate",
        providerId: "gemini",
        upstreamModelId: "gemini-1.5-pro",
        executionMode: "gateway_proxy",
        status: activeProviders.has("gemini") ? "enabled" : "degraded",
        limits: { maxOutputTokens: 8192 },
        supportedParameters: [
          "temperature",
          "maxTokens",
          "stream",
          "systemPrompt",
        ],
        pricing: { estimatedCostUsd: 0.00125, currency: "USD" },
      },
      {
        profileId: "image.flux.schnell",
        version: 1,
        displayName: "FLUX.1 Schnell",
        description: "Sinh ảnh chất lượng cao tốc độ 4 bước",
        capability: "image.generate",
        providerId: "fal-ai",
        upstreamModelId: "flux/schnell",
        executionMode: "gateway_proxy",
        status: activeProviders.has("fal-ai") ? "enabled" : "degraded",
        limits: { allowedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
        supportedParameters: ["prompt", "aspectRatio", "seed", "callbackUrl"],
        pricing: { estimatedCostUsd: 0.003, currency: "USD" },
      },
      {
        profileId: "image.flux.dev",
        version: 1,
        displayName: "FLUX.1 Dev",
        description: "Sinh ảnh chất lượng cao chân thực",
        capability: "image.generate",
        providerId: "fal-ai",
        upstreamModelId: "flux/dev",
        executionMode: "gateway_proxy",
        status: activeProviders.has("fal-ai") ? "enabled" : "degraded",
        limits: { allowedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
        supportedParameters: ["prompt", "aspectRatio", "seed", "callbackUrl"],
        pricing: { estimatedCostUsd: 0.025, currency: "USD" },
      },
      {
        profileId: "video.luma.ray2",
        version: 1,
        displayName: "Luma Ray-2",
        description: "Sinh video chuyển động tự nhiên",
        capability: "video.generate",
        providerId: "luma",
        upstreamModelId: "ray-2",
        executionMode: "gateway_proxy",
        status: activeProviders.has("luma") ? "enabled" : "degraded",
        limits: {
          minDuration: 3,
          maxDuration: 9,
          allowedAspectRatios: ["16:9", "9:16", "1:1"],
        },
        supportedParameters: [
          "prompt",
          "imageUrl",
          "aspectRatio",
          "durationSeconds",
        ],
        pricing: { estimatedCostUsd: 0.15, currency: "USD" },
      },
      {
        profileId: "audio.edgetts.neural",
        version: 1,
        displayName: "Edge-TTS Neural",
        description: "Giọng đọc tiếng Việt tự nhiên miễn phí",
        capability: "audio.speech",
        providerId: "edgetts",
        upstreamModelId: "tts-1",
        executionMode: "gateway_proxy",
        status: "enabled",
        limits: { defaultVoice: "vi-VN-NamMinhNeural" },
        supportedParameters: ["text", "voice", "speed", "format"],
        pricing: { estimatedCostUsd: 0.0, currency: "USD" },
      },
    ];

    // Lọc theo quyền của caller (client.allowedProviders, client.allowedTasks)
    let filteredProfiles = allProfiles.filter((p) => {
      if (!isAllowedProvider(p.providerId)) return false;
      const taskType = p.capability.startsWith("text")
        ? "TEXT"
        : p.capability.startsWith("image")
          ? "IMAGE"
          : p.capability.startsWith("video")
            ? "VIDEO"
            : "AUDIO";
      return isAllowedTask(taskType);
    });

    if (requestedCapability) {
      filteredProfiles = filteredProfiles.filter(
        (p) => p.capability === requestedCapability,
      );
    }

    // Tổ chức danh sách providers cho các client dùng schema providers
    const providersMap = new Map<
      string,
      {
        id: string;
        displayName: string;
        enabled: boolean;
        capabilities: Set<string>;
        models: Array<{
          id: string;
          displayName: string;
          enabled: boolean;
          capabilities: string[];
          limits?: Record<string, unknown>;
        }>;
      }
    >();

    for (const prof of filteredProfiles) {
      let prov = providersMap.get(prof.providerId);
      if (!prov) {
        const displayName =
          prof.providerId === "openai"
            ? "OpenAI"
            : prof.providerId === "gemini"
              ? "Google Gemini"
              : prof.providerId === "fal-ai"
                ? "Fal AI"
                : prof.providerId === "luma"
                  ? "Luma Dream Machine"
                  : "Edge TTS";
        prov = {
          id: prof.providerId,
          displayName,
          enabled: prof.status === "enabled",
          capabilities: new Set<string>(),
          models: [],
        };
        providersMap.set(prof.providerId, prov);
      }
      const capShort = prof.capability.split(".")[0];
      prov.capabilities.add(capShort);
      prov.models.push({
        id: prof.upstreamModelId,
        displayName: prof.displayName,
        enabled: prof.status === "enabled",
        capabilities: [capShort],
        limits: prof.limits,
      });
    }

    const providersList = Array.from(providersMap.values()).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      enabled: p.enabled,
      capabilities: Array.from(p.capabilities),
      models: p.models,
    }));

    return {
      catalogVersion: 1,
      version: 1,
      generatedAt: new Date().toISOString(),
      profiles: filteredProfiles,
      providers: providersList,
    };
  }

  async getProfile(
    profileId: string,
    auth: GatewayAuthContext,
  ): Promise<AIProfile> {
    const catalog = await this.getCatalog(auth);
    const profile = catalog.profiles.find((p) => p.profileId === profileId);
    if (!profile) {
      throw new AiValidationError(
        `Profile '${profileId}' not found or not accessible`,
      );
    }
    return profile;
  }

  private validatePermissions(
    client: AiClientDto,
    provider: string,
    taskType: string,
  ) {
    if (client.allowedProviders && client.allowedProviders.length > 0) {
      if (
        !client.allowedProviders.includes(provider) &&
        !client.allowedProviders.includes("*")
      ) {
        throw new AiValidationError(
          `Client is not permitted to use provider '${provider}'`,
        );
      }
    }
    if (client.allowedTasks && client.allowedTasks.length > 0) {
      if (
        !client.allowedTasks.includes(taskType) &&
        !client.allowedTasks.includes("*")
      ) {
        throw new AiValidationError(
          `Client is not permitted to execute task type '${taskType}'`,
        );
      }
    }
  }
}
