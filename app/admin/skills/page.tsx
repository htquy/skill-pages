export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { skillAdminCommands } from "@/src/infrastructure/composition";
import { formatDate, formatNumber } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import { StatusBadge, accessTypeLabel } from "@/src/presentation/components/admin/status-badge";
import { Pagination } from "@/src/presentation/components/shared/pagination";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];
const ACCESS_OPTIONS = ["ALL", "FREE", "PAID"];

export default async function AdminSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const dict = await getDictionary();
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q ?? "";
  const status = Array.isArray(params.status) ? params.status[0] : params.status ?? "ALL";
  const access = Array.isArray(params.access) ? params.access[0] : params.access ?? "ALL";
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const result = await skillAdminCommands.list({ q, status, accessType: access }, { page, pageSize: PAGE_SIZE });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status !== "ALL") query.set("status", status);
  if (access !== "ALL") query.set("access", access);

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.skills.title}</h1>
          <p className="mt-1 text-zinc-500">{trans(dict.admin.skills.count, { count: result.total })}</p>
        </div>
        <Link
          href="/admin/skills/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          {dict.admin.skills.new}
        </Link>
      </div>

      <form action="/admin/skills" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.skills.searchLabel}</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={dict.admin.skills.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.skills.status}</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.skills.allStatuses : (dict.status as Record<string, string>)[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.skills.access}</span>
          <select
            name="access"
            defaultValue={access}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {ACCESS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.skills.allAccessLevels : accessTypeLabel(option, dict)}
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
          <Link href="/admin/skills" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
            {dict.common.clear}
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.skills.skillHeader}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.skills.status}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.skills.access}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.skills.views}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.skills.saves}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.skills.updated}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((skill) => (
                <tr key={skill.id} className="border-b last:border-0 hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/skills/${skill.id}`} className="font-medium text-zinc-900 hover:text-indigo-700">
                      {skill.title}
                    </Link>
                    <p className="text-xs text-zinc-400">{skill.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={skill.status} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={skill.accessType === "PAID" ? "PAID_SKILL" : "FREE"} />
                    {skill.price ? (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {formatNumber(skill.price.amount)} {skill.price.currency}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{formatNumber(skill.viewCount)}</td>
                  <td className="px-5 py-3 text-zinc-600">{formatNumber(skill.favoriteCount)}</td>
                  <td className="px-5 py-3 text-zinc-500">{formatDate(skill.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-400">
            {dict.admin.skills.empty}
          </p>
        )}
      </div>

      <Pagination
        info={{ page: result.page, totalPages: result.totalPages, total: result.total }}
        path="/admin/skills"
        params={query}
      />
    </Container>
  );
}