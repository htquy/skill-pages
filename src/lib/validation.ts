import { z } from "zod";

export const skillFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  industry: z.string().trim().max(64).optional(),
  category: z.string().trim().max(64).optional(),
  useCase: z.string().trim().max(64).optional(),
  tool: z.string().trim().max(64).optional(),
  access: z.enum(["FREE", "PAID"]).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(24).optional().default(12),
});

export const newsFiltersSchema = z.object({
  category: z.string().trim().max(64).optional(),
});

export const toolFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  type: z.enum(["DOWNLOADABLE", "EMBED_WIDGET", "MCP_SERVER", "WEB_APP"]).optional(),
  billing: z.enum(["FREE", "ONE_TIME", "SUBSCRIPTION"]).optional(),
});

export const rankingFiltersSchema = z.object({
  industry: z.string().trim().max(64).optional(),
  category: z.string().trim().max(64).optional(),
  period: z.enum(["WEEK", "MONTH", "QUARTER", "ALL_TIME"]).optional(),
});

export type SkillFiltersInput = z.infer<typeof skillFiltersSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type NewsFiltersInput = z.infer<typeof newsFiltersSchema>;
export type ToolFiltersInput = z.infer<typeof toolFiltersSchema>;
export type RankingFiltersInput = z.infer<typeof rankingFiltersSchema>;

export const toggleFavoriteSchema = z.object({
  skillSlug: z.string().trim().min(1).max(180),
});

export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;

// ---------------------------------------------------------------------------
// Upload R2
// ---------------------------------------------------------------------------

/** Ngưỡng chuyển sang multipart: file nhỏ dùng presigned PUT một lần. */
export const R2_MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;

/** S3 yêu cầu part >= 5MB, chọn 10MB để tải video ổn định. */
export const R2_PART_SIZE_BYTES = 10 * 1024 * 1024;

export const R2_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

export const R2_MAX_PARTS = 10_000;

export const R2_ALLOWED_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Gói công cụ tải về (EXE, DMG, ZIP, script…) là tệp nhị phân nên không thể
 * khoanh vùng bằng content-type: trình duyệt gửi `application/octet-stream`
 * cho phần lớn định dạng. Vì vậy ta kiểm tra cả content-type lẫn phần mở rộng,
 * và chỉ admin mới gọi được endpoint này.
 */
export const R2_ALLOWED_TOOL_FILE_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-msdownload",
  "application/vnd.microsoft.portable-executable",
  "application/x-msi",
  "application/x-executable",
  "application/x-apple-diskimage",
  "application/vnd.apple.installer+xml",
  "application/x-debian-package",
  "application/vnd.debian.binary-package",
  "application/x-rpm",
  "application/javascript",
  "text/javascript",
  "application/x-sh",
  "text/x-python",
  "text/x-shellscript",
  "application/json",
  "text/yaml",
  "text/plain",
  "application/octet-stream",
] as const;

export const R2_TOOL_FILE_EXTENSIONS = [
  "zip",
  "gz",
  "tgz",
  "tar",
  "7z",
  "rar",
  "exe",
  "msi",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "appimage",
  "js",
  "mjs",
  "cjs",
  "ts",
  "py",
  "sh",
  "ps1",
  "json",
  "yaml",
  "yml",
  "txt",
] as const;

export const R2_UPLOAD_KINDS = ["media", "tool-file"] as const;

export type R2UploadKind = (typeof R2_UPLOAD_KINDS)[number];

/** Mỗi loại tệp nằm ở prefix riêng để dễ dọn dẹp và hạn chế quyền đọc. */
export const R2_UPLOAD_PREFIXES: Record<R2UploadKind, string> = {
  media: "skill-videos",
  "tool-file": "tool-files",
};

function fileExtensionOf(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match ? match[1].toLowerCase() : "";
}

const uploadBaseSchema = {
  kind: z.enum(R2_UPLOAD_KINDS).optional().default("media"),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(120),
  size: z.number().int().positive().max(R2_MAX_FILE_SIZE_BYTES),
};

function refineUpload(
  value: { kind: R2UploadKind; fileName: string; contentType: string },
  ctx: z.RefinementCtx,
) {
  if (value.kind === "media") {
    if (!(R2_ALLOWED_CONTENT_TYPES as readonly string[]).includes(value.contentType)) {
      ctx.addIssue({ code: "custom", message: "unsupported-content-type", path: ["contentType"] });
    }
    return;
  }
  const contentTypeOk = (R2_ALLOWED_TOOL_FILE_CONTENT_TYPES as readonly string[]).includes(
    value.contentType,
  );
  const extensionOk = (R2_TOOL_FILE_EXTENSIONS as readonly string[]).includes(
    fileExtensionOf(value.fileName),
  );
  if (!contentTypeOk || !extensionOk) {
    ctx.addIssue({ code: "custom", message: "unsupported-content-type", path: ["contentType"] });
  }
}

export const r2PresignSchema = z
  .object({
    ...uploadBaseSchema,
    size: z.number().int().positive().max(R2_MULTIPART_THRESHOLD_BYTES - 1),
  })
  .superRefine(refineUpload);

export const r2MultipartInitSchema = z.object(uploadBaseSchema).superRefine(refineUpload);

export const r2MultipartCompleteSchema = z.object({
  key: z.string().trim().min(1).max(400),
  uploadId: z.string().trim().min(1).max(400),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1).max(R2_MAX_PARTS),
        etag: z.string().trim().min(1).max(200),
      }),
    )
    .min(1)
    .max(R2_MAX_PARTS),
});

export const r2MultipartAbortSchema = z.object({
  key: z.string().trim().min(1).max(400),
  uploadId: z.string().trim().min(1).max(400),
});

export type R2PresignInput = z.infer<typeof r2PresignSchema>;
export type R2MultipartInitInput = z.infer<typeof r2MultipartInitSchema>;
export type R2MultipartCompleteInput = z.infer<typeof r2MultipartCompleteSchema>;
export type R2MultipartAbortInput = z.infer<typeof r2MultipartAbortSchema>;