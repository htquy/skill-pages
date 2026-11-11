export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Container } from "@/src/presentation/components/layout/container";
import { PageHeader } from "@/src/presentation/components/layout/page-header";
import { FaqSection } from "@/src/presentation/components/landing/faq-section";
import { ToolGrid } from "@/src/presentation/components/tools/tool-grid";
import { ToolGridSkeleton } from "@/src/presentation/components/tools/tool-grid-skeleton";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import {
  FilterForm,
  FilterSubmitButton,
  FilterClearLink,
} from "@/src/presentation/components/shared/filter-form";
import { lowestPlanPrice, toToolCardViewModel } from "@/src/presentation/view-models/tool";
import { appsService, toolQueries } from "@/src/infrastructure/composition";
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

function filterKey(filters: ToolListFilters) {
  return [filters.q, filters.type, filters.billingType].map((value) => value ?? "").join("|");
}

const selectClass =
  "rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

async function ToolFilters({ filters, resetKey }: { filters: ToolListFilters; resetKey: string }) {
  const dict = await getDictionary();
  const hasFilters = Boolean(filters.q || filters.type || filters.billingType);

  return (
    <FilterForm action="/tools" resetKey={resetKey} className="mb-8 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 basis-64">
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">
          {dict.tools.searchLabel}
        </span>
        <input
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder={dict.tools.searchPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
      <FilterSubmitButton label={dict.common.apply} />
      {hasFilters ? <FilterClearLink href="/tools" label={dict.common.clear} /> : null}
    </FilterForm>
  );
}

interface ToolListingProps {
  filters: ToolListFilters;
  pagination: { page: number; pageSize: number };
  searchParams: SearchParams;
}

async function ToolListing({ filters, pagination, searchParams }: ToolListingProps) {
  const [dict, result, apps] = await Promise.all([
    getDictionary(),
    toolQueries.list(filters, pagination),
    appsService.listActiveApps(),
  ]);
  // Tool liên kết app hiển thị giá gói thật (mua được), không phải giá tham khảo của catalog.
  const appPrices = new Map(apps.map((app) => [app.slug, lowestPlanPrice(app.plans)]));
  const tools = result.items.map((tool) => toToolCardViewModel(tool, appPrices, dict));

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
    <>
      <Container className="py-12 md:py-16">
        <PageHeader eyebrow={dict.tools.eyebrow} title={dict.tools.title} subtitle={dict.tools.subtitle} />

        <ToolFilters filters={filters} resetKey={filterKey(filters)} />

        <Suspense
          key={filterKey(filters)}
          fallback={<ToolGridSkeleton count={6} label={dict.common.loading} />}
        >
          <ToolListing filters={filters} pagination={pagination} searchParams={sp} />
        </Suspense>
      </Container>

      <FaqSection badge={dict.tools.faq.badge} title={dict.tools.faq.title} items={dict.tools.faq.items} />
    </>
  );
}
