export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { ShieldBan, ShieldCheck, Upload } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { userCommands } from "@/src/infrastructure/composition";
import { formatDate, formatNumber } from "@/src/lib/utils";
import { getDictionary } from "@/src/lib/i18n";
import { StatusBadge } from "@/src/presentation/components/admin/status-badge";
import { ConfirmButton } from "@/src/presentation/components/admin/confirm-button";
import { blockUserAction, unblockUserAction, changeUserRoleAction } from "@/src/presentation/actions/admin-actions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDictionary();
  const { id } = await params;
  const result = await userCommands.listUsers({ q: id }, { page: 1, pageSize: 50 });
  const user = result.items.find((item) => item.id === id);
  if (!user) notFound();

  const isAdmin = user.role === "ADMIN";
  const promoteAction = changeUserRoleAction.bind(null, user.id, "ADMIN") as unknown as (id: string) => void;
  const demoteAction = changeUserRoleAction.bind(null, user.id, "CUSTOMER") as unknown as (id: string) => void;

  return (
    <Container className="max-w-3xl py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              {user.name ?? dict.admin.users.unnamedUser}
            </h1>
            <StatusBadge status={user.status} />
          </div>
          <p className="mt-2 text-zinc-500">{user.email ?? dict.admin.users.noEmail}</p>
          <p className="text-xs text-zinc-400">{user.id}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {user.status === "BLOCKED" ? (
          <ConfirmButton action={unblockUserAction} id={user.id} message={dict.admin.confirmation.unblockUser} workingLabel={dict.common.working} className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {dict.admin.users.unblock}
          </ConfirmButton>
        ) : (
          <ConfirmButton action={blockUserAction} id={user.id} message={dict.admin.confirmation.blockUser} workingLabel={dict.common.working} className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100">
            <ShieldBan className="size-4" aria-hidden="true" />
            {dict.admin.users.block}
          </ConfirmButton>
        )}

        {isAdmin ? (
          <ConfirmButton
            action={demoteAction}
            id={user.id}
            message={dict.admin.confirmation.demoteUser}
            workingLabel={dict.common.working}
            className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            <Upload className="size-4" aria-hidden="true" />
            {dict.admin.users.demote}
          </ConfirmButton>
        ) : (
          <ConfirmButton
            action={promoteAction}
            id={user.id}
            message={dict.admin.confirmation.promoteUser}
            workingLabel={dict.common.working}
            className="border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
          >
            {dict.admin.users.promote}
          </ConfirmButton>
        )}
      </div>

      <dl className="mt-8 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-sm shadow-sm sm:grid-cols-2">
        <Row label={dict.admin.users.role} value={dict.role[user.role]} />
        <Row label={dict.admin.users.status} value={dict.status[user.status]} />
        <Row label={dict.admin.users.orders} value={String(user.orderCount)} />
        <Row label={dict.admin.users.paidAmount} value={formatNumber(user.paidAmount)} />
        <Row label={dict.admin.users.skillAccess} value={String(user.accessCount)} />
        <Row label={dict.admin.users.lastLogin} value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"} />
        <Row label={dict.admin.users.joined} value={formatDate(user.createdAt)} />
      </dl>

      <p className="mt-4 text-xs text-zinc-400">{dict.admin.users.note}</p>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}