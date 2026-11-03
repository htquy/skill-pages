import Link from "next/link";
import { ArrowRight, CheckCircle2, Copy, Sparkles, Terminal } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

/** Độ trễ xếp tầng cho từng khối khi trang vừa tải. */
function delay(ms: number) {
  return { "--d": `${ms}ms` } as React.CSSProperties;
}

export async function HeroRedesign() {
  const dict = await getDictionary();
  const landing = dict.landing;

  return (
    <section className="aurora border-b border-zinc-200 bg-white py-16 sm:py-24">
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
            <span>{landing.hero.badge}</span>
          </div>

          <h1
            className="mt-6 max-w-[680px] animate-fade-up stagger text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl [text-wrap:balance]"
            style={delay(90)}
          >
            {landing.hero.titleLead}{" "}
            <span className="text-gradient">{landing.hero.titleAccent}</span>
          </h1>

          <p
            className="mt-6 max-w-[620px] animate-fade-up stagger text-lg leading-relaxed text-zinc-600 [text-wrap:pretty]"
            style={delay(180)}
          >
            {landing.hero.subtitle}
          </p>

          <div
            className="mt-8 flex animate-fade-up stagger flex-col gap-3 sm:flex-row sm:items-center"
            style={delay(270)}
          >
            <Link href="/#catalog" className="btn-primary group text-base">
              {landing.hero.ctaPrimary}
              <ArrowRight
                className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link href="/rankings" className="btn-secondary text-base">
              {landing.hero.ctaSecondary}
            </Link>
          </div>

          <div
            className="mt-8 flex animate-fade-up stagger items-center gap-3 border-t border-zinc-200/70 pt-6"
            style={delay(360)}
          >
            <div className="flex -space-x-2">
              <span className="inline-grid size-8 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-medium text-white">
                HN
              </span>
              <span className="inline-grid size-8 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-medium text-white">
                MT
              </span>
              <span className="inline-grid size-8 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-spark-400 to-spark-600 text-xs font-medium text-white">
                QP
              </span>
            </div>
            <p className="text-xs text-zinc-600 [text-wrap:pretty]">{landing.hero.proof}</p>
          </div>
        </div>

        {/* Cột phải: thẻ prompt mẫu trôi nhẹ */}
        <div className="relative animate-fade-up stagger lg:col-span-5" style={delay(220)}>
          <div
            aria-hidden="true"
            className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-300/50 via-violet-300/40 to-spark-200/50 blur-2xl"
          />
          <div className="animate-float rounded-3xl border-gradient p-4 shadow-lift">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-rose-400" />
                  <span className="size-2.5 rounded-full bg-spark-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </span>
                <Terminal className="ml-1 size-4 text-brand-600" aria-hidden="true" />
                <span className="text-xs font-semibold text-zinc-900">
                  Claude 3.7 Sonnet · Production System
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                Verified
              </span>
            </div>

            <div className="mt-3 rounded-2xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
              <div className="text-zinc-500">{"// Task: Microservice Architecture Review"}</div>
              <div className="mt-1 text-brand-300">{"@role: Senior Principal Systems Architect"}</div>
              <div className="mt-1 text-zinc-100">
                {"@input: [SystemSchema, ApiGatewayRoutes, DBTopology]"}
              </div>
              <div className="mt-2 text-spark-300">
                {"@guardrail: Strict schema boundary enforcement. Flag cross-boundary joins immediately."}
                <span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-blink bg-brand-400"
                />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-zinc-500">
                <span>Output: Structured RFC Markdown</span>
                <span className="inline-flex items-center gap-1 text-zinc-300">
                  <Copy className="size-3" aria-hidden="true" /> 1-Click Copy
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
                <p className="text-xs text-brand-700/80">First-run accuracy</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-brand-700">98.4%</p>
              </div>
              <div className="rounded-xl bg-spark-50 p-3 ring-1 ring-spark-100">
                <p className="text-xs text-spark-700/80">Time saved per run</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-spark-700">45 mins</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
