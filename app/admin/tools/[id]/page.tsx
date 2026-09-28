export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Archive, Eye, Pencil } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { toolAdminCommands } from "@/src/infrastructure/composition";
import { formatMoney } from "@/src/domain/shared";
import { formatDate } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import { RichText } from "@/src/presentation/components/shared/rich-text";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { ConfirmButton } from "@/src/presentation/components/admin/confirm-button";
import { formatSize } from "@/src/presentation/components/upload/format-size";
import {
  deleteToolAction,
  publishToolAction,
  unpublishToolAction,
} from "@/src/presentation/actions/admin-actions";

export default async function AdminToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const dict = await getDictionary();
  const { id } = await params;
  const tool = await toolAdminCommands.getDetail(id);
  if (!tool) notFound();

  return (
    <Container className="max-w-4xl py-10">
      <Link href="/admin/tools" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.tools.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{tool.title}</h1>
            <StatusBadge status={tool.status} />
          </div>
          <p className="mt-2 max-w-2xl text-zinc-600">{tool.shortDescription}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {tool.slug} · {trans(dict.admin.tools.updatedAt, { date: formatDate(tool.updatedAt) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tool.status === "PUBLISHED" ? (
            <Link
              href={`/tools/${tool.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <Eye className="size-4" aria-hidden="true" />
              {dict.admin.tools.viewPage}
            </Link>
          ) : null}
          <Link
            href={`/admin/tools/${tool.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            <Pencil className="size-4" aria-hidden="true" />
            {dict.common.edit}
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tool.status === "PUBLISHED" ? (
          <ConfirmButton
            action={unpublishToolAction}
            id={tool.id}
            message={dict.admin.confirmation.unpublishTool}
            workingLabel={dict.common.working}
            className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            <Archive className="size-4" aria-hidden="true" />
            {dict.common.unpublish}
          </ConfirmButton>
        ) : (
          <ConfirmButton
            action={publishToolAction}
            id={tool.id}
            message={dict.admin.confirmation.publishTool}
            workingLabel={dict.common.working}
            className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            {dict.common.publish}
          </ConfirmButton>
        )}
        <ConfirmButton
          action={deleteToolAction}
          id={tool.id}
          message={dict.admin.confirmation.deleteTool}
          workingLabel={dict.common.working}
          className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
        >
          {dict.common.delete}
        </ConfirmButton>
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.tools.description}</h2>
          <RichText html={tool.description} className="mt-3 text-sm" />
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.tools.classification}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Row label={dict.admin.tools.type} value={dict.tools.types[tool.type]} />
              <Row
                label={dict.admin.tools.billing}
                value={dict.tools.billingTypes[tool.billingType]}
              />
              <Row label={dict.admin.forms.appUrl} value={tool.appUrl ?? "—"} />
              <Row
                label={dict.admin.skills.published}
                value={tool.publishedAt ? formatDate(tool.publishedAt) : "—"}
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.tools.statusHistory}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Row label={dict.common.status} value={tool.status} />
              <Row label={dict.common.created} value={formatDate(tool.createdAt)} />
              <Row label={dict.admin.tools.lastUpdated} value={formatDate(tool.updatedAt)} />
            </dl>
          </section>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.tools.prices}</h2>
          {tool.prices.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {tool.prices.map((price, index) => (
                <li
                  key={`${price.currency}-${price.durationDays}-${index}`}
                  className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-zinc-500">{price.durationDays || "∞"}</span>
                  <span className="font-medium text-zinc-800">
                    {formatMoney(price.amount, price.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">{dict.admin.tools.noPrices}</p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.tools.versionTitle}</h2>
          {tool.version ? (
            <dl className="mt-3 space-y-3 text-sm">
              <Row label={dict.admin.tools.version} value={tool.version.versionCode} />
              <Row
                label={dict.admin.tools.downloadFile}
                value={tool.version.fileName ?? "—"}
              />
              <Row
                label={dict.tools.fileSize}
                value={tool.version.fileSize ? formatSize(tool.version.fileSize) : "—"}
              />
              <Row label={dict.admin.tools.scriptUrl} value={tool.version.scriptUrl ?? "—"} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">{dict.admin.tools.noVersion}</p>
          )}
          {tool.version?.changelog ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-700">{dict.admin.forms.changelog}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{tool.version.changelog}</p>
            </div>
          ) : tool.version ? (
            <p className="mt-4 text-sm text-zinc-400">{dict.admin.tools.noChangelog}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.tools.configTitle}</h2>
          {tool.config ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-5 font-mono text-xs leading-relaxed text-zinc-800 ring-1 ring-zinc-100">
              {JSON.stringify(tool.config, null, 2)}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">{dict.admin.tools.noConfig}</p>
          )}
        </section>
      </div>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="break-all text-right font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
