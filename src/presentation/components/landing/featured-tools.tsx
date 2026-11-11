import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { ToolGrid } from "@/src/presentation/components/tools/tool-grid";
import { lowestPlanPrice, toToolCardViewModel } from "@/src/presentation/view-models/tool";
import { appsService, toolQueries } from "@/src/infrastructure/composition";
import { getDictionary } from "@/src/lib/i18n";

/** Ba công cụ xuất bản gần nhất; kho chưa có công cụ nào thì ẩn hẳn mục này. */
export async function FeaturedTools() {
  const [dict, result, apps] = await Promise.all([
    getDictionary(),
    toolQueries.list({}, { page: 1, pageSize: 3 }),
    appsService.listActiveApps(),
  ]);
  if (result.items.length === 0) return null;

  // Giống trang /tools: tool liên kết app hiển thị giá gói thật.
  const appPrices = new Map(apps.map((app) => [app.slug, lowestPlanPrice(app.plans)]));
  const tools = result.items.map((tool) => toToolCardViewModel(tool, appPrices, dict));
  const featured = dict.landing.featured;

  return (
    <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50/70 to-background py-16 sm:py-24">
      <Container>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">{featured.badge}</div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
              {featured.title}
            </h2>
          </div>
          <Link href="/tools" className="btn-secondary group shrink-0 text-sm">
            {featured.viewAll}
            <ArrowRight
              className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
        <ToolGrid tools={tools} />
      </Container>
    </section>
  );
}
