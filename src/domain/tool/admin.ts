import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import type { ToolBillingType, ToolPriceInfo, ToolStatus, ToolType, ToolVersionInfo } from "./entities";

export interface ToolAdminSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  type: ToolType;
  billingType: ToolBillingType;
  status: ToolStatus;
  coverImageUrl: string | null;
  appSlug: string | null;
  /** Đường dẫn khách dùng để tới sản phẩm (truy cập hoặc tải về); null = chưa đủ điều kiện hiển thị. */
  productUrl: string | null;
  price: ToolPriceInfo | null;
  latestVersion: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolAdminDetail {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  type: ToolType;
  billingType: ToolBillingType;
  status: ToolStatus;
  coverImageUrl: string | null;
  videoDemoUrl: string | null;
  appUrl: string | null;
  appSlug: string | null;
  productUrl: string | null;
  config: Record<string, unknown> | null;
  version: ToolVersionInfo | null;
  prices: ToolPriceInfo[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveToolPriceData {
  currency: string;
  amount: number;
  durationDays: number;
}

export interface SaveToolData {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  type: ToolType;
  billingType: ToolBillingType;
  coverImageUrl?: string | null;
  videoDemoUrl?: string | null;
  appUrl?: string | null;
  appSlug?: string | null;
  config?: Record<string, unknown> | null;
  prices: SaveToolPriceData[];
  versionCode: string;
  changelog?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  scriptUrl?: string | null;
}

export interface ToolAdminRepository {
  list(
    filters: { q?: string; status?: ToolStatus; type?: ToolType; billingType?: ToolBillingType },
    pagination: Pagination,
  ): Promise<PaginatedResult<ToolAdminSummary>>;
  findById(id: string): Promise<ToolAdminDetail | null>;
  /** Map appSlug -> trang giới thiệu (mọi trạng thái), để admin "Ứng dụng & gói" hiện liên kết ngược. */
  listByAppSlugs(appSlugs: string[]): Promise<Array<{ id: string; slug: string; title: string; status: ToolStatus; appSlug: string }>>;
  create(data: SaveToolData): Promise<string>;
  update(id: string, data: SaveToolData): Promise<void>;
  delete(id: string): Promise<void>;
  setStatus(id: string, status: ToolStatus): Promise<void>;
  countAll(): Promise<number>;
  countPublished(): Promise<number>;
  /** Số tool đã xuất bản theo từng loại (loại chưa có tool nào = 0). */
  countPublishedByType(): Promise<Record<ToolType, number>>;
}
