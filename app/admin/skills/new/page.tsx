export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { taxonomyQueries } from "@/src/infrastructure/composition";
import { getDictionary } from "@/src/lib/i18n";
import { SkillForm } from "@/src/presentation/components/admin/skill-form";

export default async function AdminSkillNewPage() {
  await requireAdmin();
  const [dict, taxonomy] = await Promise.all([getDictionary(), taxonomyQueries.getAdminOptions()]);

  return (
    <Container className="max-w-4xl py-10">
      <Link href="/admin/skills" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.skills.back}
      </Link>
      <div className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.skills.newTitle}</h1>
        <p className="mt-1 text-zinc-500">{dict.admin.skills.newSubtitle}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <SkillForm dict={dict} taxonomy={taxonomy} />
      </div>
    </Container>
  );
}