export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { SkillFilters } from "@/src/presentation/components/skill/skill-filters";
import { SkillGrid } from "@/src/presentation/components/skill/skill-grid";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import { toSkillCardViewModel } from "@/src/presentation/view-models/skill";
import { skillQueries, taxonomyQueries } from "@/src/infrastructure/composition";
import { skillFiltersSchema, paginationSchema } from "@/src/lib/validation";

function toUrlSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params;
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const parsedFilters = skillFiltersSchema.safeParse(sp);
  const parsedPagination = paginationSchema.safeParse(sp);

  const filters = parsedFilters.success ? parsedFilters.data : { q: "" as const };
  const pagination = parsedPagination.success
    ? { page: parsedPagination.data.page, pageSize: parsedPagination.data.pageSize }
    : { page: 1, pageSize: 12 };

  const [taxonomy, result] = await Promise.all([
    taxonomyQueries.getSnapshot(),
    skillQueries.search(
      {
        q: filters.q || undefined,
        industry: filters.industry,
        category: filters.category,
        useCase: filters.useCase,
        tool: filters.tool,
        accessType: filters.access,
      },
      pagination,
    ),
  ]);

  const cards = result.items.map(toSkillCardViewModel);

  return (
    <Container className="py-12 md:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Search skills
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">
          Find the right prompt, workflow or skill for your next project.
        </p>
      </div>

      <SkillFilters
        values={{
          q: filters.q,
          industry: filters.industry,
          category: filters.category,
          tool: filters.tool,
          access: filters.access,
        }}
        industries={taxonomy.industries}
        categories={taxonomy.categories}
        tools={taxonomy.tools}
      />

      <div className="mt-8">
        <p className="mb-4 text-sm text-zinc-500">
          {result.total} {result.total === 1 ? "result" : "results"}
          {filters.q ? <span> for “{filters.q}”</span> : null}
        </p>
        {cards.length > 0 ? (
          <>
            <SkillGrid skills={cards} />
            <Pagination
              info={{ page: pagination.page, totalPages: result.totalPages, total: result.total }}
              path="/search"
              params={toUrlSearchParams(sp)}
            />
          </>
        ) : (
          <EmptyState
            title="No matching skills"
            description="Double-check your spelling or try fewer filters."
          />
        )}
      </div>
    </Container>
  );
}