import { sePayWebhook } from "@/src/infrastructure/composition";
import { isAppError } from "@/src/domain/errors";
import { isSePayEventEnvelope } from "@/src/infrastructure/payment/sepay/schema";
import { isAuthorizedSePayRequest } from "@/src/infrastructure/payment/sepay/api-key";

export const dynamic = "force-dynamic";

/**
 * Webhook nhận giao dịch từ SePay (BankHub).
 *
 * Yêu cầu trả về của SePay: HTTP 200 + `{"success": true}`. Vì vậy:
 *
 * - 401 khi sai API key            -> SePay biết là chưa cấu hình đúng, không retry.
 * - 400 khi payload sai cấu trúc   -> dữ liệu hỏng, không retry cũng vô nghĩa.
 * - 503 khi server chưa cấu hình key -> để SePay retry sau khi sửa cấu hình.
 * - 200 với mọi kết quả nghiệp vụ (kể cả "không tìm thấy đơn") -> tiền đã ghi
 *   vào `webhook_events` để đối soát thủ công, không retry vô ích.
 */
export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ success: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const context = {
    authorization: request.headers.get("authorization"),
    apiKey: request.headers.get("x-api-key"),
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };

  try {
    // Xác thực TRƯỚC khi xem payload là gì: nếu bỏ qua xác thực, chỉ cần gửi
    // một payload hình dạng "sự kiện" là thành 200 dù sai key — endpoint webhook
    // vẫn phải đóng khi chưa được uỷ quyền.
    if (!isAuthorizedSePayRequest(context)) {
      return Response.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Webhook sự kiện (liên kết tài khoản) không mang dữ liệu giao dịch. Trả 200
    // để SePay không retry 7 lần cho một payload vốn không dùng được.
    if (isSePayEventEnvelope(payload)) {
      return Response.json({ success: true, ignored: "non_transaction_event" });
    }

    const result = await sePayWebhook.handle({ payload, ...context });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return Response.json(
        { success: false, error: error.code },
        { status: error.status },
      );
    }

    // Lỗi cấu hình (thiếu SEPAY_API_KEY, ...) hoặc lỗi hệ thống: trả 503 để
    // SePay retry, đồng thời ghi log server để không lộ chi tiết ra ngoài.
    console.error("[sepay-webhook] unhandled failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ success: false, error: "UNAVAILABLE" }, { status: 503 });
  }
}
