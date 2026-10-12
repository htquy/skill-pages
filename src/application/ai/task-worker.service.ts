import crypto from "node:crypto";
import {
  IAiRepository,
  IImageProvider,
  IMediaStorage,
  ITaskQueue,
  IVideoProvider,
  TaskJobPayload,
} from "@/src/domain/ai/contracts";
import { KeyManagerService } from "./key-manager.service";

export class TaskWorkerService {
  private queue: ITaskQueue;
  private repository: IAiRepository;
  private keyManager: KeyManagerService;
  private imageProviders: Map<string, IImageProvider>;
  private videoProviders: Map<string, IVideoProvider>;
  private storage: IMediaStorage;

  constructor(deps: {
    queue: ITaskQueue;
    repository: IAiRepository;
    keyManager: KeyManagerService;
    imageProviders: Map<string, IImageProvider>;
    videoProviders: Map<string, IVideoProvider>;
    storage: IMediaStorage;
  }) {
    this.queue = deps.queue;
    this.repository = deps.repository;
    this.keyManager = deps.keyManager;
    this.imageProviders = deps.imageProviders;
    this.videoProviders = deps.videoProviders;
    this.storage = deps.storage;

    // Đăng ký worker với Queue
    this.queue.registerProcessor((job) => this.processJob(job));
  }

  async processJob(job: TaskJobPayload): Promise<void> {
    const startTime = Date.now();
    console.log(`[TaskWorker] Start processing job ${job.taskId} (Type: ${job.taskType}, Provider: ${job.provider})`);

    await this.repository.updateTaskStatus(job.taskId, {
      status: "PROCESSING",
    });

    try {
      if (job.taskType === "IMAGE") {
        await this.handleImageJob(job, startTime);
      } else if (job.taskType === "VIDEO") {
        await this.handleVideoJob(job, startTime);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Task execution failed";
      console.error(`[TaskWorker] Task ${job.taskId} failed:`, errorMsg);

      await this.repository.updateTaskStatus(job.taskId, {
        status: "FAILED",
        errorMessage: errorMsg,
        executionTimeMs: Date.now() - startTime,
      });

      // Báo Webhook nếu có cấu hình
      if (job.callbackUrl) {
        await this.dispatchWebhook(job.callbackUrl, {
          taskId: job.taskId,
          status: "FAILED",
          error: errorMsg,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }
  }

  private async handleImageJob(job: TaskJobPayload, startTime: number): Promise<void> {
    const provider = this.imageProviders.get(job.provider);
    if (!provider) {
      throw new Error(`Unsupported image provider '${job.provider}'`);
    }

    // Polling cho tới khi hoàn tất (tối đa 20 lần thử, giãn cách 3s)
    let completed = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!completed && attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 3000));

      const statusResult = await this.keyManager.executeWithRetry(
        job.provider,
        job.clientId,
        async (apiKey) => {
          return await provider.checkTaskStatus(job.taskId, apiKey);
        },
      );

      if (statusResult.status === "COMPLETED") {
        completed = true;

        // Lưu ảnh đệm lên S3/Storage của hệ thống để đảm bảo lưu trữ vĩnh viễn
        const storedImages = [];
        for (let i = 0; i < statusResult.images.length; i++) {
          const img = statusResult.images[i];
          const s3Key = `images/${job.taskId}_${i + 1}.png`;
          const finalUrl = await this.storage.uploadFromUrl(img.url, s3Key);
          storedImages.push({
            url: finalUrl,
            width: img.width,
            height: img.height,
          });
        }

        const executionDuration = Date.now() - startTime;
        const resultPayload = {
          images: storedImages,
          seed: statusResult.seed,
        };

        await this.repository.updateTaskStatus(job.taskId, {
          status: "COMPLETED",
          outputResult: resultPayload,
          executionTimeMs: executionDuration,
        });

        // Báo Webhook Callback
        if (job.callbackUrl) {
          const callbackSuccess = await this.dispatchWebhook(job.callbackUrl, {
            taskId: job.taskId,
            status: "COMPLETED",
            result: resultPayload,
            executionTimeMs: executionDuration,
          });

          await this.repository.updateTaskStatus(job.taskId, {
            status: "COMPLETED",
            callbackStatus: callbackSuccess ? "DELIVERED" : "FAILED",
          });
        }
        return;
      }

      if (statusResult.status === "FAILED") {
        throw new Error(statusResult.error || "Image generation reported failure");
      }
    }

    if (!completed) {
      throw new Error("Task timed out while polling upstream provider");
    }
  }

  private async handleVideoJob(job: TaskJobPayload, startTime: number): Promise<void> {
    const provider = this.videoProviders.get(job.provider);
    if (!provider) {
      throw new Error(`Unsupported video provider '${job.provider}'`);
    }

    let completed = false;
    let attempts = 0;
    const maxAttempts = 40; // Video dài hơn nên thử nhiều hơn

    while (!completed && attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 5000));

      const statusResult = await this.keyManager.executeWithRetry(
        job.provider,
        job.clientId,
        async (apiKey) => {
          return await provider.checkTaskStatus(job.taskId, apiKey);
        },
      );

      if (statusResult.status === "COMPLETED") {
        completed = true;

        let finalVideoUrl = statusResult.videoUrl;
        if (statusResult.videoUrl) {
          const s3Key = `videos/${job.taskId}.mp4`;
          finalVideoUrl = await this.storage.uploadFromUrl(statusResult.videoUrl, s3Key);
        }

        const executionDuration = Date.now() - startTime;
        const resultPayload = {
          videoUrl: finalVideoUrl,
          thumbnailUrl: statusResult.thumbnailUrl,
          durationSeconds: statusResult.durationSeconds,
        };

        await this.repository.updateTaskStatus(job.taskId, {
          status: "COMPLETED",
          outputResult: resultPayload,
          executionTimeMs: executionDuration,
        });

        if (job.callbackUrl) {
          const callbackSuccess = await this.dispatchWebhook(job.callbackUrl, {
            taskId: job.taskId,
            status: "COMPLETED",
            result: resultPayload,
            executionTimeMs: executionDuration,
          });

          await this.repository.updateTaskStatus(job.taskId, {
            status: "COMPLETED",
            callbackStatus: callbackSuccess ? "DELIVERED" : "FAILED",
          });
        }
        return;
      }

      if (statusResult.status === "FAILED") {
        throw new Error(statusResult.error || "Video generation failed");
      }
    }

    if (!completed) {
      throw new Error("Video task timed out");
    }
  }

  private async dispatchWebhook(callbackUrl: string, payload: Record<string, unknown>): Promise<boolean> {
    try {
      const bodyStr = JSON.stringify(payload);
      const secret = process.env.AI_GATEWAY_WEBHOOK_SECRET || "gateway-webhook-secret";
      const signature = crypto.createHmac("sha256", secret).update(bodyStr).digest("hex");

      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Signature": `sha256=${signature}`,
          "User-Agent": "AIGateway-Webhook-Service/1.0",
        },
        body: bodyStr,
      });

      return response.ok;
    } catch (err) {
      console.error(`[TaskWorker] Error dispatching webhook to ${callbackUrl}:`, err);
      return false;
    }
  }
}
