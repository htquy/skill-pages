import { Prisma, type ContentStatus } from "@prisma/client";
import { slugify } from "@/src/lib/utils";
import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  NewsAdminRepository,
  NewsAdminSummary,
  NewsCategoryAdminRepository,
} from "@/src/domain/news/admin";
import type { NewsStatus } from "@/src/domain/news/entities";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

function toSummary(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  sourceName: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string } | null;
}): NewsAdminSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    categoryName: row.category?.name ?? null,
    status: row.status as NewsStatus,
    sourceName: row.sourceName,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

function buildSlug(title: string, slug: string): string {
  return slug.trim() || slugify(title);
}

export const prismaNewsAdminRepository: NewsAdminRepository = {
  async list(filters, pagination) {
    const where: Prisma.NewsArticleWhereInput = {};
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
        { sourceName: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    if (filters.status) where.status = filters.status as ContentStatus;

    const [rows, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.newsArticle.count({ where }),
    ]);
    return toPaginated(rows.map(toSummary), total, pagination);
  },

  async findById(id) {
    const article = await prisma.newsArticle.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, slug: true } },
        tools: { include: { tool: { select: { slug: true } } } },
      },
    });
    if (!article) return null;
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      coverImageUrl: article.coverImageUrl,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
      status: article.status as NewsStatus,
      categoryId: article.category?.id ?? null,
      categorySlug: article.category?.slug ?? null,
      toolSlugs: article.tools.map((l) => l.tool.slug),
      publishedAt: article.publishedAt,
    };
  },

  async create(data) {
    const article = await prisma.newsArticle.create({
      data: {
        title: data.title,
        slug: buildSlug(data.title, data.slug),
        excerpt: data.excerpt,
        content: data.content,
        coverImageUrl: data.coverImageUrl,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        status: data.publish ? "PUBLISHED" : "DRAFT",
        publishedAt: data.publish ? new Date() : null,
        category: data.categorySlug ? { connect: { slug: data.categorySlug } } : undefined,
        tools: {
          create: data.toolSlugs.map((slug) => ({ tool: { connect: { slug } } })),
        },
      },
    });
    return article.id;
  },

  async update(id, data) {
    await prisma.newsArticle.update({
      where: { id },
      data: {
        title: data.title,
        slug: buildSlug(data.title, data.slug),
        excerpt: data.excerpt,
        content: data.content,
        coverImageUrl: data.coverImageUrl,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        publishedAt: data.publish ? new Date() : null,
        category: data.categorySlug ? { connect: { slug: data.categorySlug } } : { disconnect: true },
        tools: {
          deleteMany: {},
          create: data.toolSlugs.map((slug) => ({ tool: { connect: { slug } } })),
        },
      },
    });
  },

  async delete(id) {
    await prisma.newsArticle.delete({ where: { id } });
  },

  async setStatus(id, status) {
    await prisma.newsArticle.update({
      where: { id },
      data: {
        status,
        ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
    });
  },

  async countPublished() {
    return prisma.newsArticle.count({ where: { status: "PUBLISHED" } });
  },
};

export const prismaNewsCategoryAdminRepository: NewsCategoryAdminRepository = {
  async listAll() {
    const rows = await prisma.newsCategory.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name }));
  },
};
