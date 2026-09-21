export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { orderRepository } from "@/src/infrastructure/composition";
import { formatDate, formatDateTime, formatNumber } from "@/src/lib/utils";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { getDictionary, trans } from "@/src/lib/i18n";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await orderRepository.findById(id);
  if (!order) notFound();

  const dict = await getDictionary();

  return (
    <Container className="max-w-3xl py-10">
      <Link href="/admin/orders" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.orders.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{order.orderCode}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-zinc-500">
        {trans(dict.admin.orders.placed, { date: formatDate(order.createdAt), userId: order.userId })}
      </p>

      <dl className="mt-8 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-sm shadow-sm sm:grid-cols-2">
        <Row label={dict.admin.orders.skill} value={order.skillTitle} />
        <Row label={dict.admin.orders.skillId} value={order.skillId} />
        <Row label={dict.admin.orders.amount} value={`${formatNumber(order.amount)} ${order.currency}`} />
        <Row label={dict.common.status} value={order.status} />
        <Row label={dict.admin.orders.expiresAt} value={formatDateTime(order.expiresAt)} />
        <Row label={dict.admin.orders.paidAt} value={order.paidAt ? formatDateTime(order.paidAt) : "—"} />
        <Row label={dict.admin.orders.canceledAt} value={order.canceledAt ? formatDateTime(order.canceledAt) : "—"} />
        <Row label={dict.admin.orders.refundedAt} value={order.refundedAt ? formatDateTime(order.refundedAt) : "—"} />
        <Row label={dict.admin.orders.createdAt} value={formatDateTime(order.createdAt)} />
        <Row label={dict.admin.orders.updatedAt} value={formatDateTime(order.updatedAt)} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/skills/${order.skillSlug}`}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.orders.viewSkillPage}
        </Link>
        <Link
          href={`/admin/skills/${order.skillId}`}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.orders.adminSkillDetail}
        </Link>
      </div>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="max-w-[70%] break-words text-right font-medium text-zinc-800">{value}</dd>
    </div>
  );
}