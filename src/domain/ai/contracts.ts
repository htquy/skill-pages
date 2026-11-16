import {
  AiAppCreditPolicyDto,
  AiClientDto,
  AiKeyStatus,
  AiProviderKeyDto,
  AiTaskDto,
  AiTaskStatus,
  AiTaskType,
  AiUsageLogDto,
  AiUserCreditPeriodDto,
  CreditResetMode,
  ImageTaskResult,
  TextStreamChunk,
  UnifiedAudioRequest,
  UnifiedAudioResponse,
  UnifiedImageRequest,
  UnifiedImageTaskResponse,
  UnifiedTextRequest,
  UnifiedTextResponse,
  UnifiedVideoRequest,
  UnifiedVideoTaskResponse,
  VideoTaskResult,
} from "./models";

// ---------------------------------------------------------------------------
// A. DOMAIN INTERFACES (Provider Contracts)
// ---------------------------------------------------------------------------

export interface ITextProvider {
  readonly providerName: string;
  generateText(request: UnifiedTextRequest, apiKey: string): Promise<UnifiedTextResponse>;
  streamText(request: UnifiedTextRequest, apiKey: string): AsyncIterable<TextStreamChunk>;
}

export interface IImageProvider {
  readonly providerName: string;
  createImageTask(request: UnifiedImageRequest, apiKey: string): Promise<UnifiedImageTaskResponse>;
  checkTaskStatus(taskId: string, apiKey: string): Promise<ImageTaskResult>;
}

export interface IVideoProvider {
  readonly providerName: string;
  createVideoTask(request: UnifiedVideoRequest, apiKey: string): Promise<UnifiedVideoTaskResponse>;
  checkTaskStatus(taskId: string, apiKey: string): Promise<VideoTaskResult>;
}

export interface ITtsProvider {
  readonly providerName: string;
  synthesizeAudio(request: UnifiedAudioRequest, apiKey: string): Promise<UnifiedAudioResponse>;
}

// ---------------------------------------------------------------------------
// C. KEY MANAGER INTERFACES
// ---------------------------------------------------------------------------

export interface IKeyManager {
  getAvailableKey(provider: string, clientId?: string | null): Promise<AiProviderKeyDto>;
  markKeyRateLimited(keyId: string, cooldownMinutes?: number): Promise<void>;
  markKeySuccess(keyId: string): Promise<void>;
  markKeyExpired(keyId: string, reason?: string): Promise<void>;
  upsertKey(data: {
    provider: string;
    keySecret: string;
    alias?: string | null;
    clientId?: string | null;
    weight?: number;
  }): Promise<AiProviderKeyDto>;
  updateKey(
    id: string,
    data: Partial<{
      alias: string | null;
      keySecret: string;
      weight: number;
      status: AiKeyStatus;
      cooldownUntil: Date | null;
    }>,
  ): Promise<AiProviderKeyDto>;
  deleteKey(id: string): Promise<void>;
  listKeys(provider?: string): Promise<AiProviderKeyDto[]>;
}

// ---------------------------------------------------------------------------
// D. ASYNC TASK QUEUE & STORAGE INTERFACES
// ---------------------------------------------------------------------------

export interface TaskJobPayload {
  taskId: string;
  taskType: AiTaskType;
  provider: string;
  model: string;
  payload: Record<string, unknown>;
  callbackUrl?: string | null;
  clientId?: string | null;
}

export interface ITaskQueue {
  enqueue(job: TaskJobPayload): Promise<void>;
  registerProcessor(handler: (job: TaskJobPayload) => Promise<void>): void;
}

