export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { webhookEventRepository } from "@/src/infrastructure/composition";
import { formatDateTime, formatNumber } from "@/src/lib/utils";
import { cn } from "@/src/lib/utils";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import type { WebhookEventStatus } from "@/src/domain/payments";
import { getDictionary } from "@/src/lib/i18n";
import type { Dict } from "@/src/lib/i18n/config";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "RECEIVED", "MATCHED", "REJECTED", "FAILED"];

/**
 * Đối soát webhook: mọi giao dịch SePay đã nhận đều nằm ở đây, kể cả giao dịch
 * không khớp đơn nào (sai nội dung chuyển khoản, quá hạn, lệch số tiền). Đây là
 * danh sách bắt buộc để quyết toán tiền thật trong tài khoản với tiền ghi nhận
 * trong hệ thống — mọi event `REJECTED`/`FAILED` đều là tiền đã vào tài khoản.
 */
export default async function AdminWebhookEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status ?? "ALL";
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const dict = await getDictionary();
  const filter = status === "ALL" ? undefined : (status as WebhookEventStatus);

  const [counts, result] = await Promise.all([
    webhookEventRepository.countByStatus(),
    webhookEventRepository.listForAdmin(filter ? { status: filter } : {}, { page, pageSize: PAGE_SIZE }),
  ]);

  const query = new URLSearchParams();
  if (status !== "ALL") query.set("status", status);

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {dict.admin.webhookEvents.title}
          </h1>
          <p className="mt-1 max-w-2xl text-zinc-500">{dict.admin.webhookEvents.subtitle}</p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.orders.title}
        </Link>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        <CountCard label={dict.admin.webhookEvents.received} value={counts.RECEIVED} />
        <CountCard label={dict.admin.webhookEvents.matched} value={counts.MATCHED} />
        <CountCard label={dict.admin.webhookEvents.rejected} value={counts.REJECTED} />
        <CountCard label={dict.admin.webhookEvents.failed} value={counts.FAILED} />
      </dl>

      <form action="/admin/webhook-events" className="mt-6 flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.common.status}</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.webhookEvents.allStatuses : webhookStatusLabel(option, dict)}
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
          <Link
            href="/admin/webhook-events"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            {dict.common.clear}
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-zinc-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-zinc-500">
                    {dict.admin.webhookEvents.transaction}
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500">
                    {dict.admin.webhookEvents.amount}
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500">
                    {dict.admin.webhookEvents.content}
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500">
                    {dict.admin.webhookEvents.orderCode}
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500">{dict.common.status}</th>
                  <th className="px-5 py-3 font-medium text-zinc-500">
                    {dict.admin.webhookEvents.receivedAt}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((event) => (
                  <tr key={event.id} className="border-b last:border-0 hover:bg-zinc-50/60">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-zinc-900">{event.providerEventId}</p>
                      <p className="text-xs text-zinc-400">{event.gateway}</p>
                      {/* Giao dịch tiền ra không bao giờ mở khoá đơn — đánh dấu ngay
                          để admin thấy chuyển khoản bất thường khi đối soát. */}
                      {event.transferType ? (
                        <span
                          className={cn(
                            "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
                            event.transferType === "debit"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {event.transferType === "debit"
                            ? dict.admin.webhookEvents.outgoing
                            : dict.admin.webhookEvents.incoming}
                        </span>
                      ) : null}
                      {event.failureReason ? (
                        <p className="mt-1 max-w-56 text-xs text-amber-700">{event.failureReason}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{formatNumber(event.amountIn)}</td>
                    <td className="max-w-64 px-5 py-3">
                      <span className="line-clamp-2 font-mono text-xs text-zinc-600">
                        {event.content ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {event.orderId ? (
                        <Link
                          href={`/admin/orders/${event.orderId}`}
                          className="font-mono text-xs text-indigo-700 hover:underline"
                        >
                          {event.orderCode}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      <p>{formatDateTime(event.receivedAt)}</p>
                      {/* Giờ ngân hàng ghi nhận (đã quy về UTC) — dùng để so với
                          thời điểm nhận webhook khi điều tra trễ. */}
                      {event.transactionDate ? (
                        <p
                          className="mt-0.5 text-xs text-zinc-400"
                          title={dict.admin.webhookEvents.bankTime}
                        >
                          {dict.admin.webhookEvents.bankTime}: {formatDateTime(event.transactionDate)}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-400">
            {dict.admin.webhookEvents.empty}
          </p>
        )}
      </div>

      <Pagination
        info={{ page: result.page, totalPages: result.totalPages, total: result.total }}
        path="/admin/webhook-events"
        params={query}
      />
    </Container>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-zinc-900">{value}</dd>
    </div>
  );
}

function webhookStatusLabel(status: string, dict: Dict): string {
  return (dict.admin.webhookEvents.statuses as Record<string, string>)[status] ?? status;
}
