import { z } from "zod";
import { ValidationError } from "@/src/domain/errors";
import type { VerifiedWebhookEvent } from "@/src/domain/payments";
import { normalizeSePayTransactionDate } from "./transaction-date";

/**
 * Chuẩn hoá payload webhook của SePay.
 *
 * SePay có hai bộ tài liệu song song:
 *  1. Transaction webhook (payload `camelCase`: transferType, transferAmount...).
 *  2. IPN biến động số dư (payload `snake_case`: transaction_id, amount, va...).
 *
 * Ta chấp nhận CẢ HAI và quy về một cấu trúc duy nhất, để không bị gãy vỡ khi
 * SePay đổi tên field hoặc khi merchant đang cấu hình ở bản tài liệu nào đó.
 * Field nào không có ở cả hai thì coi như null — không tự bịa dữ liệu.
 */
const looseString = z.string().trim().max(600).nullish();

const looseAmount = z.coerce.number().finite().nullish();

const baseSchema = z
  .object({
    // Transaction webhook (camelCase).
    id: z.union([z.string(), z.number()]).nullish(),
    gateway: looseString,
    transactionDate: looseString,
    accountNumber: looseString,
    subAccount: looseString,
    amountIn: looseAmount,
    transferAmount: looseAmount,
    accumulated: looseAmount,
    code: looseString,
    content: looseString,
    transferType: z.string().trim().nullish(),
    referenceNumber: looseString,
    referenceCode: looseString,
    description: looseString,

    // IPN biến động số dư (snake_case).
    transaction_id: looseString,
    transaction_date: looseString,
    account_number: looseString,
    va: looseString,
    payment_code: looseString,
    amount: looseAmount,
    reference_code: looseString,
    bank_account_xid: looseString,
    transfer_type: z.string().trim().nullish(),
  })
  .loose();

/**
 * Ba trường dưới đây quyết định tiền có được ghi nhận hay không, nên thiếu bất kỳ
 * trường nào cũng phải bị chặn NGAY ở boundary (400) thay vì đi sâu vào tầng
 * dưới rồi mới lỗi — nếu không SePay sẽ retry một payload vĩnh viễn hỏng.
 */
export const sePayWebhookSchema = baseSchema.superRefine((body, ctx) => {
  const hasIdentifier =
    Boolean(body.transaction_id) || (body.id !== null && body.id !== undefined);
  if (!hasIdentifier) {
    ctx.addIssue({
      code: "custom",
      path: ["transaction_id"],
      message: "missing transaction identifier",
    });
  }

  if (!body.account_number && !body.accountNumber) {
    ctx.addIssue({ code: "custom", path: ["account_number"], message: "missing account number" });
  }

  // `looseAmount` là `nullish` nên field vắng mặt là `undefined`, không phải
  // `null` — phải kiểm tra cả hai.
  if (body.amount == null && body.amountIn == null && body.transferAmount == null) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: "missing transfer amount" });
  }
});

export type SePayWebhookBody = z.infer<typeof baseSchema>;

/**
 * Nhận diện webhook sự kiện (liên kết / gỡ liên kết tài khoản).
 *
 * Payload này không phải giao dịch nên không có mã giao dịch lẫn số tiền. Ta nhận
 * diện theo đặc điểm thiếu field, thay vì đoán tên field sự kiện, để không vô
 * tình nuốt mất giao dịch thật khi SePay đổi tên field.
 */
export function isSePayEventEnvelope(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  const candidate = payload as Record<string, unknown>;
  const hasTransactionShape =
    candidate.id !== undefined ||
    candidate.transaction_id !== undefined ||
    candidate.amount !== undefined ||
    candidate.transferAmount !== undefined ||
    candidate.amountIn !== undefined;
  if (hasTransactionShape) return false;
  return (
    typeof candidate.type === "string" || typeof candidate.event === "string"
  );
}

function firstString(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function firstNumber(...values: (number | null | undefined)[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

const CREDIT_VALUES = new Set(["credit", "in", "incoming"]);
const DEBIT_VALUES = new Set(["debit", "out", "outgoing"]);

/**
 * Chỉ giao dịch tiền VÀO mới mở khoá đơn; giao dịch tiền ra bị bỏ qua.
 *
 * SePay dùng `credit`/`debit` ở IPN và `in`/`out` ở transaction webhook, nên
 * phải kiểm tra CẢ HAI field. Payload không nêu loại giao dịch thì mặc định là
 * tiền vào, vì webhook chỉ được cấu hình cho tài khoản nhận tiền.
 */
export function isCreditTransfer(
  ...values: (string | null | undefined)[]
): boolean {
  const declared = values.map((value) => value?.trim().toLowerCase()).filter(Boolean);
  if (declared.length === 0) return true;
  if (declared.some((value) => DEBIT_VALUES.has(value ?? ""))) return false;
  return declared.some((value) => CREDIT_VALUES.has(value ?? ""));
}

export function normalizeSePayWebhook(
  body: SePayWebhookBody,
  rawPayload: Record<string, unknown>,
): VerifiedWebhookEvent {
  // Schema đã chặn các trường bắt buộc ở boundary; các nhánh lỗi dưới đây là
  // lưới an toàn cho mọi caller gọi thẳng hàm này.
  const transactionId = firstString(
    body.transaction_id,
    body.id === null || body.id === undefined ? undefined : String(body.id),
  );
  if (!transactionId) {
    throw new ValidationError("SePay webhook is missing a transaction identifier");
  }

  const gateway = firstString(body.gateway) ?? "UNKNOWN";
  const accountNumber = firstString(body.account_number, body.accountNumber);
  if (!accountNumber) {
    throw new ValidationError("SePay webhook is missing the destination account number");
  }

  const amountIn = firstNumber(body.amount, body.transferAmount, body.amountIn);
  if (amountIn === null) {
    throw new ValidationError("SePay webhook is missing the transfer amount");
  }

  return {
    // transaction_id là khoá chống trùng chuẩn mà SePay khuyến nghị ("kiểm tra
    // transaction_id trước khi xử lý IPN"); transaction webhook không có field
    // này nên fallback về `id` — cùng một giá trị qua mọi lần retry.
    providerEventId: transactionId,
    gateway,
    accountNumber,
    subAccount: firstString(body.va, body.subAccount),
    amountIn,
    accumulated: firstNumber(body.accumulated),
    code: firstString(body.payment_code, body.code),
    content: firstString(body.content),
    transferType: isCreditTransfer(body.transfer_type, body.transferType) ? "credit" : "debit",
    referenceNumber: firstString(body.reference_code, body.referenceNumber),
    referenceCode: firstString(body.bank_account_xid, body.referenceCode),
    description: firstString(body.description),
    // Luôn quy về ISO-8601 UTC: cột `transactionDate` trong DB là timestamptz,
    // lưu chuỗi "Y-m-d H:i:s" của SePay sẽ bị Postgres hiểu sai múi giờ.
    transactionDate: normalizeSePayTransactionDate(
      firstString(body.transaction_date, body.transactionDate),
    ),
    rawPayload,
  };
}
