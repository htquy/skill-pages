/**
 * OrderCode — Value Object sinh mã đơn hàng.
 *
 * Mã đơn hàng là "hợp đồng" giữa hệ thống và nội dung chuyển khoản ngân hàng:
 * nó được nhúng vào QR (VietQR `addInfo`) và người dùng có thể gõ tay. Vì vậy
 * mã phải thỏa 4 ràng buộc:
 *
 * 1. Đúng cấu trúc `SKILL-[customer_id]-[product_id]` để đối soát bằng mắt thường.
 * 2. Ngắn (<= 25 ký tự) để mọi ứng dụng ngân hàng / MoMo nhận trọn nội dung.
 * 3. Chỉ dùng ký tự [0-9A-Z] và không có ký tự dễ nhầm (0/O, 1/I/L) để khách
 *    gõ tay không sai.
 * 4. Duy nhất toàn cục — một khách có thể mua lại cùng một skill nhiều lần, nên
 *    ngoài 2 đoạn định danh vẫn cần hậu tố ngẫu nhiên. Hậu tố này KHÔNG phải
 *    nguồn xác thực bảo mật: tính xác thực luôn do unique index + webhook.
 */
export const ProductType = {
  SKILL: "SKILL",
} as const;

export type ProductTypeValue = (typeof ProductType)[keyof typeof ProductType];

const PRODUCT_LABELS: Readonly<Record<ProductTypeValue, string>> = {
  [ProductType.SKILL]: "SKILL",
};

/** Số ký tự tối đa mà nội dung chuyển khoản ngân hàng chấp nhận an toàn. */
export const ORDER_CODE_MAX_LENGTH = 25;

const ID_SEGMENT = "[0-9A-Z]{6}";
const SUFFIX_SEGMENT = "[0-9A-Z]{4}";
const PRODUCT_PATTERN = Object.values(PRODUCT_LABELS).join("|");
const STRUCTURE = `${PRODUCT_PATTERN}-${ID_SEGMENT}-${ID_SEGMENT}-${SUFFIX_SEGMENT}`;
const FLEXIBLE_STRUCTURE = `(${PRODUCT_PATTERN})-?(${ID_SEGMENT})-?(${ID_SEGMENT})-?(${SUFFIX_SEGMENT})`;

/** Regex trích xuất mã đơn ra khỏi nội dung chuyển khoản tự do (chấp nhận cả khi bị mất dấu -). */
const EXTRACT_PATTERN = new RegExp(FLEXIBLE_STRUCTURE, "i");

/** Regex kiểm tra mã đơn đúng chuẩn (dùng khi validate nội dung webhook). */
const VALIDATION_PATTERN = new RegExp(`^${STRUCTURE}$`, "i");

/** Bảng chữ cái loại bỏ ký tự dễ nhầm: không có 0, O, 1, I. */
const SUFFIX_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function idSegment(id: string): string {
  return id.replace(/[^0-9a-zA-Z]/g, "").toUpperCase().slice(0, 6).padStart(6, "0");
}

function randomSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length]).join("");
}

/** Sinh mã đơn mới: `SKILL-1A2B3C-4D5E6F-7H2K` (customer trước, product sau). */
export function createOrderCode(
  productType: ProductTypeValue,
  productId: string,
  customerId: string,
): string {
  const code = `${PRODUCT_LABELS[productType]}-${idSegment(customerId)}-${idSegment(productId)}-${randomSuffix(4)}`;
  return code.slice(0, ORDER_CODE_MAX_LENGTH);
}

/** Kiểm tra mã đơn có đúng cấu trúc hay không. */
export function isOrderCode(value: string): boolean {
  return VALIDATION_PATTERN.test(value);
}

/**
 * Trích mã đơn ra khỏi nội dung chuyển khoản.
 *
 * Nội dung do khách gõ rất linh hoạt: "SKILL-1A2B3C-4D5E6F-7H2K", "thanh toan
 * SKILLFBD3B46318E7XU2W don hang", hoặc bị app ngân hàng xóa bớt dấu gạch ngang.
 * Vì vậy ta hỗ trợ trích xuất linh hoạt và chuẩn hóa về dạng `SKILL-XXXXXX-YYYYYY-ZZZZ`.
 */
export function extractOrderCode(content: string | null | undefined): string | null {
  if (!content) return null;
  const match = EXTRACT_PATTERN.exec(content);
  if (!match) return null;

  const [, prefix, part1, part2, part3] = match;
  return `${prefix.toUpperCase()}-${part1.toUpperCase()}-${part2.toUpperCase()}-${part3.toUpperCase()}`;
}
