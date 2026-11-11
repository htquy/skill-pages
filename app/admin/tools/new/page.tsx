export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { getDictionary } from "@/src/lib/i18n";
import { appsService } from "@/src/infrastructure/composition";
import { ToolForm } from "@/src/presentation/components/admin/tool-form";

export default async function AdminToolNewPage({
  searchParams,
}: {
  searchParams: Promise<{ app?: string | string[] }>;
}) {
  await requireAdmin();
  const [dict, params, apps] = await Promise.all([
    getDictionary(),
    searchParams,
    appsService.listActiveApps(),
  ]);
  // "Tạo trang giới thiệu" ở trang Ứng dụng & gói mở form với ?app=<slug> chọn sẵn.
  const defaultAppSlug = typeof params.app === "string" ? params.app : undefined;

  return (
    <Container className="max-w-4xl py-10">
      <Link href="/admin/tools" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.tools.back}
      </Link>
      <div className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.tools.newTitle}</h1>
        <p className="mt-1 text-zinc-500">{dict.admin.tools.newSubtitle}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
        <ToolForm
          dict={dict}
          apps={apps.map((app) => ({ slug: app.slug, name: app.name }))}
          defaultAppSlug={defaultAppSlug}
        />
      </div>
    </Container>
  );
}
