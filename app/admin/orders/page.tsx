export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { orderRepository } from "@/src/infrastructure/composition";
import { formatDate } from "@/src/lib/utils";
import { formatMoney } from "@/src/domain/shared";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import { TableSkeleton } from "@/src/presentation/components/shared/table-skeleton";
import {
  FilterForm,
  FilterSubmitButton,
  FilterClearLink,
} from "@/src/presentation/components/shared/filter-form";
import type { OrderStatus } from "@/src/domain/orders";
import { getDictionary, trans } from "@/src/lib/i18n";
import type { Dict } from "@/src/lib/i18n/config";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "PENDING", "PAID", "EXPIRED", "CANCELED", "FAILED", "REFUNDED"];

interface AdminOrderFilters {
  q: string;
  status: string;
}

function filterKey(filters: AdminOrderFilters) {
  return [filters.q, filters.status].join("|");
}

async function OrdersTable({ filters, page }: { filters: AdminOrderFilters; page: number }) {
  const dict = await getDictionary();
  const result = await orderRepository.listForAdmin(
    { q: filters.q, status: filters.status === "ALL" ? undefined : (filters.status as OrderStatus) },
    { page, pageSize: PAGE_SIZE },
  );

  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.status !== "ALL") query.set("status", filters.status);

  return (
    <>
      <p className="mt-6 text-sm text-zinc-500">
        {trans(dict.admin.orders.count, { count: result.total })}
      </p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.orders.orderHeader}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.orders.skill}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.orders.amount}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.common.status}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.orders.created}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-zinc-900 hover:text-brand-700">
                      {order.orderCode}
                    </Link>
                    <p className="text-xs text-zinc-400">{order.email ?? order.userId}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={order.skillId ? `/admin/skills/${order.skillId}` : "/admin/apps"} className="text-zinc-700 hover:text-brand-700">
                      {order.skillTitle}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{formatMoney(order.amount, order.currency)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-500">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-400">{dict.admin.orders.empty}</p>
        )}
      </div>

      <Pagination
        info={{ page: result.page, totalPages: result.totalPages, total: result.total }}
        path="/admin/orders"
        params={query}
      />
    </>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const dict = await getDictionary();

  const filters: AdminOrderFilters = {
    q: Array.isArray(params.q) ? params.q[0] : params.q ?? "",
    status: Array.isArray(params.status) ? params.status[0] : params.status ?? "ALL",
  };
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const hasFilters = Boolean(filters.q) || filters.status !== "ALL";

  return (
    <Container className="py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.orders.title}</h1>
      </div>

      <FilterForm
        action="/admin/orders"
        resetKey={filterKey(filters)}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.orders.searchLabel}</span>
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={dict.admin.orders.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.orders.status}</span>
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.orders.allStatuses : orderStatusLabel(option, dict)}
              </option>
            ))}
          </select>
        </label>
        <FilterSubmitButton label={dict.common.apply} />
        {hasFilters ? <FilterClearLink href="/admin/orders" label={dict.common.clear} /> : null}
      </FilterForm>

      <Suspense key={filterKey(filters)} fallback={<TableSkeleton columns={5} label={dict.common.loading} />}>
        <OrdersTable filters={filters} page={page} />
      </Suspense>
    </Container>
  );
}

function orderStatusLabel(status: string, dict: Dict): string {
  return (dict.status as Record<string, string>)[status] ?? status;
}
