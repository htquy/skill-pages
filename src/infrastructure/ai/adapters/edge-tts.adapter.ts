import {
  UnifiedAudioRequest,
  UnifiedAudioResponse,
} from "@/src/domain/ai/models";
import { ITtsProvider } from "@/src/domain/ai/contracts";

export class AudioTtsAdapter implements ITtsProvider {
  readonly providerName = "openai-tts";

  async synthesizeAudio(
    request: UnifiedAudioRequest,
    apiKey: string,
  ): Promise<UnifiedAudioResponse> {
    const startTime = Date.now();
    const model = request.model || "tts-1";
    const voice = request.voice || "alloy";
    const format = request.format || "mp3";

    // OpenAI TTS Endpoint
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: request.text,
        voice,
        response_format: format,
        speed: request.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`TTS API error [${response.status}]: ${errText}`);
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;
    const duration = Date.now() - startTime;

    return {
      audioBuffer: buffer,
      contentType,
      durationSeconds: Math.max(1, Math.round(request.text.length / 15)),
      executionTimeMs: duration,
    };
  }
}

export const audioTtsAdapter = new AudioTtsAdapter();
