export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { rankingAdminCommands, taxonomyQueries } from "@/src/infrastructure/composition";
import { RankingForm } from "@/src/presentation/components/admin/ranking-form";
import { getDictionary } from "@/src/lib/i18n";

export default async function AdminRankingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [dict, ranking, taxonomy] = await Promise.all([
    getDictionary(),
    rankingAdminCommands.getDetail(id),
    taxonomyQueries.getAdminOptions(),
  ]);
  if (!ranking) notFound();

  return (
    <Container className="max-w-3xl py-10">
      <Link href={`/admin/rankings/${ranking.id}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.rankings.backSingle}
      </Link>
      <div className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.rankings.editTitle}</h1>
        <p className="mt-1 text-zinc-500">{dict.admin.rankings.editSubtitle}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <RankingForm
          ranking={ranking}
          industries={taxonomy.industries}
          categories={taxonomy.categories}
          dict={dict}
        />
      </div>
    </Container>
  );
}