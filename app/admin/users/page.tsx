import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { userCommands } from "@/src/infrastructure/composition";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const result = await userCommands.listUsers({}, { page: 1, pageSize: 50 });
  return <Container className="py-10"><h1 className="text-3xl font-bold">Users</h1><div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-zinc-50"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Orders</th></tr></thead><tbody>{result.items.map((user) => <tr key={user.id} className="border-b last:border-0"><td className="px-5 py-3"><div className="font-medium">{user.name ?? "Unnamed"}</div><div className="text-zinc-500">{user.email}</div></td><td className="px-5 py-3">{user.role}</td><td className="px-5 py-3">{user.status}</td><td className="px-5 py-3">{user.orderCount}</td></tr>)}</tbody></table></div></Container>;
}
