import type { RankingFilters, RankingRepository, RankingView } from "@/src/domain/ranking/entities";

export interface RankingDeps {
  rankings: RankingRepository;
}

export function createRankingQueries(deps: RankingDeps) {
  return {
    get(filters: RankingFilters): Promise<RankingView | null> {
      return deps.rankings.get(filters);
    },

    list(filters: RankingFilters): Promise<RankingView[]> {
      return deps.rankings.listLatest(filters);
    },

    listPeriodOptions(): Promise<RankingView["periodType"][]> {
      return deps.rankings.listPeriodOptions().then((options) => options.map((o) => o.value));
    },
  };
}