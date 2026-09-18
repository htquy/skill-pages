import type {
  NewsArticleDetail,
  NewsArticleRepository,
  NewsArticleSummary,
  NewsCategoryRef,
  NewsFilters,
} from "@/src/domain/news/entities";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export interface NewsDeps {
  news: NewsArticleRepository;
}

export function createNewsQueries(deps: NewsDeps) {
  return {
    getFeatured(limit = 3): Promise<NewsArticleSummary[]> {
      return deps.news.findFeatured(limit);
    },

    listNews(
      filters: NewsFilters,
      pagination: Pagination,
    ): Promise<PaginatedResult<NewsArticleSummary>> {
      return deps.news.list(filters, pagination);
    },

    getArticle(slug: string): Promise<NewsArticleDetail | null> {
      return deps.news.findBySlug(slug);
    },

    listCategories(): Promise<NewsCategoryRef[]> {
      return deps.news.listCategories();
    },
  };
}