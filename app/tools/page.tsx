export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { ToolGrid } from "@/src/presentation/components/tools/tool-grid";
import { ToolGridSkeleton } from "@/src/presentation/components/tools/tool-grid-skeleton";
import { ToolFiltersSkeleton } from "@/src/presentation/components/tools/tool-filters-skeleton";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import { toToolCardViewModel } from "@/src/presentation/view-models/tool";
import { toolQueries } from "@/src/infrastructure/composition";
import type { ToolBillingType, ToolListFilters, ToolType } from "@/src/domain/tool";
import { paginationSchema, toolFiltersSchema } from "@/src/lib/validation";
import { getDictionary, trans } from "@/src/lib/i18n";

const TOOL_TYPES: ToolType[] = ["DOWNLOADABLE", "EMBED_WIDGET", "MCP_SERVER", "WEB_APP"];
const TOOL_BILLING_TYPES: ToolBillingType[] = ["FREE", "ONE_TIME", "SUBSCRIPTION"];

type SearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: SearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params;
}

const selectClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

async function ToolFilters({ filters }: { filters: ToolListFilters }) {
  const dict = await getDictionary();
  const hasFilters = Boolean(filters.q || filters.type || filters.billingType);

  return (
    <form method="get" className="mb-8 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 basis-64">
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">
          {dict.tools.searchLabel}
        </span>
        <input
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder={dict.tools.searchPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.tools.typeLabel}</span>
        <select name="type" defaultValue={filters.type ?? ""} className={selectClass}>
          <option value="">{dict.tools.allTypes}</option>
          {TOOL_TYPES.map((type) => (
            <option key={type} value={type}>
              {dict.tools.types[type]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">
          {dict.tools.billingLabel}
        </span>
        <select name="billing" defaultValue={filters.billingType ?? ""} className={selectClass}>
          <option value="">{dict.tools.allBilling}</option>
          {TOOL_BILLING_TYPES.map((billing) => (
            <option key={billing} value={billing}>
              {dict.tools.billingTypes[billing]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
      >
        {dict.common.apply}
      </button>
      {hasFilters ? (
        <Link href="/tools" className="px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
          {dict.common.clear}
        </Link>
      ) : null}
    </form>
  );
}

interface ToolListingProps {
  filters: ToolListFilters;
  pagination: { page: number; pageSize: number };
  searchParams: SearchParams;
}

async function ToolListing({ filters, pagination, searchParams }: ToolListingProps) {
  const [dict, result] = await Promise.all([getDictionary(), toolQueries.list(filters, pagination)]);
  const tools = result.items.map(toToolCardViewModel);

  if (tools.length === 0) {
    return <EmptyState title={dict.tools.emptyTitle} description={dict.tools.emptyDescription} />;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-500">{trans(dict.tools.resultsCount, { count: result.total })}</p>
      <ToolGrid tools={tools} />
      <Pagination
        info={{ page: pagination.page, totalPages: result.totalPages, total: result.total }}
        path="/tools"
        params={toUrlSearchParams(searchParams)}
      />
    </div>
  );
}

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function ToolsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const parsedFilters = toolFiltersSchema.safeParse(sp);
  const parsedPagination = paginationSchema.safeParse(sp);

  const filters: ToolListFilters = parsedFilters.success
    ? {
        q: parsedFilters.data.q || undefined,
        type: parsedFilters.data.type,
        billingType: parsedFilters.data.billing,
      }
    : {};
  const pagination = parsedPagination.success
    ? { page: parsedPagination.data.page, pageSize: parsedPagination.data.pageSize }
    : { page: 1, pageSize: 12 };

  const dict = await getDictionary();

  return (
    <Container className="py-12 md:py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          {dict.tools.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {dict.tools.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">{dict.tools.subtitle}</p>
      </div>

      <Suspense
        fallback={
          <>
            <ToolFiltersSkeleton />
            <ToolGridSkeleton count={6} label={dict.common.loading} />
          </>
        }
      >
        <ToolFilters filters={filters} />
        <ToolListing filters={filters} pagination={pagination} searchParams={sp} />
      </Suspense>
    </Container>
  );
}
