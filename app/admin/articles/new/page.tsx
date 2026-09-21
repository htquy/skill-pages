export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { articleAdminCommands, taxonomyQueries } from "@/src/infrastructure/composition";
import { ArticleForm } from "@/src/presentation/components/admin/article-form";
import { getDictionary } from "@/src/lib/i18n";

export default async function AdminArticleNewPage() {
  await requireAdmin();
  const [dict, categories, taxonomy] = await Promise.all([
    getDictionary(),
    articleAdminCommands.listCategories(),
    taxonomyQueries.getAdminOptions(),
  ]);

  return (
    <Container className="max-w-4xl py-10">
      <Link href="/admin/articles" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← {dict.admin.articles.back}
      </Link>
      <div className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{dict.admin.articles.newTitle}</h1>
        <p className="mt-1 text-zinc-500">{dict.admin.articles.newSubtitle}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ArticleForm options={{ categories, tools: taxonomy.tools }} dict={dict} />
      </div>
    </Container>
  );
}