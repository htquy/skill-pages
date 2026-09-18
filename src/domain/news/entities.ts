import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import type { AIToolRef } from "@/src/domain/skill/entities";

export type NewsStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface NewsCategoryRef {
  slug: string;
  name: string;
}

export interface NewsArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  sourceName: string;
  publishedAt: Date | null;
  category: NewsCategoryRef | null;
  tools: AIToolRef[];
  readingMinutes: number;
}

export interface NewsArticleDetail extends NewsArticleSummary {
  content: string;
  sourceUrl: string | null;
  related: NewsArticleSummary[];
}

export interface NewsFilters {
  category?: string;
}

export interface NewsArticleRepository {
  findFeatured(limit: number): Promise<NewsArticleSummary[]>;
  list(filters: NewsFilters, pagination: Pagination): Promise<PaginatedResult<NewsArticleSummary>>;
  findBySlug(slug: string): Promise<NewsArticleDetail | null>;
  listCategories(): Promise<NewsCategoryRef[]>;
}