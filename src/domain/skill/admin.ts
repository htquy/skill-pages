import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import type { SkillAccessType, SkillStatus } from "./entities";

export interface SkillAdminSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  accessType: SkillAccessType;
  status: SkillStatus;
  price: { currency: string; amount: number } | null;
  viewCount: number;
  favoriteCount: number;
  ratingAverage: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillAdminDetail {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  accessType: SkillAccessType;
  status: SkillStatus;
  coverImageUrl: string | null;
  authorId: string | null;
  publishedAt: Date | null;
  price: { currency: string; amount: number } | null;
  content: string;
  instructions: string | null;
  variables: Record<string, unknown> | null;
  changelog: string | null;
  version: number;
  industrySlugs: string[];
  categorySlugs: string[];
  useCaseSlugs: string[];
  toolSlugs: string[];
}

export interface SaveSkillData {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  accessType: SkillAccessType;
  coverImageUrl?: string | null;
  price?: { currency: string; amount: number } | null;
  content: string;
  instructions?: string | null;
  variables?: Record<string, unknown> | null;
  changelog?: string | null;
  industrySlugs: string[];
  categorySlugs: string[];
  useCaseSlugs: string[];
  toolSlugs: string[];
}

export interface SkillAdminRepository {
  list(filters: { q?: string; status?: SkillStatus; accessType?: SkillAccessType }, pagination: Pagination): Promise<PaginatedResult<SkillAdminSummary>>;
  findById(id: string): Promise<SkillAdminDetail | null>;
  create(data: SaveSkillData, authorId: string): Promise<string>;
  update(id: string, data: SaveSkillData): Promise<void>;
  delete(id: string): Promise<void>;
  setStatus(id: string, status: SkillStatus): Promise<void>;
  countAll(): Promise<number>;
  countPublished(): Promise<number>;
}