import type { NewsArticleSummary } from "@/src/domain/news/entities";
import { formatDate } from "@/src/lib/utils";

export interface NewsCardViewModel {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  sourceName: string;
  publishedLabel: string;
  categoryName: string | null;
  tools: string[];
  readingMinutes: number;
}

export function toNewsCardViewModel(article: NewsArticleSummary): NewsCardViewModel {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverImageUrl: article.coverImageUrl,
    sourceName: article.sourceName,
    publishedLabel: article.publishedAt ? formatDate(article.publishedAt) : "Draft",
    categoryName: article.category?.name ?? null,
    tools: article.tools.map((t) => t.name),
    readingMinutes: article.readingMinutes,
  };
}