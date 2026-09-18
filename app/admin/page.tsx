export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <Container className="max-w-3xl py-12 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
        Admin
      </h1>
      <p className="mt-2 text-zinc-600">
        Signed in as <span className="font-medium text-zinc-900">{user.email}</span>.
      </p>
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-900">MVP scope</h2>
        <p className="mt-1 text-sm text-amber-800">
          The admin dashboard ships after the MVP. Repository-level admin
          boundaries are already enforced through{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">requireAdmin</code>.
        </p>
      </div>
    </Container>
  );
}