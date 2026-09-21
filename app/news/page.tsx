export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { FeaturedNewsCard } from "@/src/presentation/components/news/featured-news-card";
import { NewsGrid } from "@/src/presentation/components/news/news-grid";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import { toNewsCardViewModel } from "@/src/presentation/view-models/news";
import { newsQueries } from "@/src/infrastructure/composition";
import { newsFiltersSchema, paginationSchema } from "@/src/lib/validation";
import { getDictionary } from "@/src/lib/i18n";

function toUrlSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params;
}

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  const sp = await searchParams;
  const parsedFilters = newsFiltersSchema.safeParse(sp);
  const parsedPagination = paginationSchema.safeParse(sp);

  const filters = parsedFilters.success ? parsedFilters.data : {};
  const pagination = parsedPagination.success
    ? { page: parsedPagination.data.page, pageSize: parsedPagination.data.pageSize }
    : { page: 1, pageSize: 12 };

  const [categories, result] = await Promise.all([
    newsQueries.listCategories(),
    newsQueries.listNews(filters, pagination),
  ]);

  const showFeatured = pagination.page === 1 && !filters.category;
  const featured = showFeatured ? await newsQueries.getFeatured(1) : [];

  const articles = result.items.map(toNewsCardViewModel);
  const featuredArticle = featured[0] ? toNewsCardViewModel(featured[0]) : null;
  const remaining = featuredArticle
    ? articles.filter((article) => article.slug !== featuredArticle.slug)
    : articles;

  const dict = await getDictionary();

  return (
    <Container className="py-12 md:py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          {dict.news.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {dict.news.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">
          {dict.news.subtitle}
        </p>
      </div>

      <form method="get" className="mb-8 flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="news-category" className="text-xs font-medium text-zinc-500">
            {dict.news.category}
          </label>
          <select
            id="news-category"
            name="category"
            defaultValue={filters.category}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{dict.news.allCategories}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
        >
          {dict.common.apply}
        </button>
      </form>

      {articles.length > 0 ? (
        <div className="space-y-10">
          {featuredArticle ? <FeaturedNewsCard article={featuredArticle} /> : null}
          {remaining.length > 0 ? <NewsGrid articles={remaining} /> : null}
          <Pagination
            info={{ page: pagination.page, totalPages: result.totalPages, total: result.total }}
            path="/news"
            params={toUrlSearchParams(sp)}
          />
        </div>
      ) : (
        <EmptyState
          title={dict.news.emptyTitle}
          description={dict.news.emptyDescription}
        />
      )}
    </Container>
  );
}