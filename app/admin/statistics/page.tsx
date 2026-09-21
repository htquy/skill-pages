export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { statistics } from "@/src/infrastructure/composition";
import { formatNumber } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import {
  BarChartV,
  PIE_COLORS,
  ProgressBars,
} from "@/src/presentation/components/admin/charts";

function VNDish(value: number): string {
  return `${formatNumber(value)}`;
}

export default async function AdminStatisticsPage() {
  const [dict, metrics, revenue, sales, users] = await Promise.all([
    getDictionary(),
    statistics.getDashboardMetrics(),
    statistics.getRevenueStatistics(12),
    statistics.getSkillSalesStatistics(),
    statistics.getUserStatistics(),
  ]);

  const userSegments = [
    { label: dict.admin.statistics.active, value: users.activeUsers, color: PIE_COLORS[0] },
    { label: dict.admin.statistics.blocked, value: users.blockedUsers, color: PIE_COLORS[3] },
  ];

  return (
    <Container className="py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.statistics.title}</h1>
        <p className="mt-1 text-zinc-500">{dict.admin.statistics.subtitle}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [dict.admin.dashboard.revenue, VNDish(metrics.revenue)],
          [dict.admin.dashboard.paidOrders, formatNumber(metrics.paidOrders)],
          [dict.admin.statistics.conversionRate, `${metrics.conversionRate}%`],
          [dict.admin.statistics.totalOrders, formatNumber(metrics.totalOrders)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [dict.admin.statistics.skillViews, formatNumber(metrics.skillViews)],
          [dict.admin.statistics.favorites, formatNumber(metrics.favorites)],
          [dict.admin.statistics.totalUsers, formatNumber(users.totalUsers)],
          [dict.admin.statistics.adminUsers, formatNumber(users.adminUsers)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.statistics.revenueByMonth}</h2>
          <p className="mb-6 text-sm text-zinc-500">
            {trans(dict.admin.statistics.totalPaidOnly, { value: VNDish(revenue.total) })}
          </p>
          {revenue.byMonth.length > 0 ? (
            <BarChartV data={revenue.byMonth.map((row) => ({ label: row.month, value: row.total }))} />
          ) : (
            <p className="text-sm text-zinc-400">{dict.admin.dashboard.noRevenue}</p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.statistics.userHealth}</h2>
          <p className="mb-6 text-sm text-zinc-500">
            {trans(dict.admin.statistics.userHealthSummary, {
              active: users.activeUsers,
              customers: users.customerUsers,
              admins: users.adminUsers,
            })}
          </p>
          {users.activeUsers + users.blockedUsers > 0 ? (
            <ProgressBars data={userSegments} />
          ) : (
            <p className="text-sm text-zinc-400">{dict.admin.statistics.noUserData}</p>
          )}
        </section>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.statistics.skillSales}</h2>
          <p className="mb-6 text-sm text-zinc-500">{dict.admin.statistics.skillSalesSub}</p>
          {sales.items.length > 0 ? (
            <ProgressBars
              data={sales.items.map((skill, index) => ({
                label: skill.title,
                value: skill.revenue,
                color: PIE_COLORS[index % PIE_COLORS.length],
              }))}
              format={VNDish}
            />
          ) : (
            <p className="text-sm text-zinc-400">{dict.admin.dashboard.noSales}</p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.statistics.topSkillsTable}</h2>
            <p className="text-sm text-zinc-500">{dict.admin.statistics.topSkillsTableSub}</p>
          </div>
          {sales.items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-zinc-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.statistics.skill}</th>
                  <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.statistics.orders}</th>
                  <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.statistics.revenue}</th>
                </tr>
              </thead>
              <tbody>
                {sales.items.map((skill) => (
                  <tr key={skill.skillId} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium text-zinc-900">{skill.title}</td>
                    <td className="px-5 py-3 text-zinc-600">{skill.orders}</td>
                    <td className="px-5 py-3 text-zinc-600">{VNDish(skill.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-zinc-400">{dict.admin.dashboard.noSales}</p>
          )}
        </section>
      </div>
    </Container>
  );
}