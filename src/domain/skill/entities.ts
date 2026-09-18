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

export interface SkillSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  accessType: SkillAccessType;
  coverImageUrl: string | null;
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
}