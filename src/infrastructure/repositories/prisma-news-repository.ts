import { Prisma } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import { readingMinutes } from "@/src/lib/utils";
import type {
  NewsArticleDetail,
  NewsArticleRepository,
  NewsArticleSummary,
  NewsCategoryRef,
} from "@/src/domain/news/entities";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

const listInclude = {
  category: { select: { slug: true, name: true } },
  tools: { include: { tool: { select: { slug: true, name: true, logoUrl: true } } }, orderBy: { toolId: "asc" as const } },
} satisfies Prisma.NewsArticleInclude;

type NewsWithList = Prisma.NewsArticleGetPayload<{ include: typeof listInclude }>;

const detailInclude = listInclude;

function toSummary(article: NewsWithList): NewsArticleSummary {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverImageUrl: article.coverImageUrl,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    category: article.category,
    tools: article.tools.map((l) => ({
      slug: l.tool.slug,
      name: l.tool.name,
      logoUrl: l.tool.logoUrl,
    })),
    readingMinutes: readingMinutes(article.content),
  };
}

function toCategoryRef(category: { slug: string; name: string }): NewsCategoryRef {
  return { slug: category.slug, name: category.name };
}

export const prismaNewsRepository: NewsArticleRepository = {
  async findFeatured(limit) {
    const articles = await prisma.newsArticle.findMany({
      where: { status: "PUBLISHED" },
      include: listInclude,
      orderBy: [{ publishedAt: "desc" }],
      take: limit,
    });
    return articles.map(toSummary);
  },

  async list(filters, pagination: Pagination) {
    const where: Prisma.NewsArticleWhereInput = { status: "PUBLISHED" };
    if (filters.category) {
      where.category = { slug: filters.category };
    }

    const [rows, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        include: listInclude,
        orderBy: [{ publishedAt: "desc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.newsArticle.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
    const result: PaginatedResult<NewsArticleSummary> = {
      items: rows.map(toSummary),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
    return result;
  },

  async findBySlug(slug) {
    const article = await prisma.newsArticle.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: detailInclude,
    });
    if (!article) return null;

    const related = await prisma.newsArticle.findMany({
      where: {
        status: "PUBLISHED",
        slug: { not: slug },
        ...(article.categoryId ? { categoryId: article.categoryId } : {}),
      },
      include: listInclude,
      orderBy: [{ publishedAt: "desc" }],
      take: 3,
    });

    const detail: NewsArticleDetail = {
      ...toSummary(article),
      content: article.content,
      sourceUrl: article.sourceUrl,
      related: related.map(toSummary),
    };
    return detail;
  },

  async listCategories() {
    const categories = await prisma.newsCategory.findMany({
      where: { articles: { some: { status: "PUBLISHED" } } },
      orderBy: { name: "asc" },
    });
    return categories.map(toCategoryRef);
  },
};