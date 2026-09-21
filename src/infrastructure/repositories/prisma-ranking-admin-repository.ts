import { prisma } from "@/src/infrastructure/database/prisma";
import { slugify } from "@/src/lib/utils";
import type {
  RankingAdminDetail,
  RankingAdminRepository,
  RankingAdminSummary,
  RankingStatus,
} from "@/src/domain/ranking/admin";
import type { RankingPeriodType } from "@/src/domain/ranking/entities";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

const SCORE_WEIGHTS = { views: 1, favorites: 8, clicks: 4 } as const;

export const prismaRankingAdminRepository: RankingAdminRepository = {
  async list(pagination) {
    const [rows, total] = await Promise.all([
      prisma.ranking.findMany({
        include: {
          industry: { select: { name: true } },
          category: { select: { name: true } },
          _count: { select: { entries: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.ranking.count(),
    ]);
    const items: RankingAdminSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      periodType: row.periodType,
      industryName: row.industry?.name ?? null,
      categoryName: row.category?.name ?? null,
      status: row.status as RankingStatus,
      entryCount: row._count.entries,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    return toPaginated(items, total, pagination);
  },

  async findById(id) {
    const ranking = await prisma.ranking.findUnique({
      where: { id },
      include: {
        entries: { include: { tool: { select: { slug: true, name: true } } }, orderBy: { rank: "asc" } },
      },
    });
    if (!ranking) return null;
    return {
      id: ranking.id,
      name: ranking.name,
      slug: ranking.slug,
      industryId: ranking.industryId,
      categoryId: ranking.categoryId,
      periodType: ranking.periodType,
      periodStart: ranking.periodStart,
      periodEnd: ranking.periodEnd,
      status: ranking.status as RankingStatus,
      createdAt: ranking.createdAt,
      updatedAt: ranking.updatedAt,
      entries: ranking.entries.map((e) => ({
        rank: e.rank,
        toolSlug: e.tool.slug,
        toolName: e.tool.name,
        score: Number(e.score),
      })),
    } satisfies RankingAdminDetail;
  },

  async create(data) {
    const ranking = await prisma.ranking.create({
      data: {
        name: data.name,
        slug: data.slug || slugify(data.name),
        industryId: data.industryId,
        categoryId: data.categoryId,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        status: "DRAFT",
      },
    });
    return ranking.id;
  },

  async update(id, data) {
    await prisma.ranking.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug || slugify(data.name),
        industryId: data.industryId,
        categoryId: data.categoryId,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });
  },

  async delete(id) {
    await prisma.ranking.delete({ where: { id } });
  },

  async setStatus(id, status) {
    await prisma.ranking.update({ where: { id }, data: { status } });
  },

  async calculateScore(id) {
    const ranking = await prisma.ranking.findUnique({ where: { id } });
    if (!ranking) throw new Error("Ranking not found");

    const periodStart = ranking.periodStart ?? new Date(0);
    const periodEnd = ranking.periodEnd ?? new Date();

    const [views, favorites, clicks] = await Promise.all([
      prisma.skillView.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        include: { skill: { include: { tools: { include: { tool: true } } } } },
      }),
      prisma.skillFavorite.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        include: { skill: { include: { tools: { include: { tool: true } } } } },
      }),
      prisma.toolClick.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        include: { tool: { select: { slug: true, name: true } } },
      }),
    ]);

    const stats = new Map<string, { slug: string; name: string; views: number; favorites: number; clicks: number }>();
    const touch = (slug: string, name: string) => {
      const current = stats.get(slug);
      if (!current) stats.set(slug, { slug, name, views: 0, favorites: 0, clicks: 0 });
    };

    for (const view of views) {
      for (const link of view.skill.tools) {
        touch(link.tool.slug, link.tool.name);
        stats.get(link.tool.slug)!.views += 1;
      }
    }
    for (const favorite of favorites) {
      for (const link of favorite.skill.tools) {
        touch(link.tool.slug, link.tool.name);
        stats.get(link.tool.slug)!.favorites += 1;
      }
    }
    for (const click of clicks) {
      touch(click.tool.slug, click.tool.name);
      stats.get(click.tool.slug)!.clicks += 1;
    }

    if (stats.size === 0) {
      return prisma.rankingEntry.count({ where: { rankingId: id } });
    }

    const entries = Array.from(stats.values())
      .map((tool) => ({
        toolId: tool.slug,
        score: tool.views * SCORE_WEIGHTS.views + tool.favorites * SCORE_WEIGHTS.favorites + tool.clicks * SCORE_WEIGHTS.clicks,
        views: tool.views,
        favorites: tool.favorites,
        clicks: tool.clicks,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    await prisma.$transaction([
      prisma.rankingEntry.deleteMany({ where: { rankingId: id } }),
      prisma.rankingEntry.createMany({
        data: entries.map((entry) => ({
          rankingId: id,
          toolId: entry.toolId,
          rank: entry.rank,
          score: entry.score,
          views: entry.views,
          favorites: entry.favorites,
          clicks: entry.clicks,
        })),
      }),
    ]);

    return entries.length;
  },

  async countPublished() {
    return prisma.ranking.count({ where: { status: "PUBLISHED" } });
  },
};

export const RANKING_PERIOD_TYPES: RankingPeriodType[] = ["WEEK", "MONTH", "QUARTER", "ALL_TIME"];
