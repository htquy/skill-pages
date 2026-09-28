import type { Prisma } from "@prisma/client";
import type { ToolPriceInfo, ToolVersionInfo } from "@/src/domain/tool";

/**
 * `config` là JSON tự do nên mọi lần đọc phải kiểm tra lại kiểu dữ liệu.
 * Repo giữ nguyên JSON trong DB, chỉ chuẩn hoá sang object ở biên domain.
 */
export function readConfigObject(config: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (config === null || typeof config !== "object" || Array.isArray(config)) return null;
  return config as Record<string, unknown>;
}

/** URL mở app cho tool loại WEB_APP, lưu trong `config.appUrl`. */
export function readAppUrl(config: Prisma.JsonValue | null): string | null {
  const parsed = readConfigObject(config);
  const value = parsed?.appUrl;
  return typeof value === "string" && value ? value : null;
}

export function toPriceInfo(price: {
  currency: string;
  amount: number;
  durationDays: number;
}): ToolPriceInfo {
  return {
    currency: price.currency,
    amount: price.amount,
    durationDays: price.durationDays,
  };
}

export function toVersionInfo(
  version:
    | {
        versionCode: string;
        changelog: string | null;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: bigint | null;
        scriptUrl: string | null;
      }
    | undefined,
): ToolVersionInfo | null {
  if (!version) return null;
  return {
    versionCode: version.versionCode,
    changelog: version.changelog,
    fileUrl: version.fileUrl,
    fileName: version.fileName,
    fileSize: version.fileSize === null ? null : Number(version.fileSize),
    scriptUrl: version.scriptUrl,
  };
}
