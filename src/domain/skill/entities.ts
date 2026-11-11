import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export type SkillAccessType = "FREE" | "PAID";
export type SkillStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface TaxonomyRef {
  slug: string;
  name: string;
}

export interface AIToolRef {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export interface SkillTranslation {
  title?: string;
  shortDescription?: string;
  description?: string;
}

/** Bản dịch theo mã ngôn ngữ, VD { vi: { shortDescription } }. Cột chính của skill là tiếng Anh. */
export type SkillTranslations = Record<string, SkillTranslation>;

/** Một file trong thư mục skill trên R2 (r2Key = r2Prefix + path). */
export interface SkillAssetInfo {
  path: string;
  r2Key: string;
  kind: string;
  contentType: string | null;
  sizeBytes: number;
  /** URL công khai = R2_PUBLIC_URL + "/" + r2Key (null nếu chưa cấu hình R2_PUBLIC_URL). */
  url: string | null;
}

export interface SkillSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  accessType: SkillAccessType;
  coverImageUrl: string | null;
  videoDemoUrl: string | null;
  translations: SkillTranslations | null;
  /** Giá đang bán (null với skill miễn phí). */
  price: SkillPriceInfo | null;
  viewCount: number;
  favoriteCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  industries: TaxonomyRef[];
  categories: TaxonomyRef[];
  useCases: TaxonomyRef[];
  tools: AIToolRef[];
}

export interface SkillPriceInfo {
  currency: string;
  amount: number;
}

export interface SkillPurchaseInfo {
  id: string;
  slug: string;
  title: string;
  accessType: SkillAccessType;
  status: SkillStatus;
  price: SkillPriceInfo | null;
}

export interface SkillContent {
  id: string;
  slug: string;
  title: string;
  content: string;
  instructions: string | null;
  changelog: string | null;
  version: number;
}

export interface SkillDetail extends SkillSummary {
  description: string;
  content: string;
  instructions: string | null;
  variables: Record<string, unknown> | null;
  changelog: string | null;
  version: number;
  publishedAt: Date | null;
  authorName: string | null;
  prices: SkillPriceInfo[];
  /** Thư mục gốc trên R2 (kết thúc bằng "/"), null với skill nhập tay. */
  r2Prefix: string | null;
  assets: SkillAssetInfo[];
}

export interface SkillListFilters {
  q?: string;
  industry?: string;
  category?: string;
  useCase?: string;
  tool?: string;
  accessType?: SkillAccessType;
}

export interface SkillRepository {
  findFeatured(limit: number): Promise<SkillSummary[]>;
  search(filters: SkillListFilters, pagination: Pagination): Promise<PaginatedResult<SkillSummary>>;
  findSummariesByIds(ids: string[]): Promise<SkillSummary[]>;
  findBySlug(slug: string): Promise<SkillDetail | null>;
  findContentById(id: string): Promise<SkillContent | null>;
  findPurchaseInfoById(id: string): Promise<SkillPurchaseInfo | null>;
}