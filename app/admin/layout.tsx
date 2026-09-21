import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { AdminSidebar } from "@/src/presentation/components/layout/admin-sidebar";
import { getDictionary } from "@/src/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const dict = await getDictionary();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AdminSidebar dict={dict} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}