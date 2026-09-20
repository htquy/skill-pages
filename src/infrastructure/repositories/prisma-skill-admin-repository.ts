import { Prisma, type ContentStatus } from "@prisma/client";
import { slugify } from "@/src/lib/utils";
import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  SkillAccessType,
  SkillAdminRepository,
  SkillAdminSummary,
  SkillStatus,
} from "@/src/domain/skill";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

function toSummary(row: {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  accessType: string;
  status: string;
  viewCount: number | bigint | { toString(): string };
  favoriteCount: number | bigint | { toString(): string };
  ratingAverage: number | { toString(): string } | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  prices: { currency: string; amount: number }[];
}): SkillAdminSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    accessType: row.accessType as SkillAccessType,
    status: row.status as SkillStatus,
    price: row.prices[0] ? { currency: row.prices[0].currency, amount: row.prices[0].amount } : null,
    viewCount: Number(row.viewCount),
    favoriteCount: Number(row.favoriteCount),
    ratingAverage: row.ratingAverage === null ? null : Number(row.ratingAverage),
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

const industryLinks = (slugs: string[]): Prisma.SkillIndustryLinkCreateNestedManyWithoutSkillInput => ({
  create: slugs.map((slug) => ({ industry: { connect: { slug } } })),
});
const categoryLinks = (slugs: string[]): Prisma.SkillCategoryLinkCreateNestedManyWithoutSkillInput => ({
  create: slugs.map((slug) => ({ category: { connect: { slug } } })),
});
const caseLinks = (slugs: string[]): Prisma.SkillUseCaseLinkCreateNestedManyWithoutSkillInput => ({
  create: slugs.map((slug) => ({ useCase: { connect: { slug } } })),
});
const toolLinks = (slugs: string[]): Prisma.SkillToolLinkCreateNestedManyWithoutSkillInput => ({
  create: slugs.map((slug) => ({ tool: { connect: { slug } } })),
});

export const prismaSkillAdminRepository: SkillAdminRepository = {
  async list(filters, pagination) {
    const where: Prisma.SkillWhereInput = {};
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    if (filters.status) where.status = filters.status as ContentStatus;
    if (filters.accessType) where.accessType = filters.accessType;

    const [rows, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.skill.count({ where }),
    ]);
    return toPaginated(rows.map(toSummary), total, pagination);
  },

  async findById(id) {
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
        prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
        industries: { include: { industry: true } },
        categories: { include: { category: true } },
        useCases: { include: { useCase: true } },
        tools: { include: { tool: true } },
      },
    });
    if (!skill) return null;
    const latest = skill.versions[0];
    return {
      id: skill.id,
      slug: skill.slug,
      title: skill.title,
      shortDescription: skill.shortDescription,
      description: skill.description,
      accessType: skill.accessType,
      status: skill.status as SkillStatus,
      coverImageUrl: skill.coverImageUrl,
      authorId: skill.authorId,
      publishedAt: skill.publishedAt,
      price: skill.prices[0] ? { currency: skill.prices[0].currency, amount: skill.prices[0].amount } : null,
      content: latest?.content ?? "",
      instructions: latest?.instructions ?? null,
      variables: (latest?.variables as Record<string, unknown> | null) ?? null,
      changelog: latest?.changelog ?? null,
      version: latest?.version ?? 1,
      industrySlugs: skill.industries.map((l) => l.industry.slug),
      categorySlugs: skill.categories.map((l) => l.category.slug),
      useCaseSlugs: skill.useCases.map((l) => l.useCase.slug),
      toolSlugs: skill.tools.map((l) => l.tool.slug),
    };
  },

  async create(data, authorId) {
    const skill = await prisma.skill.create({
      data: {
        title: data.title,
        slug: data.slug || slugify(data.title),
        shortDescription: data.shortDescription,
        description: data.description,
        accessType: data.accessType,
        status: "DRAFT",
        authorId,
        coverImageUrl: data.coverImageUrl,
        versions: {
          create: {
            version: 1,
            content: data.content,
            instructions: data.instructions,
            variables: (data.variables ?? null) as object | undefined,
            changelog: data.changelog,
          },
        },
        ...(data.accessType === "PAID" && data.price
          ? {
              prices: {
                create: {
                  currency: data.price.currency,
                  amount: data.price.amount,
                  isActive: true,
                },
              },
            }
          : {}),
        industries: industryLinks(data.industrySlugs),
        categories: categoryLinks(data.categorySlugs),
        useCases: caseLinks(data.useCaseSlugs),
        tools: toolLinks(data.toolSlugs),
      },
    });
    return skill.id;
  },

  async update(id, data) {
    const current = await prisma.skill.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!current) throw new Error("Skill not found");

    const latest = current.versions[0];
    const transaction: Prisma.PrismaPromise<unknown>[] = [
      prisma.skill.update({
        where: { id },
        data: {
          title: data.title,
          slug: data.slug || slugify(data.title),
          shortDescription: data.shortDescription,
          description: data.description,
          accessType: data.accessType,
          coverImageUrl: data.coverImageUrl,
          prices: {
            deleteMany: {},
            create:
              data.accessType === "PAID" && data.price
                ? [{ currency: data.price.currency, amount: data.price.amount, isActive: true }]
                : [],
          },
          industries: { deleteMany: {}, ...industryLinks(data.industrySlugs) },
          categories: { deleteMany: {}, ...categoryLinks(data.categorySlugs) },
          useCases: { deleteMany: {}, ...caseLinks(data.useCaseSlugs) },
          tools: { deleteMany: {}, ...toolLinks(data.toolSlugs) },
        },
      }),
    ];

    if (latest) {
      transaction.push(
        prisma.skillVersion.update({
          where: { id: latest.id },
          data: {
            content: data.content,
            instructions: data.instructions,
            variables: (data.variables ?? null) as object | undefined,
            changelog: data.changelog,
          },
        }),
      );
    } else {
      transaction.push(
        prisma.skillVersion.create({
          data: { skillId: id, version: 1, content: data.content, instructions: data.instructions, variables: (data.variables ?? null) as object | undefined, changelog: data.changelog },
        }),
      );
    }

    await prisma.$transaction(transaction);
  },

  async delete(id) {
    await prisma.skill.delete({ where: { id } });
  },

  async setStatus(id, status) {
    await prisma.skill.update({
      where: { id },
      data: {
        status,
        ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
    });
  },

  async countAll() {
    return prisma.skill.count();
  },

  async countPublished() {
    return prisma.skill.count({ where: { status: "PUBLISHED" } });
  },
};
