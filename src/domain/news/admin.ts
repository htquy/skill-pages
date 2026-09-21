import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import type { NewsStatus } from "./entities";

export interface NewsAdminSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  categoryName: string | null;
  status: NewsStatus;
  sourceName: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsAdminDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  sourceName: string;
  sourceUrl: string | null;
  status: NewsStatus;
  categoryId: string | null;
  categorySlug: string | null;
  toolSlugs: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveArticleData {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  sourceName: string;
  sourceUrl?: string | null;
  categorySlug?: string | null;
  toolSlugs: string[];
  publish: boolean;
}

export interface NewsAdminRepository {
  list(filters: { q?: string; status?: NewsStatus }, pagination: Pagination): Promise<PaginatedResult<NewsAdminSummary>>;
  findById(id: string): Promise<NewsAdminDetail | null>;
  create(data: SaveArticleData, actorUserId: string): Promise<string>;
  update(id: string, data: SaveArticleData): Promise<void>;
  delete(id: string): Promise<void>;
  setStatus(id: string, status: NewsStatus): Promise<void>;
  countPublished(): Promise<number>;
}

export interface NewsCategoryAdminRepository {
  listAll(): Promise<{ id: string; slug: string; name: string }[]>;
}