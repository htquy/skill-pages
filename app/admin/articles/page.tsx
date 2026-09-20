import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { articleAdminCommands } from "@/src/infrastructure/composition";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  await requireAdmin();
  const result = await articleAdminCommands.list({}, { page: 1, pageSize: 50 });
  return <Container className="py-10"><h1 className="text-3xl font-bold">Articles</h1><div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-zinc-50"><tr><th className="px-5 py-3">Title</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th></tr></thead><tbody>{result.items.map((article) => <tr key={article.id} className="border-b last:border-0"><td className="px-5 py-3 font-medium">{article.title}</td><td className="px-5 py-3">{article.categoryName ?? "—"}</td><td className="px-5 py-3">{article.status}</td><td className="px-5 py-3">{article.updatedAt.toLocaleDateString("en-US")}</td></tr>)}</tbody></table></div></Container>;
}
