export type RequiredServerVar = "DATABASE_URL";

export function getServerEnv(name: RequiredServerVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  return process.env[name];
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

/**
 * Cấu hình tích hợp SePay (BankHub) + VietQR.
 *
 * Toàn bộ biến môi trường liên quan thanh toán nằm ở đây để không rò rỉ secret
 * ra ngoài và để test có thể thay thế cấu hình.
 */
export interface SePayConfig {
  /** API key SePay dùng cho cả đăng ký webhook lẫn xác thực request inbound. */
  apiKey: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  /** Endpoint tạo ảnh QR động của VietQR. */
  vietQrEndpoint: string;
  /** Tài khoản nhận tiền phải khớp tuyệt đối với accountNumber trong webhook. */
  expectedAccountNumber: string;
}

const DEFAULTS = {
  bankCode: "MB",
  vietQrEndpoint: "https://api.vietqr.io/v2/create",
} as const;

export function isSePayConfigured(): boolean {
  return Boolean(process.env.SEPAY_API_KEY && process.env.SEPAY_ACCOUNT_NUMBER);
}

export function getSePayConfig(): SePayConfig {
  const apiKey = process.env.SEPAY_API_KEY;
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
  if (!apiKey) {
    throw new Error("Missing required environment variable: SEPAY_API_KEY");
  }
  if (!accountNumber) {
    throw new Error("Missing required environment variable: SEPAY_ACCOUNT_NUMBER");
  }
  return {
    apiKey,
    accountNumber,
    bankCode: process.env.SEPAY_BANK_CODE ?? DEFAULTS.bankCode,
    accountName: process.env.SEPAY_ACCOUNT_NAME ?? "PROMPTWORKS",
    vietQrEndpoint: process.env.SEPAY_VIETQR_ENDPOINT ?? DEFAULTS.vietQrEndpoint,
    expectedAccountNumber:
      process.env.SEPAY_EXPECTED_ACCOUNT_NUMBER ?? process.env.SEPAY_ACCOUNT_NUMBER ?? "",
  };
}

/**
 * Cấu hình Cloudflare R2 (S3-compatible) dùng cho upload video demo.
 * Endpoint được suy ra từ account id: `https://<account>.r2.cloudflarestorage.com`.
 */
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Domain public phục vụ file (r2.dev hoặc custom domain). */
  publicUrl: string;
  endpoint: string;
}

const R2_REQUIRED_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

export function isR2Configured(): boolean {
  return R2_REQUIRED_VARS.every((name) => Boolean(process.env[name]));
}

export function getR2Config(): R2Config {
  const values = R2_REQUIRED_VARS.map((name) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  });

  const [accountId, accessKeyId, secretAccessKey, bucket, publicUrl] = values as [
    string,
    string,
    string,
    string,
    string,
  ];

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: publicUrl.replace(/\/+$/, ""),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}
