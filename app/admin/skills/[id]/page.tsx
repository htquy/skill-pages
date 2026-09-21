export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Eye, Archive } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { skillAdminCommands } from "@/src/infrastructure/composition";
import { formatDate, formatNumber } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import { StatusBadge, accessTypeLabel } from "@/src/presentation/components/admin/status-badge";
import { ConfirmButton } from "@/src/presentation/components/admin/confirm-button";
import {
  deleteSkillAction,
  publishSkillAction,
  unpublishSkillAction,
} from "@/src/presentation/actions/admin-actions";

export default async function AdminSkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDictionary();
  const { id } = await params;
  const skill = await skillAdminCommands.getDetail(id);
  if (!skill) notFound();

  return (
    <Container className="max-w-4xl py-10">
      <Link href="/admin/skills" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.skills.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{skill.title}</h1>
            <StatusBadge status={skill.status} />
            <StatusBadge status={skill.accessType === "PAID" ? "PAID_SKILL" : "FREE"} />
          </div>
          <p className="mt-2 max-w-2xl text-zinc-600">{skill.shortDescription}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {skill.slug} · v{skill.version} · {trans(dict.admin.skills.updatedAt, { date: formatDate(skill.updatedAt ?? new Date()) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/skills/${skill.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <Eye className="size-4" aria-hidden="true" />
            {dict.admin.skills.viewPage}
          </Link>
          <Link
            href={`/admin/skills/${skill.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            <Pencil className="size-4" aria-hidden="true" />
            {dict.common.edit}
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {skill.status === "PUBLISHED" ? (
          <ConfirmButton action={unpublishSkillAction} id={skill.id} message={dict.admin.confirmation.unpublishSkill} workingLabel={dict.common.working} className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100">
            <Archive className="size-4" aria-hidden="true" />
            {dict.common.unpublish}
          </ConfirmButton>
        ) : (
          <ConfirmButton action={publishSkillAction} id={skill.id} message={dict.admin.confirmation.publishSkill} workingLabel={dict.common.working} className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            {dict.common.publish}
          </ConfirmButton>
        )}
        <ConfirmButton
          action={deleteSkillAction}
          id={skill.id}
          message={dict.admin.confirmation.deleteSkill}
          workingLabel={dict.common.working}
          className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
        >
          {dict.common.delete}
        </ConfirmButton>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          [dict.admin.skills.views, formatNumber(skill.viewCount ?? 0)],
          [dict.admin.skills.saves, formatNumber(skill.favoriteCount ?? 0)],
          [dict.admin.skills.rating, skill.ratingAverage === null ? "—" : `${skill.ratingAverage}/5`],
          [dict.admin.skills.ratingCount, formatNumber(skill.ratingCount ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.skills.description}</h2>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {skill.description}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.skills.promptContent}</h2>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-50 p-5 font-mono text-sm leading-relaxed text-zinc-800 ring-1 ring-zinc-100">
            {skill.content}
          </pre>
          {skill.instructions ? (
            <p className="mt-4 text-sm text-zinc-600">
              <span className="font-medium">{dict.admin.skills.howToUse}</span> {skill.instructions}
            </p>
          ) : null}
          {skill.changelog ? (
            <p className="mt-2 text-sm text-zinc-500">
              <span className="font-medium">{dict.admin.skills.changelog}</span> {skill.changelog}
            </p>
          ) : null}
          {skill.variables ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-700">{dict.admin.skills.inputFields}</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 font-mono text-xs text-zinc-700 ring-1 ring-zinc-100">
                {JSON.stringify(skill.variables, null, 2)}
              </pre>
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.skills.classification}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Row label={dict.admin.skills.accessType} value={accessTypeLabel(skill.accessType, dict)} />
              <Row label={dict.admin.skills.price} value={skill.price ? `${skill.price.currency} ${skill.price.amount}` : "—"} />
              <Row label={dict.admin.skills.industries} value={skill.industrySlugs.join(", ") || "—"} />
              <Row label={dict.admin.skills.categories} value={skill.categorySlugs.join(", ") || "—"} />
              <Row label={dict.admin.skills.useCases} value={skill.useCaseSlugs.join(", ") || "—"} />
              <Row label={dict.admin.skills.tools} value={skill.toolSlugs.join(", ") || "—"} />
              <Row label={dict.admin.skills.published} value={skill.publishedAt ? formatDate(skill.publishedAt) : "—"} />
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.skills.statusHistory}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Row label={dict.common.status} value={skill.status} />
              <Row label={dict.common.created} value={formatDate(skill.createdAt)} />
              <Row label={dict.admin.skills.lastUpdated} value={formatDate(skill.updatedAt)} />
              <Row label={dict.common.author} value={skill.authorId ?? "—"} />
            </dl>
          </section>
        </div>
      </div>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-800">{value}</dd>
    </div>
  );
}