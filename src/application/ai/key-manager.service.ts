import {
  AiKeyStatus,
  AiProviderKeyDto,
} from "@/src/domain/ai/models";
import { IAiRepository, IKeyManager } from "@/src/domain/ai/contracts";
import { AiAllKeysExhaustedError } from "@/src/domain/ai/errors";

export class KeyManagerService implements IKeyManager {
  private repository: IAiRepository;
  private defaultCooldownMinutes = 3;

  constructor(repository: IAiRepository) {
    this.repository = repository;
  }

  /**
   * Lấy API Key khả dụng tốt nhất theo thuật toán:
   * 1. Ưu tiên BYOK (Bring Your Own Key) của Client nếu có.
   * 2. Lọc các key ACTIVE hoặc đã vượt qua thời gian Cooldown.
   * 3. Chọn key ít lỗi nhất và ít dùng nhất (Least-Used / Least-Failure).
   */
  async getAvailableKey(provider: string, clientId?: string | null): Promise<AiProviderKeyDto> {
    const keys = await this.repository.findKeysByProvider(provider, clientId);

    if (!keys || keys.length === 0) {
      throw new AiAllKeysExhaustedError(provider);
    }

    // Nếu có BYOK riêng của client đang active thì ưu tiên dùng
    if (clientId) {
      const clientKey = keys.find((k) => k.clientId === clientId && k.status === "ACTIVE");
      if (clientKey) return clientKey;
    }

    // Lọc các system keys
    const availableKeys = keys.filter((k) => {
      if (k.status === "ACTIVE") return true;
      if (k.status === "RATE_LIMITED" && k.cooldownUntil && new Date() >= new Date(k.cooldownUntil)) {
        return true;
      }
      return false;
    });

    if (availableKeys.length === 0) {
      throw new AiAllKeysExhaustedError(provider);
    }

    // Round-robin / Least used: sắp xếp theo lastUsedAt cũ nhất
    availableKeys.sort((a, b) => {
      const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return timeA - timeB;
    });

    return availableKeys[0];
  }

  /**
   * Phạt key khi gặp lỗi 429 (Too Many Requests), chuyển sang RATE_LIMITED và bật cooldown
   */
  async markKeyRateLimited(keyId: string, cooldownMinutes?: number): Promise<void> {
    const minutes = cooldownMinutes ?? this.defaultCooldownMinutes;
    const cooldownUntil = new Date(Date.now() + minutes * 60 * 1000);
    await this.repository.incrementKeyFailure(keyId);
    await this.repository.updateKeyStatus(keyId, "RATE_LIMITED", cooldownUntil);
  }

  /**
   * Ghi nhận key thực thi thành công: reset cooldown, tăng successCount
   */
  async markKeySuccess(keyId: string): Promise<void> {
    await this.repository.incrementKeySuccess(keyId);
  }

  /**
   * Phạt key khi gặp lỗi 401 (Unauthorized / Invalid Key)
   */
  async markKeyExpired(keyId: string): Promise<void> {
    await this.repository.incrementKeyFailure(keyId);
    await this.repository.updateKeyStatus(keyId, "EXPIRED", null);
  }

  async upsertKey(data: {
    provider: string;
    keySecret: string;
    alias?: string | null;
    clientId?: string | null;
    weight?: number;
  }): Promise<AiProviderKeyDto> {
    return await this.repository.saveKey(data);
  }

  async updateKey(
    id: string,
    data: Partial<{
      alias: string | null;
      keySecret: string;
      weight: number;
      status: AiKeyStatus;
      cooldownUntil: Date | null;
    }>,
  ): Promise<AiProviderKeyDto> {
    return await this.repository.updateKey(id, data);
  }

  async deleteKey(id: string): Promise<void> {
    await this.repository.deleteKey(id);
  }

  async listKeys(provider?: string): Promise<AiProviderKeyDto[]> {
    return await this.repository.getAllKeys(provider);
  }

  /**
   * Circuit Breaker & Automatic Key Rotation with Fallback:
   * Tự động thử lại với key dự phòng khi gặp lỗi 429 hoặc 401.
   */
  async executeWithRetry<T>(
    provider: string,
    clientId: string | null | undefined,
    operation: (apiKey: string) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: unknown;
    const triedKeyIds = new Set<string>();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let key: AiProviderKeyDto;
      try {
        key = await this.getAvailableKey(provider, clientId);
      } catch (err) {
        throw lastError || err;
      }

      if (triedKeyIds.has(key.id)) {
        // Đã thử hết các key khả dụng
        break;
      }
      triedKeyIds.add(key.id);

      try {
        const result = await operation(key.keySecret);
        // Ghi nhận thành công
        await this.markKeySuccess(key.id);
        return result;
      } catch (error) {
        lastError = error;
        const statusCode = (error as { statusCode?: number })?.statusCode;

        if (statusCode === 429) {
          // Bị rate-limit: kích hoạt cooldown và switch ngay sang key khác
          console.warn(`[KeyManager] Key ${key.id} hit 429 Rate Limit. Setting cooldown...`);
          await this.markKeyRateLimited(key.id);
          continue;
        }

        if (statusCode === 401) {
          // Key sai hoặc hết hạn: vô hiệu hoá key ngay
          console.error(`[KeyManager] Key ${key.id} hit 401 Unauthorized. Marking expired...`);
          await this.markKeyExpired(key.id);
          continue;
        }

        // Lỗi nghiệp vụ khác (bad request, internal error): không phải lỗi do key, ném ra ngoài
        await this.repository.incrementKeyFailure(key.id);
        throw error;
      }
    }

    throw lastError || new AiAllKeysExhaustedError(provider);
  }
}
