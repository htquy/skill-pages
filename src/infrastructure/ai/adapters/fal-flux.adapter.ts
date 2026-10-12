import {
  ImageTaskResult,
  UnifiedImageRequest,
  UnifiedImageTaskResponse,
} from "@/src/domain/ai/models";
import { IImageProvider } from "@/src/domain/ai/contracts";

export class FalAiFluxAdapter implements IImageProvider {
  readonly providerName = "fal-ai";
  private baseUrl = "https://queue.fal.run";

  async createImageTask(
    request: UnifiedImageRequest,
    apiKey: string,
  ): Promise<UnifiedImageTaskResponse> {
    const model = request.model || "fal-ai/flux/schnell";
    const endpoint = `${this.baseUrl}/${model}`;

    const webhookUrl = request.callbackUrl;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: request.prompt,
        image_size: request.aspectRatio === "16:9" ? "landscape_16_9" : request.aspectRatio === "9:16" ? "portrait_16_9" : "square_hd",
        num_images: request.numImages || 1,
        seed: request.seed,
        webhook_url: webhookUrl,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`Fal.ai Queue error [${response.status}]: ${errText}`);
      (error as unknown as { statusCode: number }).statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    return {
      taskId: data.request_id || `fal-${Date.now()}`,
      status: "PENDING",
      provider: this.providerName,
      model,
      estimatedSeconds: 15,
      createdAt: new Date().toISOString(),
    };
  }

  async checkTaskStatus(taskId: string, apiKey: string): Promise<ImageTaskResult> {
    const statusUrl = `https://queue.fal.run/fal-ai/flux/requests/${taskId}/status`;
    const response = await fetch(statusUrl, {
      headers: {
        Authorization: `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      // Nếu là giả lập hoặc task vừa tạo
      return {
        taskId,
        status: "PROCESSING",
        images: [],
      };
    }

    const data = await response.json();
    if (data.status === "COMPLETED") {
      const resUrl = `https://queue.fal.run/fal-ai/flux/requests/${taskId}`;
      const resResponse = await fetch(resUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const resData = await resResponse.json();
      const images = (resData.images || []).map((img: { url: string; width?: number; height?: number; content_type?: string }) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        contentType: img.content_type,
      }));

      return {
        taskId,
        status: "COMPLETED",
        images,
        seed: resData.seed,
      };
    }

    if (data.status === "FAILED") {
      return {
        taskId,
        status: "FAILED",
        images: [],
        error: data.error || "Generation failed in Fal.ai",
      };
    }

    return {
      taskId,
      status: "PROCESSING",
      images: [],
    };
  }
}

export const falAiFluxAdapter = new FalAiFluxAdapter();
