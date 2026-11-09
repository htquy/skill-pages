/**
 * Domain Models & DTOs for AI Gateway Service
 * Multi-provider Unified Schema & RFC 7807 Problem Details
 */

export type AiProviderName =
  | "openai"
  | "gemini"
  | "anthropic"
  | "groq"
  | "deepseek"
  | "ollama"
  | "fal-ai"
  | "midjourney"
  | "stability"
  | "runway"
  | "luma"
  | "kling"
  | "pika"
  | "elevenlabs"
  | "edgetts"
  | string;

export type AiTaskType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "EMBEDDING";
export type AiTaskStatus =
  "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type AiKeyStatus = "ACTIVE" | "RATE_LIMITED" | "SUSPENDED" | "EXPIRED";
export type AiCallbackStatus = "NONE" | "PENDING" | "DELIVERED" | "FAILED";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Unified Text LLM Contracts
// ---------------------------------------------------------------------------

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export interface FunctionTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface UnifiedTextRequest {
  provider?: AiProviderName;
  model?: string;
  messages: ChatMessage[];
  tools?: FunctionTool[];
  toolChoice?: "auto" | "none" | "required";
  dataCollection?: "allow" | "deny";
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  topP?: number;
  systemPrompt?: string;
}

export interface UnifiedTextResponse {
  id: string;
  provider: string;
  model: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason?: string;
  executionTimeMs: number;
}

export interface TextStreamChunk {
  id: string;
  deltaText: string;
  toolCallDeltas?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: { name?: string; arguments?: string };
  }>;
  isFinished: boolean;
  finishReason?: string;
  usage?: TokenUsage;
}

// ---------------------------------------------------------------------------
// Unified Image Generation Contracts
// ---------------------------------------------------------------------------

export interface UnifiedImageRequest {
  provider?: AiProviderName;
  model?: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  numImages?: number;
  width?: number;
  height?: number;
  seed?: number;
  callbackUrl?: string;
}

export interface UnifiedImageTaskResponse {
  taskId: string;
  status: AiTaskStatus;
  provider: string;
  model: string;
  estimatedSeconds?: number;
  createdAt: string;
}

export interface ImageTaskResult {
  taskId: string;
  status: AiTaskStatus;
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    contentType?: string;
  }>;
  seed?: number;
  executionTimeMs?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Unified Video Generation Contracts
// ---------------------------------------------------------------------------

export interface UnifiedVideoRequest {
  provider?: AiProviderName;
  model?: string;
  prompt: string;
  imageUrl?: string; // Image-to-Video
  durationSeconds?: number; // e.g. 5, 10
  aspectRatio?: "16:9" | "9:16" | "1:1";
  callbackUrl?: string;
}

export interface UnifiedVideoTaskResponse {
  taskId: string;
  status: AiTaskStatus;
  provider: string;
  model: string;
  estimatedSeconds?: number;
  createdAt: string;
}

export interface VideoTaskResult {
  taskId: string;
  status: AiTaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  executionTimeMs?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Unified Audio / TTS Contracts
// ---------------------------------------------------------------------------

export interface UnifiedAudioRequest {
  provider?: AiProviderName;
  model?: string;
  text: string;
  voice: string;
  speed?: number; // 0.5 to 2.0
  format?: "mp3" | "wav" | "ogg" | "aac";
  stream?: boolean;
}

export interface UnifiedAudioResponse {
  audioUrl?: string;
  audioBuffer?: Buffer;
  contentType: string;
  durationSeconds?: number;
  executionTimeMs: number;
}

// ---------------------------------------------------------------------------
// Client, Key & Task DTOs
// ---------------------------------------------------------------------------

export interface AiClientDto {
  id: string;
  name: string;
  apiKey: string;
  status: "ACTIVE" | "SUSPENDED";
  rateLimitPerMin: number;
  allowedProviders: string[];
  allowedTasks: string[];
}

export interface AiProviderKeyDto {
  id: string;
  provider: string;
  keySecret: string;
  alias?: string | null;
  status: AiKeyStatus;
  cooldownUntil?: Date | null;
  failureCount: number;
  successCount: number;
  weight: number;
  lastUsedAt?: Date | null;
  clientId?: string | null;
}

export interface AiTaskDto {
  id: string;
  clientId?: string | null;
  taskType: AiTaskType;
  status: AiTaskStatus;
  provider: string;
  model: string;
  prompt?: string | null;
  inputParams?: Record<string, unknown> | null;
  outputResult?: Record<string, unknown> | null;
  errorMessage?: string | null;
  callbackUrl?: string | null;
  callbackStatus: AiCallbackStatus;
  executionTimeMs?: number | null;
  tokensConsumed?: number | null;
  costUsd?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiUsageLogDto {
  id: string;
  clientId?: string | null;
  taskId?: string | null;
  taskType: AiTaskType;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  errorMessage?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// RFC 7807 Problem Details Standard Error Model
// ---------------------------------------------------------------------------

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
  timestamp: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Dynamic AI Capability Catalog & Profile Manifest Contracts
// ---------------------------------------------------------------------------

export type AiCapability =
  | "text.generate"
  | "text.extract"
  | "image.generate"
  | "video.generate"
  | "audio.speech";

export type AiExecutionMode = "gateway_proxy" | "direct_byok";
export type AiProfileStatus = "enabled" | "disabled" | "degraded";

export interface AIProfile {
  profileId: string;
  version: number;
  displayName: string;
  description: string;
  capability: AiCapability;
  providerId: string;
  upstreamModelId: string;
  executionMode: AiExecutionMode;
  status: AiProfileStatus;
  limits?: Record<string, unknown>;
  supportedParameters?: string[];
  pricing?: {
    estimatedCostUsd?: number;
    currency?: string;
  };
}

export interface CatalogResponse {
  catalogVersion: number;
  version: number;
  generatedAt: string;
  profiles: AIProfile[];
  providers: Array<{
    id: string;
    displayName: string;
    enabled: boolean;
    capabilities: string[];
    models: Array<{
      id: string;
      displayName: string;
      enabled: boolean;
      capabilities: string[];
      limits?: Record<string, unknown>;
    }>;
  }>;
}
