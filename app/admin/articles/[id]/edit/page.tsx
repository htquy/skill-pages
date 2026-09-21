export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { articleAdminCommands, taxonomyQueries } from "@/src/infrastructure/composition";
import { ArticleForm } from "@/src/presentation/components/admin/article-form";
import { getDictionary } from "@/src/lib/i18n";

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [dict, article, categories, taxonomy] = await Promise.all([
    getDictionary(),
    articleAdminCommands.getDetail(id),
    articleAdminCommands.listCategories(),
    taxonomyQueries.getAdminOptions(),
  ]);
  if (!article) notFound();

  return (
    <Container className="max-w-4xl py-10">
      <Link href={`/admin/articles/${article.id}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.articles.backSingle}
      </Link>
      <div className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.articles.editTitle}</h1>
        <p className="mt-1 text-zinc-500">{dict.admin.articles.editSubtitle}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ArticleForm article={article} options={{ categories, tools: taxonomy.tools }} dict={dict} />
      </div>
    </Container>
  );
}