export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowUpRight, BookOpen, CircleDollarSign, ShoppingBag, Users } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { statistics } from "@/src/infrastructure/composition";
import { formatDate, formatNumber } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import {
  BarChartV,
  DonutChart,
  PIE_COLORS,
  ProgressBars,
} from "@/src/presentation/components/admin/charts";
import type { Dict } from "@/src/lib/i18n/config";

const ORDER_STATUSES = ["PENDING", "PAID", "EXPIRED", "CANCELED", "FAILED", "REFUNDED"] as const;

function statCards(metrics: Awaited<ReturnType<typeof statistics.getDashboardMetrics>>, dict: Dict) {
  return [
    {
      label: dict.admin.dashboard.totalUsers,
      value: formatNumber(metrics.totalUsers),
      icon: Users,
      href: "/admin/users",
      accent: "text-indigo-600 bg-indigo-50",
    },
    {
      label: dict.admin.dashboard.activeUsers,
      value: formatNumber(metrics.activeUsers),
      icon: Users,
      href: "/admin/users",
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      label: dict.admin.dashboard.publishedSkills,
      value: formatNumber(metrics.publishedSkills),
      icon: BookOpen,
      href: "/admin/skills",
      accent: "text-violet-600 bg-violet-50",
    },
    {
      label: dict.admin.dashboard.paidOrders,
      value: formatNumber(metrics.paidOrders),
      icon: ShoppingBag,
      href: "/admin/orders",
      accent: "text-sky-600 bg-sky-50",
    },
    {
      label: dict.admin.dashboard.revenue,
      value: formatNumber(metrics.revenue),
      icon: CircleDollarSign,
      href: "/admin/statistics",
      accent: "text-amber-600 bg-amber-50",
    },
  ];
}

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const [dict, metrics, revenue] = await Promise.all([
    getDictionary(),
    statistics.getDashboardMetrics(),
    statistics.getRevenueStatistics(12),
  ]);

  const donutData = ORDER_STATUSES.map((status, index) => ({
    label: dict.status[status],
    value: metrics.orderStatusCounts[status] ?? 0,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  const topSkills = metrics.topSkills.slice(0, 5);

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.dashboard.title}</h1>
          <p className="mt-1 text-zinc-500">
            {trans(dict.admin.dashboard.signedInAs, { email: user.email ?? "" })}
          </p>
        </div>
        <Link
          href="/admin/statistics"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.dashboard.detailedStats}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards(metrics, dict).map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">{card.label}</p>
              <span className={`flex size-8 items-center justify-center rounded-lg ${card.accent}`}>
                <card.icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-zinc-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.dashboard.revenueByMonth}</h2>
              <p className="text-sm text-zinc-500">{trans(dict.admin.dashboard.lastMonths, { count: revenue.byMonth.length })}</p>
            </div>
          </div>
          {revenue.byMonth.length > 0 ? (
            <BarChartV data={revenue.byMonth.map((row) => ({ label: row.month, value: row.total }))} />
          ) : (
            <p className="text-sm text-zinc-400">{dict.admin.dashboard.noRevenue}</p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.dashboard.orderStatus}</h2>
          <p className="mb-6 text-sm text-zinc-500">{dict.admin.dashboard.orderStatusSub}</p>
          <DonutChart
            data={donutData}
            centerValue={formatNumber(metrics.totalOrders)}
            centerLabel={dict.admin.dashboard.ordersCenter}
            noDataLabel={dict.common.noData}
          />
        </section>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.dashboard.topSelling}</h2>
              <p className="text-sm text-zinc-500">{dict.admin.dashboard.topSellingSub}</p>
            </div>
            <Link
              href="/admin/statistics"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {dict.admin.dashboard.viewSales}
            </Link>
          </div>
          {topSkills.length > 0 ? (
            <ProgressBars
              data={topSkills.map((skill, index) => ({
                label: skill.title,
                value: skill.orders,
                color: PIE_COLORS[index % PIE_COLORS.length],
              }))}
            />
          ) : (
            <p className="text-sm text-zinc-400">{dict.admin.dashboard.noSales}</p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.dashboard.recentOrders}</h2>
              <p className="text-sm text-zinc-500">{trans(dict.admin.dashboard.latestTransactions, { count: metrics.recentOrders.length })}</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {dict.admin.dashboard.allOrders}
            </Link>
          </div>
          {metrics.recentOrders.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {metrics.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="block truncate font-medium text-zinc-800 hover:text-indigo-700"
                    >
                      {order.skillTitle}
                    </Link>
                    <p className="text-xs text-zinc-400">
                      {order.orderCode} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium text-zinc-700">
                      {formatNumber(order.amount)} {order.currency}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">{dict.admin.dashboard.noOrders}</p>
          )}
        </section>
      </div>
    </Container>
  );
}