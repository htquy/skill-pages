import { Prisma } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  RankingFilters,
  RankingPeriodType,
  RankingRepository,
  RankingView,
} from "@/src/domain/ranking/entities";

const PERIOD_LABELS: Record<RankingPeriodType, string> = {
  WEEK: "This week",
  MONTH: "This month",
  QUARTER: "This quarter",
  ALL_TIME: "All time",
};

type RankingWithRelations = Prisma.RankingGetPayload<{
  include: { entries: { include: { tool: true } }; industry: true; category: true };
}>;

function toView(ranking: RankingWithRelations): RankingView {
  return {
    id: ranking.id,
    slug: ranking.slug,
    name: ranking.name,
    periodType: ranking.periodType,
    periodLabel: PERIOD_LABELS[ranking.periodType],
    industry: ranking.industry
      ? { slug: ranking.industry.slug, name: ranking.industry.name }
      : null,
    category: ranking.category
      ? { slug: ranking.category.slug, name: ranking.category.name }
      : null,
    entries: ranking.entries
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((entry) => ({
        rank: entry.rank,
        score: Number(entry.score),
        views: Number(entry.views),
        favorites: Number(entry.favorites),
        clicks: Number(entry.clicks),
        tool: {
          slug: entry.tool.slug,
          name: entry.tool.name,
          description: entry.tool.description,
          websiteUrl: entry.tool.websiteUrl,
          logoUrl: entry.tool.logoUrl,
        },
      })),
  };
}

const includeEntries = {
  entries: {
    include: { tool: true },
    orderBy: { rank: "asc" as const },
  },
  industry: true,
  category: true,
} satisfies Prisma.RankingInclude;

function buildWhere(filters: RankingFilters): Prisma.RankingWhereInput {
  const where: Prisma.RankingWhereInput = { status: "PUBLISHED" };
  if (filters.industry) where.industry = { slug: filters.industry };
  if (filters.category) where.category = { slug: filters.category };
  if (filters.periodType) where.periodType = filters.periodType;
  return where;
}

export const prismaRankingRepository: RankingRepository = {
  async get(filters) {
    const ranking = await prisma.ranking.findFirst({
      where: buildWhere(filters),
      include: includeEntries,
      orderBy: { updatedAt: "desc" },
    });
    return ranking ? toView(ranking) : null;
  },

  async listPeriodOptions() {
    return (Object.entries(PERIOD_LABELS) as [RankingPeriodType, string][]).map(
      ([value, label]) => ({ value, label }),
    );
  },

  async listLatest(filters) {
    const rankings = await prisma.ranking.findMany({
      where: buildWhere(filters),
      include: includeEntries,
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    return rankings.map(toView);
  },
};