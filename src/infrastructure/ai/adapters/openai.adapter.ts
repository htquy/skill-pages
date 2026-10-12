import {
  TextStreamChunk,
  UnifiedTextRequest,
  UnifiedTextResponse,
} from "@/src/domain/ai/models";
import { ITextProvider } from "@/src/domain/ai/contracts";
import { AiProviderUnavailableError } from "@/src/domain/ai/errors";

export class OpenAIAdapter implements ITextProvider {
  readonly providerName = "openai";
  private baseUrl: string;

  constructor(baseUrl = "https://api.openai.com/v1") {
    this.baseUrl = baseUrl;
  }

  async generateText(request: UnifiedTextRequest, apiKey: string): Promise<UnifiedTextResponse> {
    const startTime = Date.now();
    const model = request.model || "gpt-4o-mini";

    const messages = [...request.messages];
    if (request.systemPrompt && !messages.some((m) => m.role === "system")) {
      messages.unshift({ role: "system", content: request.systemPrompt });
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`OpenAI API error [${response.status}]: ${errText}`);
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const duration = Date.now() - startTime;

    return {
      id: data.id || `openai-${Date.now()}`,
      provider: this.providerName,
      model,
      content: choice?.message?.content || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: choice?.finish_reason,
      executionTimeMs: duration,
    };
  }

  async *streamText(
    request: UnifiedTextRequest,
    apiKey: string,
  ): AsyncIterable<TextStreamChunk> {
    const model = request.model || "gpt-4o-mini";
    const messages = [...request.messages];
    if (request.systemPrompt && !messages.some((m) => m.role === "system")) {
      messages.unshift({ role: "system", content: request.systemPrompt });
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`OpenAI Stream error [${response.status}]: ${errText}`);
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    if (!response.body) {
      throw new AiProviderUnavailableError(this.providerName, "Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") {
            yield {
              id: "stream-done",
              deltaText: "",
              isFinished: true,
              finishReason: "stop",
            };
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            const finishReason = parsed.choices?.[0]?.finish_reason;

            if (delta || finishReason) {
              yield {
                id: parsed.id || `chunk-${Date.now()}`,
                deltaText: delta,
                isFinished: Boolean(finishReason),
                finishReason: finishReason ?? undefined,
              };
            }
          } catch {
            // Ignore parse errors for keep-alive or heartbeat chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const openAIAdapter = new OpenAIAdapter();
