export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { orderRepository } from "@/src/infrastructure/composition";
import { formatDate, formatNumber } from "@/src/lib/utils";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import type { OrderStatus } from "@/src/domain/orders";
import { getDictionary, trans } from "@/src/lib/i18n";
import type { Dict } from "@/src/lib/i18n/config";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "PENDING", "PAID", "EXPIRED", "CANCELED", "FAILED", "REFUNDED"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q ?? "";
  const status = Array.isArray(params.status) ? params.status[0] : params.status ?? "ALL";
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const dict = await getDictionary();

  const result = await orderRepository.listForAdmin(
    { q, status: status === "ALL" ? undefined : (status as OrderStatus) },
    { page, pageSize: PAGE_SIZE },
  );

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status !== "ALL") query.set("status", status);

  return (
    <Container className="py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.orders.title}</h1>
        <p className="mt-1 text-zinc-500">{trans(dict.admin.orders.count, { count: result.total })}</p>
      </div>

      <form action="/admin/orders" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.orders.searchLabel}</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={dict.admin.orders.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.orders.status}</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.orders.allStatuses : orderStatusLabel(option, dict)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          {dict.common.apply}
        </button>
        {query.toString() ? (
          <Link href="/admin/orders" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
            {dict.common.clear}
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <table className="w-full text-left text-sm">
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
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-zinc-900 hover:text-indigo-700">
                      {order.orderCode}
                    </Link>
                    <p className="text-xs text-zinc-400">{order.userId}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/skills/${order.skillId}`} className="text-zinc-700 hover:text-indigo-700">
                      {order.skillTitle}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {formatNumber(order.amount)} {order.currency}
                  </td>
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
    </Container>
  );
}

function orderStatusLabel(status: string, dict: Dict): string {
  return (dict.status as Record<string, string>)[status] ?? status;
}