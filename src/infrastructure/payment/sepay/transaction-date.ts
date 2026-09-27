/**
 * Múi giờ của dữ liệu SePay.
 *
 * SePay gửi thời gian giao dịch theo giờ Việt Nam (GMT+7):
 *   - transaction webhook: "Y-m-d H:i:s"   (ví dụ "2026-09-26 10:30:00")
 *   - IPN:                 "Y/m/d H:i:s"   (ví dụ "2026-09-26/11:45:59")
 *
 * Chuỗi này KHÔNG kèm múi giờ. `new Date("2026-09-26 10:30:00")` sẽ được JS/Postgres
 * hiểu theo múi giờ của máy chạy (thường là UTC) => lệch 7 giờ so với thời điểm
 * ngân hàng ghi nhận. Mọi nơi đọc thời gian SePay đều phải đi qua đây để chỉ còn
 * một cách hiểu duy nhất.
 */
const VIETNAM_UTC_OFFSET = "+07:00";

/** Có kèm múi giờ sẵn (ISO 8601 / `+07:00` / `Z`) hay không. */
const HAS_OFFSET = /(?:z|[+-]\d{2}:?\d{2})$/i;

/**
 * Đổi chuỗi thời gian của SePay thành `Date` (mốc thời gian tuyệt đối).
 *
 * Trả `null` khi thiếu hoặc không đọc được — caller tự quyết định xem có ghi
 * nhận được giao dịch hay không, thay vì để `Invalid Date` lọt xuống dưới.
 */
export function parseSePayTransactionDate(value: string | null | undefined): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Đã có múi giờ thì tin JS.
  if (HAS_OFFSET.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // "2026/09/26 11:45:59" -> "2026-09-26 11:45:59" -> "2026-09-26T11:45:59" rồi
  // gắn múi giờ VN. Regex thay chỗ dấu phân cách ngay TRƯỚC giờ phút nên chịu
  // được cả khi SePay trộn lẫn các kiểu separator.
  let normalized = trimmed.replace(/\//g, "-").replace(/[- ](\d{1,2}:\d{2})/, "T$1");
  // Payload chỉ có ngày ("2026-09-26"): coi như 00:00:00 giờ VN.
  if (!/\d{1,2}:\d{2}/.test(normalized)) normalized = `${normalized}T00:00:00`;

  const parsed = new Date(`${normalized}${VIETNAM_UTC_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Cùng quy tắc trên nhưng trả về chuỗi ISO-8601 UTC để lưu vào DB.
 *
 * `webhook_events.transactionDate` là cột `timestamptz`; nếu lưu thẳng chuỗi
 * không múi giờ thì Postgres sẽ tự hiểu theo múi giờ server và mất 7 giờ. Chuẩn
 * hoá tại đây giúp mọi nơi đọc (admin đối soát, báo cáo) thấy cùng một mốc thời
 * gian. Giá trị gốc của SePay vẫn nằm trong `rawPayload` để đối chiếu.
 */
export function normalizeSePayTransactionDate(value: string | null | undefined): string | null {
  return parseSePayTransactionDate(value)?.toISOString() ?? null;
}
