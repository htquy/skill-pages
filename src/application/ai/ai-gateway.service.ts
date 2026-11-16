import {
  AiAppCreditPolicyDto,
  AiClientDto,
  AiProviderKeyDto,
  AiTaskDto,
  AiUserCreditStatusDto,
  AIProfile,
  CatalogResponse,
  TextStreamChunk,
  TokenUsage,
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
import { KeyManagerService, sanitizeApiKeySecret } from "./key-manager.service";
import {
  AiCreditsExhaustedError,
  AiRateLimitExceededError,
  AiTaskNotFoundError,
  AiUnauthorizedClientError,
  AiValidationError,
} from "@/src/domain/ai/errors";
import {
  calculateCostUsd,
  currentUtcPeriodKey,
  DEFAULT_FALLBACK_MODEL,
  DEFAULT_FALLBACK_PROVIDER,
  DEFAULT_OPENROUTER_MAX_TOKENS,
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_PRIMARY_PROVIDER,
  defaultPolicyFor,
  isRetryableFallbackError,
  usdToCredits,
} from "./credit-pricing";

export interface GatewayAuthContext {
  client: AiClientDto | null;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  appSlug?: string | null;
  authType?: "api_key" | "oauth" | "session";
  ipAddress?: string;
  byokKey?: string; // Client có thể tự gửi header X-Provider-Key
}

export interface AppAccessFacadeResult {
  hasActiveSubscription: boolean;
  subscription: {
    planId: string;
    planName: string;
  } | null;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

interface ResolvedPolicyContext {
  appSlug: string;
  periodKey: string;
  planKey: string;
  planName: string;
  isPaid: boolean;
  policy: AiAppCreditPolicyDto;
  status: AiUserCreditStatusDto;
}

interface TextExecutionAttempt {
  providerName: string;
  model: string;
}

export class AiGatewayService {
  private repository: IAiRepository;
  private keyManager: KeyManagerService;
  private queue: ITaskQueue;
  private resolveOAuthToken?: (
    token: string,
  ) => Promise<{ id: string; email: string | null; name: string | null } | null>;
  private checkAppAccess?: (
    appSlug: string,
    userId: string,
  ) => Promise<AppAccessFacadeResult>;
  private defaultAppSlug: string;

  private textProviders = new Map<string, ITextProvider>();
  private imageProviders = new Map<string, IImageProvider>();
  private videoProviders = new Map<string, IVideoProvider>();
  private audioProviders = new Map<string, ITtsProvider>();

  // In-memory sliding rate limiter per client/user
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
    resolveOAuthToken?: (
      token: string,
    ) => Promise<{ id: string; email: string | null; name: string | null } | null>;
    checkAppAccess?: (
      appSlug: string,
      userId: string,
    ) => Promise<AppAccessFacadeResult>;
    defaultAppSlug?: string;
  }) {
    this.repository = deps.repository;
    this.keyManager = deps.keyManager;
    this.queue = deps.queue;
    this.resolveOAuthToken = deps.resolveOAuthToken;
    this.checkAppAccess = deps.checkAppAccess;
    this.defaultAppSlug = deps.defaultAppSlug || "skill-studio";

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

  private enforceRateLimit(bucketKey: string, limitPerMin: number) {
    const now = Date.now();
    let rateRecord = this.clientRequestCounts.get(bucketKey);
    if (!rateRecord || now > rateRecord.resetAt) {
      rateRecord = { count: 0, resetAt: now + 60 * 1000 };
      this.clientRequestCounts.set(bucketKey, rateRecord);
    }

    rateRecord.count++;
    if (rateRecord.count > limitPerMin) {
      throw new AiRateLimitExceededError(
        `Client exceeded limit of ${limitPerMin} requests per minute`,
      );
    }
  }

  /**
   * Xác thực Client API key hoặc OAuth Bearer token / Session user và kiểm tra Rate Limiting
   */
  async authenticateClient(
    apiKeyHeader?: string | null,
    ipAddress?: string,
    options?: {
      appSlug?: string | null;
      sessionUser?: { id: string; email?: string | null; name?: string | null } | null;
    },
  ): Promise<GatewayAuthContext> {
    if (apiKeyHeader) {
      const token = apiKeyHeader.startsWith("Bearer ")
        ? apiKeyHeader.slice(7).trim()
        : apiKeyHeader.trim();

      if (token) {
        const client = await this.repository.getClientByApiKey(token);
        if (client) {
          if (client.status !== "ACTIVE") {
            throw new AiUnauthorizedClientError("Invalid or deactivated API key");
          }
          this.enforceRateLimit(`client:${client.id}`, client.rateLimitPerMin);
          return {
            client,
            authType: "api_key",
            appSlug: options?.appSlug ?? null,
            ipAddress,
          };
        }

        if (this.resolveOAuthToken) {
          const oauthUser = await this.resolveOAuthToken(token);
          if (oauthUser) {
            this.enforceRateLimit(`user:${oauthUser.id}`, 120);
            return {
              client: null,
              userId: oauthUser.id,
              userEmail: oauthUser.email,
              userName: oauthUser.name,
              appSlug: (options?.appSlug || this.defaultAppSlug).toLowerCase(),
              authType: "oauth",
              ipAddress,
            };
          }
        }
      }

      throw new AiUnauthorizedClientError("Invalid or deactivated API key / token");
    }

    if (options?.sessionUser?.id) {
      this.enforceRateLimit(`user:${options.sessionUser.id}`, 120);
      return {
        client: null,
        userId: options.sessionUser.id,
        userEmail: options.sessionUser.email ?? null,
        userName: options.sessionUser.name ?? null,
        appSlug: (options.appSlug || this.defaultAppSlug).toLowerCase(),
        authType: "session",
        ipAddress,
      };
    }

    throw new AiUnauthorizedClientError(
      "Missing X-API-KEY or Authorization header",
    );
  }

  /**
   * Lấy chính sách credit áp dụng cho (appSlug, userId) và trạng thái hạn mức tháng hiện tại.
   */
  async getUserCreditStatus(
    userId: string,
    requestedAppSlug?: string | null,
  ): Promise<AiUserCreditStatusDto> {
    const resolved = await this.resolveUserPolicyContext(userId, requestedAppSlug);
    return resolved.status;
  }

  private async resolvePolicyRecord(
    appSlug: string,
    isPaid: boolean,
    planId?: string | null,
  ): Promise<AiAppCreditPolicyDto> {
    const candidates: Array<[string, string]> = [];
    if (isPaid) {
      if (planId) candidates.push([appSlug, planId]);
      candidates.push([appSlug, "PRO"]);
      candidates.push(["*", "PRO"]);
    } else {
      candidates.push([appSlug, "FREE"]);
      candidates.push(["*", "FREE"]);
    }

    for (const [slug, key] of candidates) {
      const found = await this.repository.findCreditPolicy(slug, key);
      if (found && found.isActive) return found;
    }

    return defaultPolicyFor(appSlug, isPaid ? planId || "PRO" : "FREE");
  }

  private async resolveUserPolicyContext(
    userId: string,
    requestedAppSlug?: string | null,
  ): Promise<ResolvedPolicyContext> {
    const appSlug = (requestedAppSlug || this.defaultAppSlug || "skill-studio")
      .trim()
      .toLowerCase();
    const periodKey = currentUtcPeriodKey();

    let isPaid = false;
    let planId: string | null = null;
    let planName = "Free Trial";

    if (this.checkAppAccess) {
      try {
        const access = await this.checkAppAccess(appSlug, userId);
        if (access.hasActiveSubscription && access.subscription) {
          isPaid = true;
          planId = access.subscription.planId;
          planName = access.subscription.planName || "Pro";
        }
      } catch (err) {
        // If custom tool slug isn't an `apps.apps` record (404), keep FREE tier policy smoothly.
        const status = (err as { status?: number })?.status;
        if (status !== 404) throw err;
      }
    }

    const policy = await this.resolvePolicyRecord(appSlug, isPaid, planId);
    const planKey = isPaid ? planId || "PRO" : "FREE";
    const currentPeriod = await this.repository.getUserCreditPeriod(
      userId,
      appSlug,
      periodKey,
    );

    let effectiveUsedForQuota = currentPeriod?.usedCredits ?? 0;
    let effectiveBonusForQuota = currentPeriod?.bonusCredits ?? 0;
    let effectiveAllowance = policy.monthlyCredits;

    if (!isPaid && policy.resetMode === "TRIAL") {
      // FREE trial cap spans across months so free trial doesn't auto-reset to 50 every month unless admin configured MONTHLY.
      const trialAgg = await this.repository.getTrialAggregateForUserApp(
        userId,
        appSlug,
      );
      effectiveUsedForQuota = trialAgg.usedCredits;
      effectiveBonusForQuota = trialAgg.bonusCredits;
    } else if (isPaid && currentPeriod && currentPeriod.planKey === "FREE") {
      // Upgraded from FREE -> PRO mid-month: count prior FREE usage separately so user receives full Pro allowance.
      const freePolicy = await this.resolvePolicyRecord(appSlug, false, null);
      const coveredFree = Math.min(currentPeriod.usedCredits, freePolicy.monthlyCredits);
      effectiveAllowance = policy.monthlyCredits + coveredFree;
    } else if (currentPeriod && currentPeriod.allowanceCredits > effectiveAllowance) {
      effectiveAllowance = currentPeriod.allowanceCredits;
    }

    const totalBudget = effectiveAllowance + effectiveBonusForQuota;
    const remainingCredits = Math.max(
      0,
      Number((totalBudget - effectiveUsedForQuota).toFixed(4)),
    );

    return {
      appSlug,
      periodKey,
      planKey,
      planName,
      isPaid,
      policy,
      status: {
        userId,
        appSlug,
        periodKey,
        planKey,
        planName,
        isPaid,
        resetMode: policy.resetMode,
        usdPerCredit: policy.usdPerCredit,
        allowanceCredits: policy.monthlyCredits,
        bonusCredits: effectiveBonusForQuota,
        usedCredits: effectiveUsedForQuota,
        remainingCredits,
        usedCostUsd: currentPeriod?.usedCostUsd ?? 0,
        requestCount: currentPeriod?.requestCount ?? 0,
        promptTokens: currentPeriod?.promptTokens ?? 0,
        cachedTokens: currentPeriod?.cachedTokens ?? 0,
        completionTokens: currentPeriod?.completionTokens ?? 0,
        primaryProvider: policy.primaryProvider,
        primaryModel: policy.primaryModel,
        fallbackProvider: policy.fallbackProvider ?? null,
        fallbackModel: policy.fallbackModel ?? null,
        allowedModels: policy.allowedModels,
      },
    };
  }

  private async prepareTextExecution(
    request: UnifiedTextRequest,
    auth: GatewayAuthContext,
  ): Promise<{
    attempts: TextExecutionAttempt[];
    resolvedContext: ResolvedPolicyContext | null;
    effectiveRequest: UnifiedTextRequest;
  }> {
    let resolvedContext: ResolvedPolicyContext | null = null;

    if (auth.userId) {
      resolvedContext = await this.resolveUserPolicyContext(
        auth.userId,
        request.appSlug || auth.appSlug,
      );
      if (!auth.byokKey && resolvedContext.status.remainingCredits <= 0) {
        throw new AiCreditsExhaustedError(
          `Tài khoản đã dùng hết ${resolvedContext.status.usedCredits}/${resolvedContext.status.allowanceCredits + resolvedContext.status.bonusCredits} credit cho '${resolvedContext.appSlug}' (${resolvedContext.planName}). Vui lòng nâng cấp hoặc liên hệ admin nạp thêm.`,
          {
            appSlug: resolvedContext.appSlug,
            planKey: resolvedContext.planKey,
            planName: resolvedContext.planName,
            usedCredits: resolvedContext.status.usedCredits,
            allowanceCredits: resolvedContext.status.allowanceCredits,
            bonusCredits: resolvedContext.status.bonusCredits,
            remainingCredits: 0,
          },
        );
      }
    }

    const defaultProvider = resolvedContext
      ? resolvedContext.policy.primaryProvider
      : auth.authType === "oauth" || auth.authType === "session"
        ? DEFAULT_PRIMARY_PROVIDER
        : "openai";

    const requestedProvider = (request.provider || defaultProvider).toLowerCase();
    const requestedModel =
      !request.model || request.model === "auto"
        ? resolvedContext?.policy.primaryModel ||
          (requestedProvider === "openrouter"
            ? DEFAULT_PRIMARY_MODEL
            : "gpt-4o-mini")
        : request.model;

    if (
      resolvedContext &&
      !auth.byokKey &&
      resolvedContext.policy.allowedModels.length > 0 &&
      !resolvedContext.policy.allowedModels.includes("*")
    ) {
      const permitted = new Set([
        ...resolvedContext.policy.allowedModels,
        resolvedContext.policy.primaryModel,
        ...(resolvedContext.policy.fallbackModel
          ? [resolvedContext.policy.fallbackModel]
          : []),
      ]);
      if (!permitted.has(requestedModel)) {
        throw new AiValidationError(
          `Model '${requestedModel}' is not enabled in policy for '${resolvedContext.appSlug}'`,
        );
      }
    }

    this.validatePermissions(auth.client, requestedProvider, "TEXT");
    const hasTools = Boolean(
      request.tools?.length ||
        request.messages.some((m) => m.role === "tool" || m.tool_calls?.length),
    );
    if (hasTools && !["openai", "openrouter"].includes(requestedProvider)) {
      throw new AiValidationError(
        "Selected provider does not support gateway tool calling; use openai or openrouter.",
      );
    }

    if (!this.textProviders.get(requestedProvider)) {
      throw new AiValidationError(
        `Unsupported text provider '${requestedProvider}'`,
      );
    }

    const attempts: TextExecutionAttempt[] = [
      { providerName: requestedProvider, model: requestedModel },
    ];

    if (request.allowFallback !== false) {
      const fallbackProvider = (
        request.fallbackProvider ||
        resolvedContext?.policy.fallbackProvider ||
        (requestedProvider === "openrouter" ? DEFAULT_FALLBACK_PROVIDER : "")
      ).toLowerCase();
      const fallbackModel =
        request.fallbackModel ||
        resolvedContext?.policy.fallbackModel ||
        (fallbackProvider === "openrouter" ? DEFAULT_FALLBACK_MODEL : "");

      if (
        fallbackProvider &&
        fallbackModel &&
        (fallbackProvider !== requestedProvider || fallbackModel !== requestedModel) &&
        this.textProviders.has(fallbackProvider)
      ) {
        try {
          this.validatePermissions(auth.client, fallbackProvider, "TEXT");
          if (!hasTools || ["openai", "openrouter"].includes(fallbackProvider)) {
            attempts.push({ providerName: fallbackProvider, model: fallbackModel });
          }
        } catch {
          // Fallback provider not allowed for this client; skip silently.
        }
      }
    }

    return {
      attempts,
      resolvedContext,
      effectiveRequest: {
        ...request,
        provider: requestedProvider,
        model: requestedModel,
        ...(requestedProvider === "openrouter" && request.maxTokens === undefined
          ? { maxTokens: DEFAULT_OPENROUTER_MAX_TOKENS }
          : {}),
      },
    };
  }

  private async recordTextUsage(params: {
    auth: GatewayAuthContext;
    resolvedContext: ResolvedPolicyContext | null;
    providerName: string;
    model: string;
    usage: TokenUsage;
    fallbackUsed: boolean;
    fallbackFrom?: string;
    latencyMs: number;
  }): Promise<{ costUsd: number; creditsCharged: number; remainingCredits?: number }> {
    const { auth, resolvedContext, providerName, model, usage, fallbackUsed, fallbackFrom, latencyMs } = params;
    const costUsd = calculateCostUsd(model, usage);
    const usdPerCredit = resolvedContext?.policy.usdPerCredit;
    const creditsCharged = auth.byokKey ? 0 : usdToCredits(costUsd, usdPerCredit);

    if (auth.userId && resolvedContext) {
      let freeAllowanceOnUpgrade: number | undefined;
      if (resolvedContext.isPaid) {
        const freePolicy = await this.resolvePolicyRecord(
          resolvedContext.appSlug,
          false,
          null,
        );
        freeAllowanceOnUpgrade = freePolicy.monthlyCredits;
      }

      await this.repository.recordUserPeriodUsageAndLog({
        clientId: auth.client?.id ?? null,
        userId: auth.userId,
        appSlug: resolvedContext.appSlug,
        periodKey: resolvedContext.periodKey,
        planKey: resolvedContext.planKey,
        allowanceCredits: resolvedContext.policy.monthlyCredits,
        freeAllowanceOnUpgrade,
        taskType: "TEXT",
        provider: providerName,
        model,
        promptTokens: usage.promptTokens,
        cachedTokens: usage.cachedTokens ?? 0,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        costUsd,
        creditsCharged,
        fallbackUsed,
        fallbackFrom: fallbackFrom ?? null,
        latencyMs,
        statusCode: 200,
        ipAddress: auth.ipAddress,
      });

      const remainingCredits = Math.max(
        0,
        Number((resolvedContext.status.remainingCredits - creditsCharged).toFixed(4)),
      );
      return { costUsd, creditsCharged, remainingCredits };
    }

    await this.repository.createUsageLog({
      clientId: auth.client?.id ?? null,
      userId: auth.userId ?? null,
      appSlug: resolvedContext?.appSlug ?? auth.appSlug ?? null,
      taskType: "TEXT",
      provider: providerName,
      model,
      promptTokens: usage.promptTokens,
      cachedTokens: usage.cachedTokens ?? 0,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd,
      creditsCharged,
      fallbackUsed,
      fallbackFrom: fallbackFrom ?? null,
      latencyMs,
      statusCode: 200,
      ipAddress: auth.ipAddress,
    });
    return { costUsd, creditsCharged };
  }

  /**
   * TEXT LLM ENGINE: Đồng bộ (tự động fallback sang OpenAI GPT-6 Luna nếu Haiku lỗi)
   */
  async generateText(
    request: UnifiedTextRequest,
    auth: GatewayAuthContext,
  ): Promise<UnifiedTextResponse> {
    const { attempts, resolvedContext, effectiveRequest } =
      await this.prepareTextExecution(request, auth);

    let lastError: unknown;
    const primaryAttempt = attempts[0];

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const provider = this.textProviders.get(attempt.providerName)!;
      const startTime = Date.now();

      try {
        const response = await this.keyManager.executeWithRetry(
          attempt.providerName,
          auth.byokKey ? null : auth.client?.id ?? null,
          async (apiKey) => {
            const keyToUse = auth.byokKey || apiKey;
            return await provider.generateText(
              {
                ...effectiveRequest,
                provider: attempt.providerName,
                model: attempt.model,
              },
              keyToUse,
            );
          },
        );

        const fallbackUsed = i > 0;
        const fallbackFrom = fallbackUsed ? primaryAttempt.model : undefined;
        const billing = await this.recordTextUsage({
          auth,
          resolvedContext,
          providerName: attempt.providerName,
          model: response.model || attempt.model,
          usage: response.usage,
          fallbackUsed,
          fallbackFrom,
          latencyMs: Date.now() - startTime,
        });

        return {
          ...response,
          usage: {
            ...response.usage,
            costUsd: billing.costUsd,
            creditsCharged: billing.creditsCharged,
          },
          fallbackUsed,
          ...(fallbackFrom ? { fallbackFrom } : {}),
          creditsCharged: billing.creditsCharged,
          ...(billing.remainingCredits !== undefined
            ? { remainingCredits: billing.remainingCredits }
            : {}),
        };
      } catch (err) {
        lastError = err;
        await this.repository.createUsageLog({
          clientId: auth.client?.id ?? null,
          userId: auth.userId ?? null,
          appSlug: resolvedContext?.appSlug ?? auth.appSlug ?? null,
          taskType: "TEXT",
          provider: attempt.providerName,
          model: attempt.model,
          promptTokens: 0,
          cachedTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          creditsCharged: 0,
          fallbackUsed: i > 0,
          fallbackFrom: i > 0 ? primaryAttempt.model : null,
          latencyMs: Date.now() - startTime,
          statusCode:
            (err as { statusCode?: number; status?: number })?.statusCode ||
            (err as { status?: number })?.status ||
            500,
          errorMessage: err instanceof Error ? err.message : String(err),
          ipAddress: auth.ipAddress,
        });

        const nextAttempt = attempts[i + 1];
        const sameProvider = nextAttempt?.providerName === attempt.providerName;
        if (nextAttempt && isRetryableFallbackError(err, sameProvider)) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private async *streamAttemptWithKeyRotation(
    provider: ITextProvider,
    request: UnifiedTextRequest,
    auth: GatewayAuthContext,
  ): AsyncIterable<{ chunk: TextStreamChunk; keyUsed: AiProviderKeyDto | null }> {
    if (auth.byokKey) {
      for await (const chunk of provider.streamText(request, auth.byokKey)) {
        yield { chunk, keyUsed: null };
      }
      return;
    }

    const triedKeyIds = new Set<string>();
    let lastError: unknown;

    for (let keyTry = 0; keyTry < 3; keyTry++) {
      let key: AiProviderKeyDto;
      try {
        key = await this.keyManager.getAvailableKey(
          provider.providerName,
          auth.client?.id ?? null,
        );
      } catch (err) {
        throw lastError || err;
      }
      if (triedKeyIds.has(key.id)) break;
      triedKeyIds.add(key.id);

      let emittedToCaller = false;
      try {
        for await (const chunk of provider.streamText(request, key.keySecret)) {
          if (chunk.deltaText || chunk.toolCallDeltas?.length) {
            emittedToCaller = true;
          }
          yield { chunk, keyUsed: key };
        }
        await this.keyManager.markKeySuccess(key.id);
        return;
      } catch (err) {
        lastError = err;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 429) {
          await this.keyManager.markKeyRateLimited(key.id);
        } else if (statusCode === 401) {
          await this.keyManager.markKeyExpired(key.id);
        } else {
          await this.keyManager.recordKeyFailure(key.id);
        }

        // Only rotate to another key on 429/401 before any output has flushed to client
        if (!emittedToCaller && (statusCode === 429 || statusCode === 401)) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  /**
   * TEXT LLM ENGINE: Server-Sent Events (SSE) Streaming + tự động fallback nếu primary lỗi trước khi phát token
   */
  async *streamText(
    request: UnifiedTextRequest,
    auth: GatewayAuthContext,
  ): AsyncIterable<TextStreamChunk> {
    const { attempts, resolvedContext, effectiveRequest } =
      await this.prepareTextExecution(request, auth);

    const primaryAttempt = attempts[0];
    let lastError: unknown;

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const provider = this.textProviders.get(attempt.providerName)!;
      const startTime = Date.now();
      let emittedContent = false;
      let totalChars = 0;
      let latestUsage: TokenUsage | undefined;
      let resolvedModel = attempt.model;

      try {
        for await (const { chunk } of this.streamAttemptWithKeyRotation(
          provider,
          {
            ...effectiveRequest,
            provider: attempt.providerName,
            model: attempt.model,
          },
          auth,
        )) {
          if (chunk.deltaText) {
            emittedContent = true;
            totalChars += chunk.deltaText.length;
          }
          if (chunk.toolCallDeltas?.length) {
            emittedContent = true;
          }
          if (chunk.model) resolvedModel = chunk.model;
          if (chunk.usage) latestUsage = chunk.usage;

          if (chunk.isFinished) {
            const finalUsage: TokenUsage = latestUsage ?? {
              promptTokens: 0,
              cachedTokens: 0,
              completionTokens: Math.ceil(totalChars / 4),
              totalTokens: Math.ceil(totalChars / 4),
            };
            const fallbackUsed = i > 0;
            const fallbackFrom = fallbackUsed ? primaryAttempt.model : undefined;
            const billing = await this.recordTextUsage({
              auth,
              resolvedContext,
              providerName: attempt.providerName,
              model: resolvedModel,
              usage: finalUsage,
              fallbackUsed,
              fallbackFrom,
              latencyMs: Date.now() - startTime,
            });

            yield {
              ...chunk,
              provider: attempt.providerName,
              model: resolvedModel,
              fallbackUsed,
              ...(fallbackFrom ? { fallbackFrom } : {}),
              creditsCharged: billing.creditsCharged,
              ...(billing.remainingCredits !== undefined
                ? { remainingCredits: billing.remainingCredits }
                : {}),
              usage: {
                ...finalUsage,
                costUsd: billing.costUsd,
                creditsCharged: billing.creditsCharged,
              },
            };
            return;
          }

          yield {
            ...chunk,
            provider: attempt.providerName,
            model: resolvedModel,
            ...(i > 0
              ? { fallbackUsed: true, fallbackFrom: primaryAttempt.model }
              : {}),
          };
        }
        return;
      } catch (err) {
        lastError = err;
        await this.repository.createUsageLog({
          clientId: auth.client?.id ?? null,
          userId: auth.userId ?? null,
          appSlug: resolvedContext?.appSlug ?? auth.appSlug ?? null,
          taskType: "TEXT",
          provider: attempt.providerName,
          model: resolvedModel,
          promptTokens: 0,
          cachedTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          creditsCharged: 0,
          fallbackUsed: i > 0,
          fallbackFrom: i > 0 ? primaryAttempt.model : null,
          latencyMs: Date.now() - startTime,
          statusCode:
            (err as { statusCode?: number; status?: number })?.statusCode ||
            (err as { status?: number })?.status ||
            500,
          errorMessage: err instanceof Error ? err.message : String(err),
          ipAddress: auth.ipAddress,
        });

        // Seamless fallback to secondary model only if no output delta was sent to client yet
        const nextAttempt = attempts[i + 1];
        const sameProvider = nextAttempt?.providerName === attempt.providerName;
        if (!emittedContent && nextAttempt && isRetryableFallbackError(err, sameProvider)) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
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

    const clientId = auth.client?.id ?? null;
    const task = await this.repository.createTask({
      clientId,
      taskType: "IMAGE",
      provider: providerName,
      model: request.model || "flux/schnell",
      prompt: request.prompt,
      inputParams: request as unknown as Record<string, unknown>,
      callbackUrl: request.callbackUrl,
    });

    const taskResponse = await this.keyManager.executeWithRetry(
      providerName,
      clientId,
      async (apiKey) => {
        return await provider.createImageTask(request, apiKey);
      },
    );

    await this.queue.enqueue({
      taskId: task.id,
      taskType: "IMAGE",
      provider: providerName,
      model: task.model,
      payload: request as unknown as Record<string, unknown>,
      callbackUrl: request.callbackUrl,
      clientId,
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

    const clientId = auth.client?.id ?? null;
    const task = await this.repository.createTask({
      clientId,
      taskType: "VIDEO",
      provider: providerName,
      model: request.model || "ray-2",
      prompt: request.prompt,
      inputParams: request as unknown as Record<string, unknown>,
      callbackUrl: request.callbackUrl,
    });

    const taskResponse = await this.keyManager.executeWithRetry(
      providerName,
      clientId,
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
      clientId,
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

    const clientId = auth.client?.id ?? null;
    const startTime = Date.now();
    const result = await this.keyManager.executeWithRetry(
      providerName,
      clientId,
      async (apiKey) => {
        return await provider.synthesizeAudio(request, apiKey);
      },
    );

    await this.repository.createUsageLog({
      clientId,
      userId: auth.userId ?? null,
      appSlug: auth.appSlug ?? null,
      taskType: "AUDIO",
      provider: providerName,
      model: request.model || "default",
      promptTokens: 0,
      cachedTokens: 0,
      completionTokens: 0,
      totalTokens: request.text.length,
      costUsd: 0,
      creditsCharged: 0,
      fallbackUsed: false,
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
    if (task.clientId && auth.client?.id && task.clientId !== auth.client.id) {
      throw new AiTaskNotFoundError(taskId);
    }
    return task;
  }

  /**
   * Lấy danh mục Model/Provider (Catalog) theo quyền của caller (không lộ API secrets)
   */
  async getCatalog(
    auth: GatewayAuthContext,
    requestedCapability?: string,
  ): Promise<CatalogResponse> {
    const allowedProviders = auth.client?.allowedProviders || ["*"];
    const isAllowedProvider = (p: string) =>
      allowedProviders.includes("*") || allowedProviders.includes(p);
    const allowedTasks = auth.client?.allowedTasks || ["*"];
    const isAllowedTask = (t: string) =>
      allowedTasks.includes("*") || allowedTasks.includes(t);

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
    if (process.env.OPENROUTER_API_KEY?.trim()) activeProviders.add("openrouter");
    if (process.env.OPENAI_API_KEY?.trim()) activeProviders.add("openai");
    if (process.env.GEMINI_API_KEY?.trim()) activeProviders.add("gemini");
    activeProviders.add("edgetts");

    const allProfiles: AIProfile[] = [
      {
        profileId: "text.openrouter.haiku",
        version: 1,
        displayName: "Claude Haiku 5.5 (OpenRouter)",
        description:
          "Model ưu tiên mặc định: tốc độ nhanh, tool calling chuẩn, $0.10/$0.50 per 1M",
        capability: "text.generate",
        providerId: "openrouter",
        upstreamModelId: "anthropic/claude-haiku-5.5",
        executionMode: "gateway_proxy",
        status: activeProviders.has("openrouter") ? "enabled" : "degraded",
        limits: { maxContextTokens: 1000000, maxOutputTokens: 16384 },
        supportedParameters: [
          "temperature",
          "maxTokens",
          "stream",
          "tools",
          "reasoningEffort",
          "systemPrompt",
        ],
        pricing: { estimatedCostUsd: 0.0001, currency: "USD" },
      },
      {
        profileId: "text.openrouter.gpt6luna",
        version: 1,
        displayName: "GPT-6 Luna (OpenRouter Fallback)",
        description:
          "Model dự phòng tự động khi Claude Haiku lỗi hoặc giới hạn (1.05M ctx, $0.10/$0.50 per 1M)",
        capability: "text.generate",
        providerId: "openrouter",
        upstreamModelId: "openai/gpt-6-luna",
        executionMode: "gateway_proxy",
        status: activeProviders.has("openrouter") ? "enabled" : "degraded",
        limits: { maxContextTokens: 1050000, maxOutputTokens: 16384 },
        supportedParameters: [
          "temperature",
          "maxTokens",
          "stream",
          "tools",
          "reasoningEffort",
          "systemPrompt",
        ],
        pricing: { estimatedCostUsd: 0.0001, currency: "USD" },
      },
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

    const displayNames: Record<string, string> = {
      openrouter: "OpenRouter",
      openai: "OpenAI",
      gemini: "Google Gemini",
      anthropic: "Anthropic",
      "fal-ai": "Fal AI",
      luma: "Luma Dream Machine",
      edgetts: "Edge TTS",
    };

    for (const prof of filteredProfiles) {
      let prov = providersMap.get(prof.providerId);
      if (!prov) {
        prov = {
          id: prof.providerId,
          displayName: displayNames[prof.providerId] || prof.providerId,
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
      catalogVersion: 2,
      version: 2,
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

  async verifyProviderKey(
    providerName: string,
    customKey?: string,
  ): Promise<{
    valid: boolean;
    provider: string;
    keySource: "custom" | "db_or_env";
    statusCode: number;
    label?: string | null;
    limit?: number | null;
    limitRemaining?: number | null;
    usage?: number | null;
    isFreeTier?: boolean | null;
    isManagementKey?: boolean;
    isProvisioningKey?: boolean;
    expiresAt?: string | null;
    error?: string;
  }> {
    const cleanProvider = providerName.trim().toLowerCase();
    const cleanedCustom = customKey ? sanitizeApiKeySecret(customKey) : "";
    const keySource = cleanedCustom ? "custom" : "db_or_env";
    const apiKey = cleanedCustom
      ? cleanedCustom
      : (await this.keyManager.getAvailableKey(cleanProvider, null)).keySecret;

    const provider = this.textProviders.get(cleanProvider) as
      | (ITextProvider & {
          verifyKey?: (key: string) => Promise<{
            valid: boolean;
            provider: string;
            statusCode: number;
            label?: string | null;
            limit?: number | null;
            limitRemaining?: number | null;
            usage?: number | null;
            isFreeTier?: boolean | null;
            isManagementKey?: boolean;
            isProvisioningKey?: boolean;
            expiresAt?: string | null;
            error?: string;
          }>;
        })
      | undefined;

    if (provider?.verifyKey) {
      const result = await provider.verifyKey(apiKey);
      return { ...result, keySource };
    }

    return {
      valid: Boolean(apiKey),
      provider: cleanProvider,
      keySource,
      statusCode: apiKey ? 200 : 400,
    };
  }

  private validatePermissions(
    client: AiClientDto | null,
    provider: string,
    taskType: string,
  ) {
    if (!client) return;
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
