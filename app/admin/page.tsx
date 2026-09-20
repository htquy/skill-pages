export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { statistics } from "@/src/infrastructure/composition";
import Link from "next/link";

export default async function AdminPage() {
  const user = await requireAdmin();
  const metrics = await statistics.getDashboardMetrics();

  return (
    <Container className="max-w-3xl py-12 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
        Admin
      </h1>
      <p className="mt-2 text-zinc-600">
        Signed in as <span className="font-medium text-zinc-900">{user.email}</span>.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Users", metrics.totalUsers], ["Active users", metrics.activeUsers], ["Published skills", metrics.publishedSkills], ["Paid orders", metrics.paidOrders]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
        ))}
      </div>
      <nav className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[["Users", "/admin/users"], ["Articles", "/admin/articles"], ["Skills", "/admin/skills"], ["Rankings", "/admin/rankings"], ["Orders", "/admin/orders"], ["Statistics", "/admin/statistics"]].map(([label, href]) => <Link key={href} href={href} className="rounded-xl border border-zinc-200 bg-white px-5 py-4 font-medium hover:border-indigo-300 hover:text-indigo-700">{label}</Link>)}
      </nav>
    </Container>
  );
}
