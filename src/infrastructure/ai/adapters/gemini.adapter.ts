import {
  TextStreamChunk,
  UnifiedTextRequest,
  UnifiedTextResponse,
} from "@/src/domain/ai/models";
import { ITextProvider } from "@/src/domain/ai/contracts";
import { AiProviderUnavailableError } from "@/src/domain/ai/errors";

export class GeminiAdapter implements ITextProvider {
  readonly providerName = "gemini";
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  private formatGeminiContents(request: UnifiedTextRequest) {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const msg of request.messages) {
      if (msg.role === "system") continue; // system prompt goes to systemInstruction
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    let systemInstruction: { parts: Array<{ text: string }> } | undefined;
    const systemMsg = request.messages.find((m) => m.role === "system");
    if (systemMsg || request.systemPrompt) {
      systemInstruction = {
        parts: [{ text: systemMsg ? systemMsg.content : request.systemPrompt! }],
      };
    }

    return { contents, systemInstruction };
  }

  async generateText(request: UnifiedTextRequest, apiKey: string): Promise<UnifiedTextResponse> {
    const startTime = Date.now();
    const model = request.model || "gemini-2.5-flash";
    const { contents, systemInstruction } = this.formatGeminiContents(request);

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
          topP: request.topP,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`Gemini API error [${response.status}]: ${errText}`);
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text || "";
    const duration = Date.now() - startTime;

    return {
      id: `gemini-${Date.now()}`,
      provider: this.providerName,
      model,
      content: textPart,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      finishReason: candidate?.finishReason,
      executionTimeMs: duration,
    };
  }

  async *streamText(
    request: UnifiedTextRequest,
    apiKey: string,
  ): AsyncIterable<TextStreamChunk> {
    const model = request.model || "gemini-2.5-flash";
    const { contents, systemInstruction } = this.formatGeminiContents(request);

    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`Gemini Stream error [${response.status}]: ${errText}`);
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
          try {
            const parsed = JSON.parse(dataStr);
            const candidate = parsed.candidates?.[0];
            const textPart = candidate?.content?.parts?.[0]?.text || "";
            const finishReason = candidate?.finishReason;

            if (textPart || finishReason) {
              yield {
                id: `gemini-chunk-${Date.now()}`,
                deltaText: textPart,
                isFinished: Boolean(finishReason),
                finishReason: finishReason ?? undefined,
              };
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const geminiAdapter = new GeminiAdapter();
