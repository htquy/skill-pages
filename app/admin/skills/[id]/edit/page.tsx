export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { skillAdminCommands, taxonomyQueries } from "@/src/infrastructure/composition";
import { getDictionary } from "@/src/lib/i18n";
import { SkillForm } from "@/src/presentation/components/admin/skill-form";

export default async function AdminSkillEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [dict, skill, taxonomy] = await Promise.all([
    getDictionary(),
    skillAdminCommands.getDetail(id),
    taxonomyQueries.getAdminOptions(),
  ]);
  if (!skill) notFound();

  return (
    <Container className="max-w-4xl py-10">
      <Link href={`/admin/skills/${skill.id}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.skills.backSingle}
      </Link>
      <div className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.skills.editTitle}</h1>
        <p className="mt-1 text-zinc-500">{dict.admin.skills.editSubtitle}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <SkillForm dict={dict} skill={skill} taxonomy={taxonomy} />
      </div>
    </Container>
  );
}