export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { articleAdminCommands } from "@/src/infrastructure/composition";
import { formatDate } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { Pagination } from "@/src/presentation/components/shared/pagination";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const dict = await getDictionary();
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q ?? "";
  const status = Array.isArray(params.status) ? params.status[0] : params.status ?? "ALL";
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const result = await articleAdminCommands.list({ q, status }, { page, pageSize: PAGE_SIZE });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status !== "ALL") query.set("status", status);

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.articles.title}</h1>
          <p className="mt-1 text-zinc-500">{trans(dict.admin.articles.count, { count: result.total })}</p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          {dict.admin.articles.new}
        </Link>
      </div>

      <form action="/admin/articles" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.articles.searchLabel}</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={dict.admin.articles.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.articles.status}</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.articles.allStatuses : (dict.status as Record<string, string>)[option]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          {dict.common.apply}
        </button>
        {query.toString() ? (
          <Link href="/admin/articles" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
            {dict.common.clear}
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.articles.articleHeader}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.articles.category}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.articles.status}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.articles.source}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.articles.updated}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((article) => (
                <tr key={article.id} className="border-b last:border-0 hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/articles/${article.id}`} className="font-medium text-zinc-900 hover:text-indigo-700">
                      {article.title}
                    </Link>
                    <p className="text-xs text-zinc-400">{article.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{article.categoryName ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{article.sourceName}</td>
                  <td className="px-5 py-3 text-zinc-500">{formatDate(article.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-400">{dict.admin.articles.empty}</p>
        )}
      </div>

      <Pagination
        info={{ page: result.page, totalPages: result.totalPages, total: result.total }}
        path="/admin/articles"
        params={query}
      />
    </Container>
  );
}