import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export type ToolType = "DOWNLOADABLE" | "EMBED_WIDGET" | "MCP_SERVER" | "WEB_APP";
export type ToolBillingType = "FREE" | "ONE_TIME" | "SUBSCRIPTION";
export type ToolStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ToolPriceInfo {
  currency: string;
  /** Số tiền ở đơn vị nhỏ, dùng chung với `formatMoney`. */
  amount: number;
  /** 30 = theo tháng, 365 = theo năm, 0 = vĩnh viễn. */
  durationDays: number;
}

export interface ToolVersionInfo {
  versionCode: string;
  changelog: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  scriptUrl: string | null;
}

export interface ToolSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  type: ToolType;
  billingType: ToolBillingType;
  coverImageUrl: string | null;
  appUrl: string | null;
  lowestPrice: ToolPriceInfo | null;
  latestVersion: string | null;
}

export interface ToolDetail extends ToolSummary {
  description: string;
  videoDemoUrl: string | null;
  config: Record<string, unknown> | null;
  version: ToolVersionInfo | null;
  prices: ToolPriceInfo[];
  publishedAt: Date | null;
}

export interface ToolListFilters {
  q?: string;
  type?: ToolType;
  billingType?: ToolBillingType;
}

export interface ToolRepository {
  list(filters: ToolListFilters, pagination: Pagination): Promise<PaginatedResult<ToolSummary>>;
  findBySlug(slug: string): Promise<ToolDetail | null>;
}