export interface IMediaStorage {
  uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string>;
  uploadFromUrl(sourceUrl: string, destinationKey: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// REPOSITORY INTERFACES
// ---------------------------------------------------------------------------

export interface IAiRepository {
  // Clients
  getClientByApiKey(apiKey: string): Promise<AiClientDto | null>;
  createClient(data: {
    name: string;
    apiKey: string;
    rateLimitPerMin?: number;
    allowedProviders?: string[];
    allowedTasks?: string[];
  }): Promise<AiClientDto>;

  // Provider Keys
  findKeysByProvider(provider: string, clientId?: string | null): Promise<AiProviderKeyDto[]>;
  getKeyById(id: string): Promise<AiProviderKeyDto | null>;
  updateKeyStatus(id: string, status: AiKeyStatus, cooldownUntil?: Date | null): Promise<void>;
  incrementKeySuccess(id: string): Promise<void>;
  incrementKeyFailure(id: string): Promise<void>;
  saveKey(data: {
    provider: string;
    keySecret: string;
    alias?: string | null;
    clientId?: string | null;
    weight?: number;
  }): Promise<AiProviderKeyDto>;
  updateKey(
    id: string,
    data: Partial<{
      alias: string | null;
      keySecret: string;
      weight: number;
      status: AiKeyStatus;
      cooldownUntil: Date | null;
    }>,
  ): Promise<AiProviderKeyDto>;
  deleteKey(id: string): Promise<void>;
  getAllKeys(provider?: string): Promise<AiProviderKeyDto[]>;

  // Tasks
  createTask(data: {
    id?: string;
    clientId?: string | null;
    taskType: AiTaskType;
    provider: string;
    model: string;
    prompt?: string | null;
    inputParams?: Record<string, unknown> | null;
    callbackUrl?: string | null;
  }): Promise<AiTaskDto>;
  getTaskById(taskId: string): Promise<AiTaskDto | null>;
  updateTaskStatus(
    taskId: string,
    data: {
      status: AiTaskStatus;
      outputResult?: Record<string, unknown> | null;
      errorMessage?: string | null;
      callbackStatus?: "NONE" | "PENDING" | "DELIVERED" | "FAILED";
      executionTimeMs?: number | null;
      tokensConsumed?: number | null;
    },
  ): Promise<AiTaskDto>;

  // Usage / Audit Logs
  createUsageLog(data: {
    clientId?: string | null;
    userId?: string | null;
    appSlug?: string | null;
    taskId?: string | null;
    taskType: AiTaskType;
    provider: string;
    model: string;
    promptTokens: number;
    cachedTokens?: number;
    completionTokens: number;
    totalTokens: number;
    costUsd?: number;
    creditsCharged?: number;
    fallbackUsed?: boolean;
    fallbackFrom?: string | null;
    latencyMs: number;
    statusCode: number;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<void>;
  getUsageLogs(limit?: number, offset?: number): Promise<AiUsageLogDto[]>;
  countUsageLogs(): Promise<number>;
  listUsageLogsFiltered(filter?: {
    userId?: string;
    appSlug?: string;
    periodStart?: Date;
    periodEnd?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AiUsageLogDto[]>;
  countUsageLogsFiltered(filter?: {
    userId?: string;
    appSlug?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<number>;

  // Credit Policies & Monthly User Periods
  listCreditPolicies(appSlug?: string): Promise<AiAppCreditPolicyDto[]>;
  findCreditPolicy(appSlug: string, planKey: string): Promise<AiAppCreditPolicyDto | null>;
  upsertCreditPolicy(data: {
    appSlug: string;
    planKey: string;
    monthlyCredits: number;
    usdPerCredit?: number;
    resetMode?: CreditResetMode;
    primaryProvider?: string;
    primaryModel?: string;
    fallbackProvider?: string | null;
    fallbackModel?: string | null;
    allowedModels?: string[];
    isActive?: boolean;
    description?: string | null;
  }): Promise<AiAppCreditPolicyDto>;
  deleteCreditPolicy(id: string): Promise<void>;

  getUserCreditPeriod(userId: string, appSlug: string, periodKey: string): Promise<AiUserCreditPeriodDto | null>;
  getTrialAggregateForUserApp(userId: string, appSlug: string): Promise<{
    usedCredits: number;
    bonusCredits: number;
    usedCostUsd: number;
    requestCount: number;
  }>;
  addBonusCredits(data: {
    userId: string;
    appSlug: string;
    periodKey: string;
    planKey?: string;
    allowanceCredits?: number;
    bonusDelta: number;
  }): Promise<AiUserCreditPeriodDto>;
  recordUserPeriodUsageAndLog(data: {
    clientId?: string | null;
    userId: string;
    appSlug: string;
    periodKey: string;
    planKey: string;
    allowanceCredits: number;
    freeAllowanceOnUpgrade?: number;
    taskId?: string | null;
    taskType: AiTaskType;
    provider: string;
    model: string;
    promptTokens: number;
    cachedTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    creditsCharged: number;
    fallbackUsed: boolean;
    fallbackFrom?: string | null;
    latencyMs: number;
    statusCode: number;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<AiUserCreditPeriodDto>;
  listUserCreditPeriods(filter?: {
    periodKey?: string;
    appSlug?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AiUserCreditPeriodDto[]>;
  countUserCreditPeriods(filter?: {
    periodKey?: string;
    appSlug?: string;
    userId?: string;
  }): Promise<number>;
}
