import { timingSafeEqual } from "node:crypto";
import { getSePayConfig } from "@/src/lib/env";
import type { PaymentWebhookContext } from "@/src/domain/payments";

/**
 * SePay gửi API key kèm request dưới dạng header `Authorization: Apikey <key>`
 * (một số tài liệu/SDK dùng `Bearer <key>`). Ta chấp nhận cả hai cùng header
 * `x-api-key` để không bị chặn oan khi cấu hình webhook khác phiên bản.
 */
const SCHEMES = ["apikey", "bearer", "token"];

function candidates(context: PaymentWebhookContext): string[] {
  const values: string[] = [];
  const authorization = context.authorization?.trim();
  if (authorization) {
    const [scheme, ...rest] = authorization.split(/\s+/);
    const token = rest.join(" ").trim();
    // Header đúng chuẩn luôn có scheme; nếu không thì coi cả header là key.
    values.push(SCHEMES.includes(scheme.toLowerCase()) && token ? token : authorization);
  }
  const apiKeyHeader = context.apiKey?.trim();
  if (apiKeyHeader) values.push(apiKeyHeader);
  return values;
}

function equals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  // timingSafeEqual yêu cầu hai buffer cùng độ dài, nên so trước rồi mới gọi.
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Kiểm tra API key của webhook.
 *
 * - Sai key            => trả `false` => route trả 401.
 * - Chưa cấu hình key  => ném lỗi => route trả 503 (lỗi cấu hình server, KHÔNG
 *   trả 401 vì khi đó SePay sẽ retry liên tục mà nguyên nhân thật là thiếu cấu hình).
 */
export function isAuthorizedSePayRequest(context: PaymentWebhookContext): boolean {
  const { apiKey } = getSePayConfig();
  if (!apiKey) {
    throw new Error("SEPAY_API_KEY is not configured");
  }
  return candidates(context).some((candidate) => equals(candidate, apiKey));
}
