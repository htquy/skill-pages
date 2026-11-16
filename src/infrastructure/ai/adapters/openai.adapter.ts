import {
  ChatMessage,
  TextStreamChunk,
  TokenUsage,
  UnifiedTextRequest,
  UnifiedTextResponse,
} from "@/src/domain/ai/models";
import { ITextProvider } from "@/src/domain/ai/contracts";
import { AiProviderUnavailableError } from "@/src/domain/ai/errors";

function extractUsage(rawUsage: Record<string, unknown> | undefined): TokenUsage | undefined {
  if (!rawUsage) return undefined;
  const promptTokens = Number(rawUsage.prompt_tokens ?? 0);
  const completionTokens = Number(rawUsage.completion_tokens ?? 0);
  const totalTokens = Number(rawUsage.total_tokens ?? promptTokens + completionTokens);
  const details = rawUsage.prompt_tokens_details as Record<string, unknown> | undefined;
  const cachedTokens = Number(details?.cached_tokens ?? rawUsage.cache_read_input_tokens ?? 0);
  const costUsd = typeof rawUsage.cost === "number" ? rawUsage.cost : undefined;

  return {
    promptTokens,
    cachedTokens,
    completionTokens,
    totalTokens,
    ...(costUsd !== undefined ? { costUsd } : {}),
  };
}

function formatMessagesForProvider(
  request: UnifiedTextRequest,
  providerName: string,
  model: string,
): unknown[] {
  const base: ChatMessage[] = request.messages.map((m) => ({ ...m }));
  if (request.systemPrompt && !base.some((m) => m.role === "system")) {
    base.unshift({ role: "system", content: request.systemPrompt });
  }

  const useAnthropicCaching =
    providerName === "openrouter" && model.startsWith("anthropic/");

  return base.map((m) => {
    const msg: Record<string, unknown> = {
      role: m.role,
      content: m.content,
    };
    if (m.tool_calls?.length) msg.tool_calls = m.tool_calls;
    if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;

    // Prompt caching on Anthropic via OpenRouter saves 90% on large system prompts in multi-turn tool loops.
    if (
      useAnthropicCaching &&
      m.role === "system" &&
      typeof m.content === "string" &&
      m.content.length >= 3000
    ) {
      msg.content = [
        {
          type: "text",
          text: m.content,
          cache_control: { type: "ephemeral" },
        },
      ];
    }
    return msg;
  });
}

function buildRequestHeaders(apiKey: string, providerName: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (providerName === "openrouter") {
    headers["HTTP-Referer"] =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.onedaybetter.online";
    headers["X-Title"] = "SkillStudio AI Gateway";
  }
  return headers;
}

function buildRequestBody(
  request: UnifiedTextRequest,
  providerName: string,
  model: string,
  stream: boolean,
): Record<string, unknown> {
  const messages = formatMessagesForProvider(request, providerName, model);
  return {
    model,
    messages,
    ...(request.tools?.length
      ? {
          tools: request.tools,
          tool_choice: request.toolChoice ?? "auto",
          ...(request.parallelToolCalls !== undefined
            ? { parallel_tool_calls: request.parallelToolCalls }
            : {}),
        }
      : {}),
    ...(request.reasoningEffort
      ? providerName === "openrouter"
        ? { reasoning: { effort: request.reasoningEffort } }
        : { reasoning_effort: request.reasoningEffort }
      : {}),
    ...(providerName === "openrouter"
      ? {
          provider: {
            data_collection: request.dataCollection ?? "deny",
          },
        }
      : {}),
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
    ...(request.topP !== undefined ? { top_p: request.topP } : {}),
    stream,
    ...(stream ? { stream_options: { include_usage: true } } : {}),
  };
}

export class OpenAIAdapter implements ITextProvider {
  readonly providerName: string;
  private baseUrl: string;

  constructor(baseUrl = "https://api.openai.com/v1", providerName = "openai") {
    this.providerName = providerName;
    this.baseUrl = baseUrl;
  }

  /**
   * Kiểm tra API key OpenRouter qua GET /api/v1/auth/key (tiêu tốn 0 token / 0 quota).
   */
  async verifyKey(apiKey: string): Promise<{
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
  }> {
    if (this.providerName !== "openrouter") {
      return {
        valid: Boolean(apiKey.trim()),
        provider: this.providerName,
        statusCode: apiKey.trim() ? 200 : 400,
      };
    }

    const res = await fetch(`${this.baseUrl}/auth/key`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        valid: false,
        provider: this.providerName,
        statusCode: res.status,
        error: errText || res.statusText,
      };
    }

    const payload = (await res.json()) as {
      data?: {
        label?: string | null;
        limit?: number | null;
        limit_remaining?: number | null;
        usage?: number | null;
        is_free_tier?: boolean | null;
        is_management_key?: boolean | null;
        is_provisioning_key?: boolean | null;
        expires_at?: string | null;
      };
    };

    const isManagementKey = Boolean(payload.data?.is_management_key);
    const isProvisioningKey = Boolean(payload.data?.is_provisioning_key);
    if (isManagementKey || isProvisioningKey) {
      return {
        valid: false,
        provider: this.providerName,
        statusCode: 401,
        label: payload.data?.label ?? null,
        limit: payload.data?.limit ?? null,
        limitRemaining: payload.data?.limit_remaining ?? null,
        usage: payload.data?.usage ?? null,
        isFreeTier: payload.data?.is_free_tier ?? null,
        isManagementKey,
        isProvisioningKey,
        expiresAt: payload.data?.expires_at ?? null,
        error:
          "Key này là OpenRouter Management/Provisioning Key (chỉ quản lý tài khoản/key, không gọi được chat/completions nên OpenRouter trả 401 'User not found.'). Hãy tạo API Key thông thường tại https://openrouter.ai/settings/keys.",
      };
    }

