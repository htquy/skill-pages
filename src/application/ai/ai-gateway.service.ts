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
  private clientRequestCounts = new Map<string, { count: number; resetAt: number }>();

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

    deps.textProviders?.forEach((p) => this.textProviders.set(p.providerName, p));
    deps.imageProviders?.forEach((p) => this.imageProviders.set(p.providerName, p));
    deps.videoProviders?.forEach((p) => this.videoProviders.set(p.providerName, p));
    deps.audioProviders?.forEach((p) => this.audioProviders.set(p.providerName, p));
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
  async authenticateClient(apiKeyHeader?: string | null, ipAddress?: string): Promise<GatewayAuthContext> {
    if (!apiKeyHeader) {
      throw new AiUnauthorizedClientError("Missing X-API-KEY or Authorization header");
    }

    const token = apiKeyHeader.startsWith("Bearer ") ? apiKeyHeader.slice(7).trim() : apiKeyHeader.trim();
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
      throw new AiRateLimitExceededError(`Client exceeded limit of ${client.rateLimitPerMin} requests per minute`);
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

    const provider = this.textProviders.get(providerName);
    if (!provider) {
      throw new AiValidationError(`Unsupported text provider '${providerName}'`);
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

    const provider = this.textProviders.get(providerName);
    if (!provider) {
      throw new AiValidationError(`Unsupported text provider '${providerName}'`);
    }

    const key = await this.keyManager.getAvailableKey(providerName, auth.client.id);
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
      throw new AiValidationError(`Unsupported image provider '${providerName}'`);
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
      throw new AiValidationError(`Unsupported video provider '${providerName}'`);
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
      throw new AiValidationError(`Unsupported audio provider '${providerName}'`);
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

  private validatePermissions(client: AiClientDto, provider: string, taskType: string) {
    if (client.allowedProviders && client.allowedProviders.length > 0) {
      if (!client.allowedProviders.includes(provider) && !client.allowedProviders.includes("*")) {
        throw new AiValidationError(`Client is not permitted to use provider '${provider}'`);
      }
    }
    if (client.allowedTasks && client.allowedTasks.length > 0) {
      if (!client.allowedTasks.includes(taskType) && !client.allowedTasks.includes("*")) {
        throw new AiValidationError(`Client is not permitted to execute task type '${taskType}'`);
      }
    }
  }
}
