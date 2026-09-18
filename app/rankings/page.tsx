export const dynamic = "force-dynamic";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { RankingFilters } from "@/src/presentation/components/ranking/ranking-filters";
import { RankingTable } from "@/src/presentation/components/ranking/ranking-table";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { rankingQueries, taxonomyQueries } from "@/src/infrastructure/composition";
import { rankingFiltersSchema } from "@/src/lib/validation";
import type { RankingPeriodType } from "@/src/domain/ranking/entities";

const PERIOD_TABS: { value: RankingPeriodType; label: string }[] = [
  { value: "WEEK", label: "Weekly" },
  { value: "MONTH", label: "Monthly" },
  { value: "QUARTER", label: "Quarterly" },
  { value: "ALL_TIME", label: "All-time" },
];

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

export default async function RankingsPage({ searchParams }: PageProps<"/rankings">) {
  const sp = await searchParams;
  const parsed = rankingFiltersSchema.safeParse(sp);

  const filters = parsed.success
    ? {
        industry: parsed.data.industry,
        category: parsed.data.category,
        periodType: parsed.data.period,
      }
    : {};

  const [taxonomy, periods, ranking] = await Promise.all([
    taxonomyQueries.getSnapshot(),
    rankingQueries.listPeriodOptions(),
    rankingQueries.get(filters),
  ]);

  const activePeriod = parsed.success ? coercePeriod(parsed.data.period) ?? "ALL_TIME" : "ALL_TIME";

  return (
    <Container className="py-12 md:py-16">
      <div className="mb-8">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600">
          <Trophy className="size-4" aria-hidden="true" />
          AI tool rankings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          The AI tools worth your time
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">
          See which tools teams actually open, save and recommend — ranked by
          real engagement across the community.
        </p>
      </div>

      <nav aria-label="Ranking period" className="mb-6 flex flex-wrap gap-2">
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
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <RankingFilters
        values={{
          industry: filters.industry,
          category: filters.category,
          period: filters.periodType,
        }}
        industries={taxonomy.industries}
        categories={taxonomy.categories}
      />

      <div className="mt-8">
        {ranking ? (
          <RankingTable ranking={ranking} />
        ) : (
          <EmptyState
            title="No ranking for this selection yet"
            description="We compute rankings from real engagement data. Try a different period or clear the filters."
            action={
              <Link
                href="/rankings"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                Show all-time ranking
              </Link>
            }
          />
        )}
        <p className="mt-4 text-xs text-zinc-400">
          Rankings update automatically from community activity. Periods shown:{" "}
          {periods.length === 0 ? "WEEK, MONTH, QUARTER, ALL_TIME" : periods.join(", ")}.
        </p>
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