import {
  UnifiedVideoRequest,
  UnifiedVideoTaskResponse,
  VideoTaskResult,
} from "@/src/domain/ai/models";
import { IVideoProvider } from "@/src/domain/ai/contracts";

export class LumaVideoAdapter implements IVideoProvider {
  readonly providerName = "luma";
  private baseUrl = "https://api.lumalabs.ai/dream-machine/v1";

  async createVideoTask(
    request: UnifiedVideoRequest,
    apiKey: string,
  ): Promise<UnifiedVideoTaskResponse> {
    const model = request.model || "ray-2";
    const endpoint = `${this.baseUrl}/generations`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model,
        aspect_ratio: request.aspectRatio || "16:9",
        keyframes: request.imageUrl
          ? { frame0: { type: "image", url: request.imageUrl } }
          : undefined,
        callback_url: request.callbackUrl,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`Luma API error [${response.status}]: ${errText}`);
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    return {
      taskId: data.id || `luma-${Date.now()}`,
      status: "PENDING",
      provider: this.providerName,
      model,
      estimatedSeconds: 120,
      createdAt: new Date().toISOString(),
    };
  }

  async checkTaskStatus(taskId: string, apiKey: string): Promise<VideoTaskResult> {
    const endpoint = `${this.baseUrl}/generations/${taskId}`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        taskId,
        status: "PROCESSING",
      };
    }

    const data = await response.json();
    if (data.state === "completed") {
      return {
        taskId,
        status: "COMPLETED",
        videoUrl: data.assets?.video,
        thumbnailUrl: data.assets?.thumbnail,
        durationSeconds: 5,
      };
    }

    if (data.state === "failed") {
      return {
        taskId,
        status: "FAILED",
        error: data.failure_reason || "Video generation failed",
      };
    }

    return {
      taskId,
      status: "PROCESSING",
    };
  }
}

export const lumaVideoAdapter = new LumaVideoAdapter();
