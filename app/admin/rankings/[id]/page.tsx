export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, RefreshCw } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { rankingAdminCommands } from "@/src/infrastructure/composition";
import { formatDate } from "@/src/lib/utils";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { ConfirmButton } from "@/src/presentation/components/admin/confirm-button";
import {
  deleteRankingAction,
  publishRankingAction,
  recalculateRankingAction,
  unpublishRankingAction,
} from "@/src/presentation/actions/admin-actions";
import { getDictionary, trans } from "@/src/lib/i18n";

export default async function AdminRankingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ranking = await rankingAdminCommands.getDetail(id);
  if (!ranking) notFound();

  const dict = await getDictionary();

  return (
    <Container className="max-w-4xl py-10">
      <Link href="/admin/rankings" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.rankings.backSingle}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{ranking.name}</h1>
            <StatusBadge status={ranking.status} />
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {ranking.slug} · {dict.periodType[ranking.periodType]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/rankings/${ranking.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            <Pencil className="size-4" aria-hidden="true" />
            {dict.common.edit}
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ConfirmButton
          action={recalculateRankingAction}
          id={ranking.id}
          message={dict.admin.confirmation.recalculateRanking}
          workingLabel={dict.common.working}
          className="border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {dict.admin.rankings.recalculate}
        </ConfirmButton>
        {ranking.status === "PUBLISHED" ? (
          <ConfirmButton
            action={unpublishRankingAction}
            id={ranking.id}
            message={dict.admin.confirmation.unpublishRanking}
            workingLabel={dict.common.working}
            className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            {dict.common.unpublish}
          </ConfirmButton>
        ) : (
          <ConfirmButton
            action={publishRankingAction}
            id={ranking.id}
            message={dict.admin.confirmation.publishRanking}
            workingLabel={dict.common.working}
            className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            {dict.common.publish}
          </ConfirmButton>
        )}
        <ConfirmButton
          action={deleteRankingAction}
          id={ranking.id}
          message={dict.admin.confirmation.deleteRanking}
          workingLabel={dict.common.working}
          className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
        >
          {dict.common.delete}
        </ConfirmButton>
      </div>

      <dl className="mt-8 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-sm shadow-sm sm:grid-cols-2">
        <Row label={dict.common.status} value={ranking.status} />
        <Row label={dict.admin.rankings.periodType} value={dict.periodType[ranking.periodType]} />
        <Row label={dict.admin.rankings.industry} value={ranking.industryId ?? "—"} />
        <Row label={dict.admin.rankings.category} value={ranking.categoryId ?? "—"} />
        <Row label={dict.admin.rankings.periodStart} value={ranking.periodStart ? formatDate(ranking.periodStart) : "—"} />
        <Row label={dict.admin.rankings.periodEnd} value={ranking.periodEnd ? formatDate(ranking.periodEnd) : "—"} />
        <Row label={dict.admin.rankings.created} value={formatDate(ranking.createdAt)} />
        <Row label={dict.admin.rankings.updated} value={formatDate(ranking.updatedAt)} />
      </dl>

      <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {trans(dict.admin.rankings.entriesTitle, { count: ranking.entries.length })}
          </h2>
        </div>
        {ranking.entries.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.rankings.rank}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.rankings.tool}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.rankings.score}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.entries.map((entry) => (
                <tr key={`${entry.rank}-${entry.toolSlug}`} className="border-b last:border-0">
                  <td className="px-5 py-3 font-medium text-zinc-900">#{entry.rank}</td>
                  <td className="px-5 py-3 text-zinc-700">
                    {entry.toolName}
                    <span className="ml-2 text-xs text-zinc-400">{entry.toolSlug}</span>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{entry.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-zinc-400">
            {dict.admin.rankings.noEntries}
          </p>
        )}
      </section>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="max-w-[70%] break-words text-right font-medium text-zinc-800">{value}</dd>
    </div>
  );
}