export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { toolAdminCommands } from "@/src/infrastructure/composition";
import { formatMoney } from "@/src/domain/shared";
import { formatDate } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { Pagination } from "@/src/presentation/components/shared/pagination";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const TYPE_OPTIONS = ["ALL", "DOWNLOADABLE", "EMBED_WIDGET", "MCP_SERVER", "WEB_APP"] as const;
const BILLING_OPTIONS = ["ALL", "FREE", "ONE_TIME", "SUBSCRIPTION"] as const;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export default async function AdminToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [dict, params] = await Promise.all([getDictionary(), searchParams]);
  const q = firstValue(params.q);
  const status = firstValue(params.status) || "ALL";
  const type = firstValue(params.type) || "ALL";
  const billing = firstValue(params.billing) || "ALL";
  const page = Math.max(1, Number(firstValue(params.page)) || 1);

  const result = await toolAdminCommands.list(
    { q, status, type, billingType: billing },
    { page, pageSize: PAGE_SIZE },
  );

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status !== "ALL") query.set("status", status);
  if (type !== "ALL") query.set("type", type);
  if (billing !== "ALL") query.set("billing", billing);

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.tools.title}</h1>
          <p className="mt-1 text-zinc-500">{trans(dict.admin.tools.count, { count: result.total })}</p>
        </div>
        <Link
          href="/admin/tools/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          {dict.admin.tools.new}
        </Link>
      </div>

      <form action="/admin/tools" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            {dict.admin.tools.searchLabel}
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={dict.admin.tools.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            {dict.admin.tools.status}
          </span>
          <select name="status" defaultValue={status} className={selectClass}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? dict.admin.tools.allStatuses
                  : (dict.status as Record<string, string>)[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            {dict.admin.tools.type}
          </span>
          <select name="type" defaultValue={type} className={selectClass}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.tools.allTypes : dict.tools.types[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            {dict.admin.tools.billing}
          </span>
          <select name="billing" defaultValue={billing} className={selectClass}>
            {BILLING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? dict.admin.tools.allBilling
                  : dict.tools.billingTypes[option]}
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
          <Link
            href="/admin/tools"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            {dict.common.clear}
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.tools.toolHeader}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.common.status}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.tools.type}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.tools.billing}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.tools.price}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.tools.version}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.common.updated}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((tool) => (
                <tr key={tool.id} className="border-b last:border-0 hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/tools/${tool.id}`}
                      className="font-medium text-zinc-900 hover:text-indigo-700"
                    >
                      {tool.title}
                    </Link>
                    <p className="text-xs text-zinc-400">{tool.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={tool.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{dict.tools.types[tool.type]}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {dict.tools.billingTypes[tool.billingType]}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {tool.billingType === "FREE"
                      ? dict.tools.freeToUse
                      : (tool.price
                          ? formatMoney(tool.price.amount, tool.price.currency)
                          : dict.common.noData)}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{tool.latestVersion ?? dict.common.noData}</td>
                  <td className="px-5 py-3 text-zinc-500">{formatDate(tool.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-400">{dict.admin.tools.empty}</p>
        )}
      </div>

      <Pagination
        info={{ page: result.page, totalPages: result.totalPages, total: result.total }}
        path="/admin/tools"
        params={query}
      />
    </Container>
  );
}
