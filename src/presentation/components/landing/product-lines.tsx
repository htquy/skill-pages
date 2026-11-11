import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import {
  countFor,
  productLines,
  type StoreCounts,
} from "@/src/presentation/components/landing/product-lines-meta";
import { siteConfig } from "@/src/lib/site";
import { getDictionary, getLocale, trans } from "@/src/lib/i18n";

// Lưới 6 cột: hai dòng chủ lực (web app, MCP) rộng hơn, ba dòng còn lại chia đều hàng dưới.
const spans = ["lg:col-span-3", "lg:col-span-3", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2"];

/** Định hướng phát triển: mỗi dòng sản phẩm kèm số sản phẩm đã xuất bản thật. */
export async function ProductLines({ counts }: { counts: StoreCounts }) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const pl = dict.landing.productLines;
  const number = new Intl.NumberFormat(locale);

  return (
    <section className="border-b border-zinc-200 bg-surface py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="eyebrow">{pl.badge}</div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {pl.title}
          </h2>
          <p className="mt-4 text-base text-zinc-600 [text-wrap:pretty]">{pl.subtitle}</p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          {productLines.map((line, index) => {
            const { key } = line;
            const count = countFor(key, counts);
            const title = key === "SKILLS" ? pl.skillsTitle : dict.tools.types[key];
            const description =
              key === "SKILLS" ? pl.skillsDescription : trans(pl.descriptions[key], { name: siteConfig.name });

            return (
              <li key={line.key} className={spans[index]}>
                <Link
                  href={line.href}
                  className="group card-lift reveal flex h-full flex-col rounded-3xl border border-zinc-200 bg-surface p-6 sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`inline-grid size-12 place-items-center rounded-xl transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110 ${line.tile}`}
                    >
                      <line.Icon className="size-6" aria-hidden="true" />
                    </span>
                    {count > 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium tabular-nums text-emerald-700 ring-1 ring-emerald-200">
                        {trans(pl.liveCount, { count: number.format(count) })}
                      </span>
                    ) : (
                      <span className="rounded-full bg-spark-50 px-2.5 py-1 text-xs font-medium text-spark-700 ring-1 ring-spark-200">
                        {pl.building}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-zinc-950">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">
                    {description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    {pl.explore}
                    <ArrowRight
                      className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
