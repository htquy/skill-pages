import { EventEmitter } from "node:events";
import { ITaskQueue, TaskJobPayload } from "@/src/domain/ai/contracts";

/**
 * In-memory Event-driven Queue implementation.
 * Sẵn sàng hoạt động ngay lập tức trong quá trình phát triển (Local / Modular Monolith).
 * Có thể hoán đổi sang Redis + BullMQ Task Queue trong Production mà không ảnh hưởng code nghiệp vụ.
 */
export class InMemoryTaskQueue implements ITaskQueue {
  private emitter = new EventEmitter();
  private pendingJobs: TaskJobPayload[] = [];
  private isProcessing = false;
  private processor: ((job: TaskJobPayload) => Promise<void>) | null = null;

  constructor() {
    this.emitter.on("job:added", () => {
      this.drainQueue().catch((err) => {
        console.error("[InMemoryTaskQueue] Error draining queue:", err);
      });
    });
  }

  async enqueue(job: TaskJobPayload): Promise<void> {
    this.pendingJobs.push(job);
    this.emitter.emit("job:added");
  }

  registerProcessor(handler: (job: TaskJobPayload) => Promise<void>): void {
    this.processor = handler;
    // Chạy drain ngay nếu đã có jobs chờ sẵn
    if (this.pendingJobs.length > 0) {
      this.emitter.emit("job:added");
    }
  }

  private async drainQueue(): Promise<void> {
    if (this.isProcessing || !this.processor) return;
    this.isProcessing = true;

    try {
      while (this.pendingJobs.length > 0) {
        const job = this.pendingJobs.shift();
        if (!job) break;

        try {
          await this.processor(job);
        } catch (jobError) {
          console.error(`[InMemoryTaskQueue] Failed processing task ${job.taskId}:`, jobError);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const taskQueue = new InMemoryTaskQueue();
