export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { rankingAdminCommands } from "@/src/infrastructure/composition";
import { formatDate } from "@/src/lib/utils";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { Pagination } from "@/src/presentation/components/shared/pagination";

const PAGE_SIZE = 20;

export default async function AdminRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const result = await rankingAdminCommands.list({ page, pageSize: PAGE_SIZE });

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Rankings</h1>
          <p className="mt-1 text-zinc-500">{result.total} rankings</p>
        </div>
        <Link
          href="/admin/rankings/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          New ranking
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500">Ranking</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Scope</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Period</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Entries</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Updated</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((ranking) => (
                <tr key={ranking.id} className="border-b last:border-0 hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/rankings/${ranking.id}`} className="font-medium text-zinc-900 hover:text-indigo-700">
                      {ranking.name}
                    </Link>
                    <p className="text-xs text-zinc-400">{ranking.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {[ranking.industryName, ranking.categoryName].filter(Boolean).join(" · ") || "All"}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{ranking.periodType}</td>
                  <td className="px-5 py-3 text-zinc-600">{ranking.entryCount}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={ranking.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-500">{formatDate(ranking.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-400">No rankings found.</p>
        )}
      </div>

      <Pagination
        info={{ page: result.page, totalPages: result.totalPages, total: result.total }}
        path="/admin/rankings"
        params={new URLSearchParams()}
      />
    </Container>
  );
}