import { Prisma } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type { ToolDetail, ToolListFilters, ToolRepository, ToolSummary } from "@/src/domain/tool";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import {
  readAppUrl,
  readConfigObject,
  toPriceInfo,
  toVersionInfo,
} from "@/src/infrastructure/repositories/prisma-tool-mapper";

const listInclude = {
  prices: { where: { isActive: true }, orderBy: { amount: "asc" }, take: 1 },
  versions: { where: { isLatest: true }, take: 1 },
} satisfies Prisma.ToolInclude;

type ToolWithList = Prisma.ToolGetPayload<{ include: typeof listInclude }>;

function toSummary(tool: ToolWithList): ToolSummary {
  return {
    id: tool.id,
    slug: tool.slug,
    title: tool.title,
    shortDescription: tool.shortDescription,
    type: tool.type,
    billingType: tool.billingType,
    coverImageUrl: tool.coverImageUrl,
    appUrl: readAppUrl(tool.config),
    lowestPrice: tool.prices[0] ? toPriceInfo(tool.prices[0]) : null,
    latestVersion: tool.versions[0]?.versionCode ?? null,
  };
}

export const prismaToolRepository: ToolRepository = {
  async list(filters: ToolListFilters, pagination: Pagination) {
    const where: Prisma.ToolWhereInput = { status: "PUBLISHED" };
    if (filters.type) where.type = filters.type;
    if (filters.billingType) where.billingType = filters.billingType;
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: "insensitive" } },
        { shortDescription: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        include: listInclude,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.tool.count({ where }),
    ]);

    const result: PaginatedResult<ToolSummary> = {
      items: rows.map(toSummary),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    };
    return result;
  },

  async findBySlug(slug) {
    const tool = await prisma.tool.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        prices: { where: { isActive: true }, orderBy: [{ durationDays: "asc" }, { amount: "asc" }] },
        versions: { where: { isLatest: true }, take: 1 },
      },
    });
    if (!tool) return null;

    const detail: ToolDetail = {
      ...toSummary({
        ...tool,
        prices: tool.prices.slice(0, 1),
        versions: tool.versions,
      }),
      description: tool.description,
      videoDemoUrl: tool.videoDemoUrl,
      config: readConfigObject(tool.config),
      version: toVersionInfo(tool.versions[0]),
      prices: tool.prices.map(toPriceInfo),
      publishedAt: tool.publishedAt,
    };
    return detail;
  },
};