    return {
      valid: true,
      provider: this.providerName,
      statusCode: res.status,
      label: payload.data?.label ?? null,
      limit: payload.data?.limit ?? null,
      limitRemaining: payload.data?.limit_remaining ?? null,
      usage: payload.data?.usage ?? null,
      isFreeTier: payload.data?.is_free_tier ?? null,
      isManagementKey: false,
      isProvisioningKey: false,
      expiresAt: payload.data?.expires_at ?? null,
    };
  }

  async generateText(
    request: UnifiedTextRequest,
    apiKey: string,
  ): Promise<UnifiedTextResponse> {
    const startTime = Date.now();
    const model =
      request.model ||
      (this.providerName === "openrouter"
        ? "anthropic/claude-haiku-5.5"
        : "gpt-4o-mini");

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildRequestHeaders(apiKey, this.providerName),
      body: JSON.stringify(
        buildRequestBody(request, this.providerName, model, false),
      ),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(
        `${this.providerName} API error [${response.status}]: ${errText}`,
      );
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    if (data?.error) {
      const errMsg =
        typeof data.error?.message === "string"
          ? data.error.message
          : JSON.stringify(data.error);
      const error = new Error(`${this.providerName} API error: ${errMsg}`);
      (error as unknown as { statusCode: number }).statusCode =
        Number(data.error?.code) || 502;
      throw error;
    }

    const choice = data.choices?.[0];
    const duration = Date.now() - startTime;
    const usage = extractUsage(data.usage) ?? {
      promptTokens: 0,
      cachedTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    return {
      id: data.id || `${this.providerName}-${Date.now()}`,
      provider: this.providerName,
      model: data.model || model,
      content: choice?.message?.content || "",
      ...(choice?.message?.tool_calls
        ? { toolCalls: choice.message.tool_calls }
        : {}),
      usage,
      finishReason: choice?.finish_reason,
      executionTimeMs: duration,
    };
  }

  async *streamText(
    request: UnifiedTextRequest,
    apiKey: string,
  ): AsyncIterable<TextStreamChunk> {
    const model =
      request.model ||
      (this.providerName === "openrouter"
        ? "anthropic/claude-haiku-5.5"
        : "gpt-4o-mini");

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildRequestHeaders(apiKey, this.providerName),
      body: JSON.stringify(
        buildRequestBody(request, this.providerName, model, true),
      ),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(
        `${this.providerName} Stream error [${response.status}]: ${errText}`,
      );
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    if (!response.body) {
      throw new AiProviderUnavailableError(
        this.providerName,
        "Response body is null",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let lastFinishReason: string | undefined;
    let latestUsage: TokenUsage | undefined;
    let resolvedModel = model;
    let finishedEmitted = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") {
            finishedEmitted = true;
            yield {
              id: "stream-done",
              provider: this.providerName,
              model: resolvedModel,
              deltaText: "",
              isFinished: true,
              finishReason: lastFinishReason ?? "stop",
              ...(latestUsage ? { usage: latestUsage } : {}),
            };
            return;
          }

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            // Keep-alive / partial comment line
            continue;
          }

          if (parsed.error && typeof parsed.error === "object") {
            const errObj = parsed.error as Record<string, unknown>;
            const err = new Error(
              `${this.providerName} stream error: ${errObj.message || JSON.stringify(errObj)}`,
            );
            (err as unknown as { statusCode: number }).statusCode =
              Number(errObj.code) || 502;
            throw err;
          }

          if (typeof parsed.model === "string" && parsed.model) {
            resolvedModel = parsed.model;
          }

          const usage = extractUsage(
            parsed.usage as Record<string, unknown> | undefined,
          );
          if (usage) latestUsage = usage;

          const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
          const firstChoice = choices[0] as Record<string, unknown> | undefined;
          const deltaObj = firstChoice?.delta as
            | Record<string, unknown>
            | undefined;
          const delta =
            typeof deltaObj?.content === "string" ? deltaObj.content : "";
          const finishReason =
            typeof firstChoice?.finish_reason === "string"
              ? firstChoice.finish_reason
              : undefined;
          if (finishReason) lastFinishReason = finishReason;

          const toolCallDeltas = Array.isArray(deltaObj?.tool_calls)
            ? (deltaObj.tool_calls as TextStreamChunk["toolCallDeltas"])
            : undefined;

          if (delta || finishReason || toolCallDeltas?.length || usage) {
            yield {
              id:
                (typeof parsed.id === "string" ? parsed.id : "") ||
                `chunk-${Date.now()}`,
              provider: this.providerName,
              model: resolvedModel,
              deltaText: delta,
              ...(toolCallDeltas?.length ? { toolCallDeltas } : {}),
              isFinished: false,
              finishReason,
              ...(usage ? { usage } : {}),
            };
          }
        }
      }
      if (!finishedEmitted) {
        yield {
          id: "stream-done",
          provider: this.providerName,
          model: resolvedModel,
          deltaText: "",
          isFinished: true,
          finishReason: lastFinishReason ?? "stop",
          ...(latestUsage ? { usage: latestUsage } : {}),
        };
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const openAIAdapter = new OpenAIAdapter();
export const openRouterAdapter = new OpenAIAdapter(
  "https://openrouter.ai/api/v1",
  "openrouter",
);
