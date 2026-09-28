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
  create(data: SaveToolData): Promise<string>;
  update(id: string, data: SaveToolData): Promise<void>;
  delete(id: string): Promise<void>;
  setStatus(id: string, status: ToolStatus): Promise<void>;
  countAll(): Promise<number>;
  countPublished(): Promise<number>;
}
