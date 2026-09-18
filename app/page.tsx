export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { HeroSection } from "@/src/presentation/components/layout/hero-section";
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

export default async function HomePage({ searchParams }: PageProps<"/">) {
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
  const hasActiveFilters = Boolean(
    filters.q || filters.industry || filters.category || filters.tool || filters.access,
  );

  return (
    <>
      <HeroSection />
      <Container id="catalog" className="scroll-mt-20 py-12 md:py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Explore the skill library
            </h2>
            <p className="mt-1 text-zinc-600">
              Reusable prompts and workflows for every industry and tool.
            </p>
          </div>
          <p className="hidden text-sm text-zinc-500 sm:block">
            {result.total} {result.total === 1 ? "result" : "results"}
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
          {cards.length > 0 ? (
            <>
              <SkillGrid skills={cards} />
              <Pagination
                info={{ page: pagination.page, totalPages: result.totalPages, total: result.total }}
                path="/"
                params={toUrlSearchParams(sp)}
              />
            </>
          ) : (
            <EmptyState
              title="No skills found"
              description="Try another keyword or remove a filter."
              action={
                <Link
                  href={hasActiveFilters ? "/" : "/#catalog"}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                >
                  Clear all filters
                </Link>
              }
            />
          )}
        </div>
      </Container>
    </>
  );
}