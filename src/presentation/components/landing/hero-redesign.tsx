import Link from "next/link";
import { ArrowRight, ChevronRight, Database, Sparkles } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import {
  countFor,
  productLines,
  type StoreCounts,
} from "@/src/presentation/components/landing/product-lines-meta";
import { siteConfig } from "@/src/lib/site";
import { getDictionary, getLocale, trans } from "@/src/lib/i18n";

/** Độ trễ xếp tầng cho từng khối khi trang vừa tải. */
function delay(ms: number) {
  return { "--d": `${ms}ms` } as React.CSSProperties;
}

export async function HeroRedesign({ counts }: { counts: StoreCounts }) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const hero = dict.landing.hero;
  const number = new Intl.NumberFormat(locale);

  return (
    <section className="aurora border-b border-zinc-200 bg-surface py-16 sm:py-24">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10" />

      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Cột trái: thông điệp & CTA */}
        <div className="lg:col-span-7">
          <div className="eyebrow animate-fade-up stagger" style={delay(0)}>
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-spark-400" />
              <span className="relative inline-flex size-2 rounded-full bg-spark-500" />
            </span>
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>{hero.badge}</span>
          </div>

          <h1
            className="mt-6 max-w-[680px] animate-fade-up stagger text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl [text-wrap:balance]"
            style={delay(90)}
          >
            {hero.titleLead}{" "}
            <span className="text-gradient">{hero.titleAccent}</span>
          </h1>

          <p
            className="mt-6 max-w-[620px] animate-fade-up stagger text-lg leading-relaxed text-zinc-600 [text-wrap:pretty]"
            style={delay(180)}
          >
            {trans(hero.subtitle, { name: siteConfig.name })}
          </p>

          <div
            className="mt-8 flex animate-fade-up stagger flex-col gap-3 sm:flex-row sm:items-center"
            style={delay(270)}
          >
            <Link href="/tools" className="btn-primary group text-base">
              {hero.ctaPrimary}
              <ArrowRight
                className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link href="/skills" className="btn-secondary text-base">
              {hero.ctaSecondary}
            </Link>
          </div>
        </div>

        {/* Cột phải: "kệ hàng" với số sản phẩm thật theo từng dòng */}
        <div className="relative animate-fade-up stagger lg:col-span-5" style={delay(220)}>
          <div
            aria-hidden="true"
            className="absolute -inset-6 -z-10 hidden rounded-[2.5rem] sm:block bg-gradient-to-br from-brand-300/50 via-violet-300/40 to-spark-200/50 blur-2xl"
          />
          <div className="md:animate-float rounded-3xl border-gradient p-4 shadow-lift">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-rose-400" />
                  <span className="size-2.5 rounded-full bg-spark-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </span>
                <span className="ml-1 text-xs font-semibold text-zinc-900">{hero.cardTitle}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                {hero.cardLive}
              </span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {productLines.map((line) => {
                const count = countFor(line.key, counts);
                const label = line.key === "SKILLS" ? dict.landing.productLines.skillsTitle : dict.tools.types[line.key];
                return (
                  <li key={line.key}>
                    <Link
                      href={line.href}
                      className="group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-zinc-50"
                    >
                      <span className={`inline-grid size-9 shrink-0 place-items-center rounded-xl ${line.tile}`}>
                        <line.Icon className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">{label}</span>
                      {count > 0 ? (
                        <span className="font-mono text-sm font-bold tabular-nums text-zinc-950">
                          {number.format(count)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          {hero.building}
                        </span>
                      )}
                      <ChevronRight
                        className="size-4 text-zinc-300 transition-transform duration-500 ease-fluid group-hover:translate-x-0.5 group-hover:text-brand-500"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 flex items-center gap-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
              <Database className="size-3.5" aria-hidden="true" />
              {hero.cardFooter}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
