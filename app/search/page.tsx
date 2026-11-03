export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Container } from "@/src/presentation/components/layout/container";
import { PageHeader } from "@/src/presentation/components/layout/page-header";
import { SkillFilters } from "@/src/presentation/components/skill/skill-filters";
import { SkillGrid } from "@/src/presentation/components/skill/skill-grid";
import { SkillGridSkeleton } from "@/src/presentation/components/skill/skill-grid-skeleton";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import { toSkillCardViewModel, createOwnershipLookup } from "@/src/presentation/view-models/skill";
import { skillQueries, taxonomyQueries, accessCommands } from "@/src/infrastructure/composition";
import { getCurrentUser } from "@/src/infrastructure/authentication/authorization";
import type { SkillFiltersValues } from "@/src/presentation/components/skill/skill-filters";
import { skillFiltersSchema, paginationSchema } from "@/src/lib/validation";
import { getDictionary, trans } from "@/src/lib/i18n";

function toUrlSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params;
}

function filterKey(filters: SkillFiltersValues) {
  return [filters.q, filters.industry, filters.category, filters.useCase, filters.tool, filters.access]
    .map((value) => value ?? "")
    .join("|");
}

interface SearchResultsProps {
  filters: SkillFiltersValues;
  pagination: { page: number; pageSize: number };
  searchParams: Record<string, string | string[] | undefined>;
}

async function SearchResults({ filters, pagination, searchParams }: SearchResultsProps) {
  const user = await getCurrentUser();
  const [result, ownedSkillIds] = await Promise.all([
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
    user ? accessCommands.listOwnedSkillIds(user.id) : Promise.resolve([]),
  ]);

  const isOwned = createOwnershipLookup(ownedSkillIds);
  const cards = result.items.map((skill) => toSkillCardViewModel(skill, { isOwned: isOwned(skill.id) }));

  const dict = await getDictionary();
  const countText = trans(dict.search.resultsCount, { count: result.total });
  const queryFragment = filters.q ? trans(dict.search.forQuery, { query: filters.q }) : "";

  return (
    <>
      <p className="mb-4 text-sm text-zinc-500">
        {countText}
        {queryFragment}
      </p>
      {cards.length > 0 ? (
        <>
          <SkillGrid skills={cards} />
          <Pagination
            info={{ page: pagination.page, totalPages: result.totalPages, total: result.total }}
            path="/search"
            params={toUrlSearchParams(searchParams)}
          />
        </>
      ) : (
        <EmptyState title={dict.search.emptyTitle} description={dict.search.emptyDescription} />
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const parsedFilters = skillFiltersSchema.safeParse(sp);
  const parsedPagination = paginationSchema.safeParse(sp);

  const filters = parsedFilters.success ? parsedFilters.data : { q: "" as const };
  const pagination = parsedPagination.success
    ? { page: parsedPagination.data.page, pageSize: parsedPagination.data.pageSize }
    : { page: 1, pageSize: 12 };

  const [dict, taxonomy] = await Promise.all([getDictionary(), taxonomyQueries.getSnapshot()]);

  return (
    <Container className="py-12 md:py-16">
      <PageHeader title={dict.search.title} subtitle={dict.search.subtitle} />

      <SkillFilters
        action="/search"
        resetKey={filterKey(filters)}
        values={filters}
        industries={taxonomy.industries}
        categories={taxonomy.categories}
        tools={taxonomy.tools}
      />

      <div className="mt-8">
        <Suspense
          key={filterKey(filters)}
          fallback={<SkillGridSkeleton count={6} label={dict.common.loading} />}
        >
          <SearchResults filters={filters} pagination={pagination} searchParams={sp} />
        </Suspense>
      </div>
    </Container>
  );
}
