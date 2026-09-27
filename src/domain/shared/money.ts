/**
 * Money — Value Object dùng chung cho toàn bộ module Commerce.
 *
 * Quy ước lưu trữ trong database: số tiền LUÔN được lưu theo "đơn vị nhỏ nhất"
 * (minor unit) của từng loại tiền tệ. Tuy nhiên VND/JPY/KRW không có đơn vị
 * nhỏ nhất trong thực tế chuyển khoản ngân hàng (1 VND = 1 đơn vị), nên nếu
 * áp dụng chung một hệ số 100 cho mọi loại tiền tệ thì số tiền hiển thị và số
 * tiền thực chuyển khoản sẽ lệch nhau 100 lần — nguyên nhân kinh điển của bug
 * "QR báo 49.000 nhưng đơn là 490.000".
 *
 * Vì vậy toàn bộ quy đổi minor <-> major PHẢI đi qua value object này, tuyệt đối
 * không hard-code `* 100` hay `/ 100` rải rác trong code.
 */
const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = {
  VND: 0,
  JPY: 0,
  KRW: 0,
  CLP: 0,
  ISK: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AUD: 2,
  CAD: 2,
  SGD: 2,
};

const DEFAULT_EXPONENT = 2;

/** Số chữ số thập phân của đơn vị nhỏ nhất. VND => 0, USD => 2. */
export function currencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? DEFAULT_EXPONENT;
}

function factor(currency: string): number {
  return 10 ** currencyExponent(currency);
}

/** Làm tròn về đơn vị nhỏ nhất, tránh lỗi số thực (0.1 + 0.2). */
function roundTo(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

/** 9.5 USD (major) => 950 (minor). 49000 VND (major) => 49000 (minor). */
export function toMinorUnits(majorAmount: number, currency: string): number {
  const exponent = currencyExponent(currency);
  return roundTo(majorAmount * factor(currency), exponent);
}

/** 950 USD (minor) => 9.5 (major). 49000 VND (minor) => 49000 (major). */
export function toMajorUnits(minorAmount: number, currency: string): number {
  const exponent = currencyExponent(currency);
  return roundTo(minorAmount / factor(currency), exponent);
}

/** Định dạng tiền để hiển thị từ giá trị minor trong database. */
export function formatMoney(
  minorAmount: number,
  currency: string,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: currencyExponent(currency),
  }).format(toMajorUnits(minorAmount, currency));
}

/**
 * So khớp số tiền ngân hàng báo với giá trị đơn hàng trong database.
 * Ngân hàng báo số tiền theo đơn vị lớn (VND: 49000, USD: 9.5), order lưu theo
 * minor — nên so sánh ở cùng một đơn vị, tuyệt đối không so thẳng hai số.
 */
export function matchesAmount(
  orderAmountMinor: number,
  orderCurrency: string,
  transferredMajor: number,
): boolean {
  const exponent = currencyExponent(orderCurrency);
  return toMajorUnits(orderAmountMinor, orderCurrency) === roundTo(transferredMajor, exponent);
}
