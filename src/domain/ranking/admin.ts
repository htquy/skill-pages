import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import type { RankingPeriodType } from "./entities";

export type RankingStatus = "DRAFT" | "PUBLISHED";

export interface RankingAdminSummary {
  id: string;
  name: string;
  slug: string;
  periodType: RankingPeriodType;
  industryName: string | null;
  categoryName: string | null;
  status: RankingStatus;
  entryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RankingAdminDetail {
  id: string;
  name: string;
  slug: string;
  industryId: string | null;
  categoryId: string | null;
  periodType: RankingPeriodType;
  periodStart: Date | null;
  periodEnd: Date | null;
  status: RankingStatus;
  entries: { rank: number; toolSlug: string; toolName: string; score: number }[];
}

export interface SaveRankingData {
  name: string;
  slug: string;
  industryId?: string | null;
  categoryId?: string | null;
  periodType: RankingPeriodType;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

export interface RankingAdminRepository {
  list(pagination: Pagination): Promise<PaginatedResult<RankingAdminSummary>>;
  findById(id: string): Promise<RankingAdminDetail | null>;
  create(data: SaveRankingData): Promise<string>;
  update(id: string, data: SaveRankingData): Promise<void>;
  delete(id: string): Promise<void>;
  setStatus(id: string, status: RankingStatus): Promise<void>;
  calculateScore(id: string): Promise<number>;
  countPublished(): Promise<number>;
}