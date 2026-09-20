import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { statistics } from "@/src/infrastructure/composition";
export const dynamic = "force-dynamic";
export default async function AdminStatisticsPage() { await requireAdmin(); const m = await statistics.getDashboardMetrics(); return <Container className="py-10"><h1 className="text-3xl font-bold">Statistics</h1><p className="mt-2 text-zinc-500">Revenue: {m.revenue.toLocaleString()} VND · Conversion: {m.conversionRate}% · Views: {m.skillViews} · Favorites: {m.favorites}</p></Container>; }
