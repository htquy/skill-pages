export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { userCommands } from "@/src/infrastructure/composition";
import { formatDate, formatNumber } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { Pagination } from "@/src/presentation/components/shared/pagination";
import type { UserRole, UserStatus } from "@/src/domain/identity/entities";

const PAGE_SIZE = 20;
const ROLE_OPTIONS = ["ALL", "ADMIN", "CUSTOMER"];
const STATUS_OPTIONS = ["ALL", "ACTIVE", "BLOCKED"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const dict = await getDictionary();
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q ?? "";
  const role = Array.isArray(params.role) ? params.role[0] : params.role ?? "ALL";
  const status = Array.isArray(params.status) ? params.status[0] : params.status ?? "ALL";
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const result = await userCommands.listUsers(
    {
      q,
      role: role === "ALL" ? undefined : (role as UserRole),
      status: status === "ALL" ? undefined : (status as UserStatus),
    },
    { page, pageSize: PAGE_SIZE },
  );

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (role !== "ALL") query.set("role", role);
  if (status !== "ALL") query.set("status", status);

  return (
    <Container className="py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.users.title}</h1>
        <p className="mt-1 text-zinc-500">{trans(dict.admin.users.count, { count: result.total })}</p>
      </div>

      <form action="/admin/users" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.users.searchLabel}</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={dict.admin.users.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.users.role}</span>
          <select
            name="role"
            defaultValue={role}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.users.allRoles : (dict.role as Record<string, string>)[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{dict.admin.users.status}</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? dict.admin.users.allStatuses : (dict.status as Record<string, string>)[option]}
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
          <Link href="/admin/users" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
            {dict.common.clear}
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {result.items.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.users.userHeader}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.users.role}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.users.status}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.users.orders}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.users.paid}</th>
                <th className="px-5 py-3 font-medium text-zinc-500">{dict.admin.users.joined}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/users/${user.id}`} className="font-medium text-zinc-900 hover:text-indigo-700">
                      {user.name ?? dict.admin.users.unnamed}
                    </Link>
                    <p className="text-xs text-zinc-400">{user.email ?? user.id}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{dict.role[user.role]}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{user.orderCount}</td>
                  <td className="px-5 py-3 text-zinc-600">{formatNumber(user.paidAmount)}</td>
                  <td className="px-5 py-3 text-zinc-500">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-400">{dict.admin.users.empty}</p>
        )}
      </div>

      <Pagination
        info={{ page: result.page, totalPages: result.totalPages, total: result.total }}
        path="/admin/users"
        params={query}
      />
    </Container>
  );
}