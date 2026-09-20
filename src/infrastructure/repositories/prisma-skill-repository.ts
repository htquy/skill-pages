import { Prisma, type SkillAccessType as PrismaSkillAccessType } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  Pagination,
  PaginatedResult,
  SkillAccessType,
  SkillDetail,
  SkillListFilters,
  SkillRepository,
  SkillSummary,
} from "@/src/domain/skill";

const summaryInclude = {
  industries: { include: { industry: true }, orderBy: { industryId: "asc" as const } },
  categories: { include: { category: true }, orderBy: { categoryId: "asc" as const } },
  useCases: { include: { useCase: true }, orderBy: { useCaseId: "asc" as const } },
  tools: { include: { tool: true }, orderBy: { toolId: "asc" as const } },
} satisfies Prisma.SkillInclude;

type SkillWithSummary = Prisma.SkillGetPayload<{ include: typeof summaryInclude }>;

const detailInclude = {
  ...summaryInclude,
  versions: { orderBy: { version: "desc" as const }, take: 1 },
  prices: { where: { isActive: true }, orderBy: { createdAt: "desc" as const } },
  author: { select: { name: true } },
} satisfies Prisma.SkillInclude;

type SkillWithDetail = Prisma.SkillGetPayload<{ include: typeof detailInclude }>;

function toDomainAccess(value: PrismaSkillAccessType): SkillAccessType {
  return value;
}

function toSummary(skill: SkillWithSummary): SkillSummary {
  return {
    id: skill.id,
    slug: skill.slug,
    title: skill.title,
    shortDescription: skill.shortDescription,
    accessType: toDomainAccess(skill.accessType),
    coverImageUrl: skill.coverImageUrl,
    viewCount: Number(skill.viewCount),
    favoriteCount: Number(skill.favoriteCount),
    ratingAverage: skill.ratingAverage === null ? null : Number(skill.ratingAverage),
    ratingCount: skill.ratingCount,
    industries: skill.industries.map((l) => ({ slug: l.industry.slug, name: l.industry.name })),
    categories: skill.categories.map((l) => ({ slug: l.category.slug, name: l.category.name })),
    useCases: skill.useCases.map((l) => ({ slug: l.useCase.slug, name: l.useCase.name })),
    tools: skill.tools.map((l) => ({
      slug: l.tool.slug,
      name: l.tool.name,
      logoUrl: l.tool.logoUrl,
    })),
  };
}

function toDetail(skill: SkillWithDetail): SkillDetail {
  const latest = skill.versions[0];
  return {
    ...toSummary(skill),
    description: skill.description,
    content: latest?.content ?? "",
    instructions: latest?.instructions ?? null,
    variables: (latest?.variables as Record<string, unknown> | null) ?? null,
    changelog: latest?.changelog ?? null,
    version: latest?.version ?? 1,
    publishedAt: skill.publishedAt,
    authorName: skill.author?.name ?? null,
    prices: skill.prices.map((p) => ({ currency: p.currency, amount: p.amount })),
  };
}

function buildWhere(filters: SkillListFilters): Prisma.SkillWhereInput {
  const where: Prisma.SkillWhereInput = { status: "PUBLISHED" };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { shortDescription: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.accessType) {
    where.accessType = filters.accessType;
  }

  if (filters.industry) {
    where.industries = { some: { industry: { slug: filters.industry } } };
  }
  if (filters.category) {
    where.categories = { some: { category: { slug: filters.category } } };
  }
  if (filters.useCase) {
    where.useCases = { some: { useCase: { slug: filters.useCase } } };
  }
  if (filters.tool) {
    where.tools = { some: { tool: { slug: filters.tool } } };
  }

  return where;
}

function toPaginated<T>(
  items: T[],
  total: number,
  pagination: Pagination,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages,
  };
}

function count(promise: Promise<number>): Promise<number> {
  return promise.then((value) => value, () => 0);
}

export const prismaSkillRepository: SkillRepository = {
  async findFeatured(limit) {
    const skills = await prisma.skill.findMany({
      where: { status: "PUBLISHED" },
      include: summaryInclude,
      orderBy: [{ favoriteCount: "desc" }, { viewCount: "desc" }],
      take: limit,
    });
    return skills.map(toSummary);
  },

  async search(filters, pagination) {
    const where = buildWhere(filters);
    const [rows, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: summaryInclude,
        orderBy: [{ favoriteCount: "desc" }, { createdAt: "desc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      count(prisma.skill.count({ where })),
    ]);
    return toPaginated(rows.map(toSummary), total, pagination);
  },

  async findSummariesByIds(ids) {
    if (ids.length === 0) return [];
    const skills = await prisma.skill.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      include: summaryInclude,
    });
    const byId = new Map(skills.map((skill) => [skill.id, skill]));
    return ids.flatMap((id) => {
      const skill = byId.get(id);
      return skill ? [toSummary(skill)] : [];
    });
  },

  async findBySlug(slug) {
    const skill = await prisma.skill.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: detailInclude,
    });
    return skill ? toDetail(skill) : null;
  },

  async findContentById(id) {
    const skill = await prisma.skill.findUnique({
      where: { id, status: "PUBLISHED" },
      include: { versions: { orderBy: { version: "desc" as const }, take: 1 } },
    });
    if (!skill) return null;
    const latest = skill.versions[0];
    return {
      id: skill.id,
      slug: skill.slug,
      title: skill.title,
      content: latest?.content ?? "",
      instructions: latest?.instructions ?? null,
      changelog: latest?.changelog ?? null,
      version: latest?.version ?? 1,
    };
  },

  async findPurchaseInfoById(id) {
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" as const }, take: 1 } },
    });
    if (!skill) return null;
    return {
      id: skill.id,
      slug: skill.slug,
      title: skill.title,
      accessType: toDomainAccess(skill.accessType),
      status: skill.status,
      price: skill.prices[0] ? { currency: skill.prices[0].currency, amount: skill.prices[0].amount } : null,
    };
  },
};