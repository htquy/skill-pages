import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { rankingAdminCommands } from "@/src/infrastructure/composition";
export const dynamic = "force-dynamic";
export default async function AdminRankingsPage() { await requireAdmin(); const result = await rankingAdminCommands.list({ page: 1, pageSize: 50 }); return <Container className="py-10"><h1 className="text-3xl font-bold">Rankings</h1><div className="mt-6 space-y-2">{result.items.map((ranking) => <div key={ranking.id} className="rounded-xl border bg-white p-4"><span className="font-medium">{ranking.name}</span><span className="ml-3 text-sm text-zinc-500">{ranking.status} · {ranking.entryCount} entries</span></div>)}</div></Container>; }
