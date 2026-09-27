import { ORDER_CODE_MAX_LENGTH } from "@/src/domain/orders";
import { toMajorUnits } from "@/src/domain/shared";

export interface VietQrParams {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amountMajor: number;
  addInfo: string;
}

const MAX_ACCOUNT_NAME = 50;

/**
 * Dựng quicklink VietQR v2.
 *
 * VietQR nhận thông tin chuyển khoản qua query string rồi trả về ảnh QR đã
 * đóng khung sẵn cho app ngân hàng. Ba tham số bắt buộc phải khớp với đơn hàng:
 *
 * - `amount`  : số tiền CHÍNH XÁC, tính theo đơn vị lớn của currency (VND: 49000).
 * - `addInfo` : nội dung chuyển khoản = mã đơn, để webhook đối chiếu ngược lại.
 * - `account` : tài khoản nhận tiền, phải là tài khoản SePay đang theo dõi.
 */
export function buildVietQrUrl(endpoint: string, params: VietQrParams): string {
  const url = new URL(endpoint);
  url.searchParams.set("accountNumber", params.accountNumber);
  url.searchParams.set("accountName", params.accountName.slice(0, MAX_ACCOUNT_NAME));
  url.searchParams.set("bank", params.bankCode);
  url.searchParams.set("amount", String(params.amountMajor));
  url.searchParams.set("addInfo", params.addInfo.slice(0, ORDER_CODE_MAX_LENGTH));
  url.searchParams.set("template", "compact2");
  return url.toString();
}

/** Số tiền sẽ hiển thị/khoá trong QR, quy đổi từ giá trị lưu trong database. */
export function toQrAmount(amountMinor: number, currency: string): number {
  return toMajorUnits(amountMinor, currency);
}
