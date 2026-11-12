export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { PageHeader } from "@/src/presentation/components/layout/page-header";
import { RankingFilters } from "@/src/presentation/components/ranking/ranking-filters";
import { RankingTable } from "@/src/presentation/components/ranking/ranking-table";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { TableSkeleton } from "@/src/presentation/components/shared/table-skeleton";
import { rankingQueries, taxonomyQueries } from "@/src/infrastructure/composition";
import { rankingFiltersSchema } from "@/src/lib/validation";
import type { RankingPeriodType } from "@/src/domain/ranking/entities";
import { getDictionary, trans } from "@/src/lib/i18n";

interface RankingQueryFilters {
  industry?: string;
  category?: string;
  periodType?: RankingPeriodType;
}

function buildHref(filters: {
  industry?: string;
  category?: string;
  period?: RankingPeriodType;
}): string {
  const params = new URLSearchParams();
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.category) params.set("category", filters.category);
  if (filters.period && filters.period !== "ALL_TIME") params.set("period", filters.period);
  const query = params.toString();
  return query ? `/rankings?${query}` : "/rankings";
}

function filterKey(filters: RankingQueryFilters) {
  return [filters.industry, filters.category, filters.periodType].map((value) => value ?? "").join("|");
}

async function RankingResults({ filters }: { filters: RankingQueryFilters }) {
  const [periods, ranking] = await Promise.all([
    rankingQueries.listPeriodOptions(),
    rankingQueries.get(filters),
  ]);
  const dict = await getDictionary();

  return (
    <>
      {ranking ? (
        <RankingTable ranking={ranking} />
      ) : (
        <EmptyState
          title={dict.rankings.emptyTitle}
          description={dict.rankings.emptyDescription}
          action={
            <Link
              href="/rankings"
              className="rounded-lg border border-zinc-300 bg-surface px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              {dict.rankings.clearAction}
            </Link>
          }
        />
      )}
      <p className="mt-4 text-xs text-zinc-400">
        {trans(dict.rankings.footnote, {
          periods:
            periods.length === 0 ? "WEEK, MONTH, QUARTER, ALL_TIME" : periods.join(", "),
        })}
      </p>
    </>
  );
}

export default async function RankingsPage({ searchParams }: PageProps<"/rankings">) {
  const sp = await searchParams;
  const parsed = rankingFiltersSchema.safeParse(sp);

  const filters: RankingQueryFilters = parsed.success
    ? {
        industry: parsed.data.industry,
        category: parsed.data.category,
        periodType: parsed.data.period,
      }
    : {};

  const [dict, taxonomy] = await Promise.all([getDictionary(), taxonomyQueries.getSnapshot()]);

  const activePeriod = parsed.success ? coercePeriod(parsed.data.period) ?? "ALL_TIME" : "ALL_TIME";

  const PERIOD_TABS: { value: RankingPeriodType; label: string }[] = [
    { value: "WEEK", label: dict.rankings.weeks },
    { value: "MONTH", label: dict.rankings.months },
    { value: "QUARTER", label: dict.rankings.quarters },
    { value: "ALL_TIME", label: dict.rankings.allTime },
  ];

  return (
    <Container className="py-12 md:py-16">
      <PageHeader
        eyebrow={dict.rankings.eyebrow}
        icon={<Trophy className="size-3.5 text-spark-500" aria-hidden="true" />}
        title={dict.rankings.title}
        subtitle={dict.rankings.subtitle}
      />

      <nav aria-label={dict.filters.period} className="mb-6 flex flex-wrap gap-2">
        {PERIOD_TABS.map((tab) => {
          const active = activePeriod === tab.value;
          return (
            <Link
              key={tab.value}
              href={buildHref({
                industry: filters.industry,
                category: filters.category,
                period: tab.value,
              })}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-fluid ${
                active
                  ? "text-white shadow-glow bg-brand-600"
                  : "border border-zinc-200 bg-surface text-zinc-700 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <RankingFilters
        action="/rankings"
        resetKey={filterKey(filters)}
        values={{
          industry: filters.industry,
          category: filters.category,
          period: filters.periodType,
        }}
        industries={taxonomy.industries}
        categories={taxonomy.categories}
      />

      <div className="mt-8">
        <Suspense key={filterKey(filters)} fallback={<TableSkeleton columns={5} label={dict.common.loading} />}>
          <RankingResults filters={filters} />
        </Suspense>
      </div>
    </Container>
  );
}

function coercePeriod(value: string | undefined): RankingPeriodType | null {
  if (value === "WEEK" || value === "MONTH" || value === "QUARTER" || value === "ALL_TIME") {
    return value;
  }
  return null;
}
