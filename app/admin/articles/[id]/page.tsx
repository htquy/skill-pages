export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, ExternalLink } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { articleAdminCommands } from "@/src/infrastructure/composition";
import { formatDate } from "@/src/lib/utils";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { ConfirmButton } from "@/src/presentation/components/admin/confirm-button";
import {
  deleteArticleAction,
  publishArticleAction,
  unpublishArticleAction,
} from "@/src/presentation/actions/admin-actions";
import { getDictionary, trans } from "@/src/lib/i18n";

export default async function AdminArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await articleAdminCommands.getDetail(id);
  if (!article) notFound();

  const dict = await getDictionary();

  return (
    <Container className="max-w-4xl py-10">
      <Link href="/admin/articles" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.articles.backSingle}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{article.title}</h1>
            <StatusBadge status={article.status} />
          </div>
          <p className="mt-2 max-w-2xl text-zinc-600">{article.excerpt ?? dict.admin.articles.noExcerpt}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {article.slug} · {trans(dict.admin.articles.fromSource, { source: article.sourceName })}
            {article.publishedAt
              ? ` · ${trans(dict.admin.articles.publishedOn, { date: formatDate(article.publishedAt) })}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {article.sourceUrl ? (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              {dict.admin.articles.source}
            </a>
          ) : null}
          <Link
            href={`/admin/articles/${article.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            <Pencil className="size-4" aria-hidden="true" />
            {dict.common.edit}
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {article.status === "PUBLISHED" ? (
          <ConfirmButton
            action={unpublishArticleAction}
            id={article.id}
            message={dict.admin.confirmation.unpublishArticle}
            workingLabel={dict.common.working}
            className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            {dict.common.unpublish}
          </ConfirmButton>
        ) : (
          <ConfirmButton
            action={publishArticleAction}
            id={article.id}
            message={dict.admin.confirmation.publishArticle}
            workingLabel={dict.common.working}
            className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            {dict.common.publish}
          </ConfirmButton>
        )}
        <ConfirmButton
          action={deleteArticleAction}
          id={article.id}
          message={dict.admin.confirmation.deleteArticle}
          workingLabel={dict.common.working}
          className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
        >
          {dict.common.delete}
        </ConfirmButton>
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.articles.content}</h2>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {article.content}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{dict.admin.articles.metadata}</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Row label={dict.common.status} value={article.status} />
            <Row label={dict.admin.articles.category} value={article.categorySlug ?? "—"} />
            <Row label={dict.admin.skills.tools} value={article.toolSlugs.join(", ") || "—"} />
            <Row label={dict.admin.articles.coverImage} value={article.coverImageUrl ?? "—"} />
            <Row label={dict.common.created} value={formatDate(article.createdAt)} />
            <Row label={dict.admin.articles.publishedAt} value={article.publishedAt ? formatDate(article.publishedAt) : "—"} />
vvvvvvvvvvvvvvvvv          </dl>
        </section>
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