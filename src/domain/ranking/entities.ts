export type RankingPeriodType = "WEEK" | "MONTH" | "QUARTER" | "ALL_TIME";

export interface RankingFilters {
  industry?: string;
  category?: string;
  periodType?: RankingPeriodType;
}

export interface RankingEntryView {
  rank: number;
  score: number;
  views: number;
  favorites: number;
  clicks: number;
  tool: {
    slug: string;
    name: string;
    description: string | null;
    websiteUrl: string | null;
    logoUrl: string | null;
  };
}

export interface RankingView {
  id: string;
  slug: string;
  name: string;
  periodType: RankingPeriodType;
  periodLabel: string;
  industry: { slug: string; name: string } | null;
  category: { slug: string; name: string } | null;
  entries: RankingEntryView[];
}

export interface RankingPeriodOption {
  value: RankingPeriodType;
  label: string;
}

export interface RankingRepository {
  get(filters: RankingFilters): Promise<RankingView | null>;
  listPeriodOptions(): Promise<RankingPeriodOption[]>;
  listLatest(filters: RankingFilters): Promise<RankingView[]>;
}