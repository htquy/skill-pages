import Link from "next/link";
import { ArrowRight, CheckCircle2, Copy, Sparkles, Terminal } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

export async function HeroRedesign() {
  const dict = await getDictionary();
  const landing = dict.landing;

  return (
    <section className="relative border-b border-zinc-200 bg-white py-16 sm:py-24">
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Left Column: Value Proposition & CTA */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-800">
            <Sparkles className="size-3.5 text-zinc-900" aria-hidden="true" />
            <span>{landing.hero.badge}</span>
          </div>

          <h1 className="mt-6 max-w-[680px] text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            <span className="bg-gradient-to-r from-black via-zinc-800 to-zinc-500 bg-clip-text text-transparent">
              {landing.hero.titleLead}
            </span>{" "}
            <span className="text-zinc-950">
              {landing.hero.titleAccent}
            </span>
          </h1>

          <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-zinc-600 [text-wrap:pretty]">
            {landing.hero.subtitle}
          </p>

          {/* Primary CTA and Secondary Link */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/#catalog"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-base font-semibold text-white shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-zinc-800 active:scale-[0.98]"
            >
              {landing.hero.ctaPrimary}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/rankings"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base font-semibold text-zinc-900 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-zinc-50 active:scale-[0.98]"
            >
              {landing.hero.ctaSecondary}
            </Link>
          </div>

          {/* Proof signal */}
          <div className="mt-8 flex items-center gap-3 border-t border-zinc-100 pt-6">
            <div className="flex -space-x-2">
              <span className="inline-grid size-8 place-items-center rounded-full border-2 border-white bg-zinc-900 text-xs font-medium text-white">
                HN
              </span>
              <span className="inline-grid size-8 place-items-center rounded-full border-2 border-white bg-zinc-700 text-xs font-medium text-white">
                MT
              </span>
              <span className="inline-grid size-8 place-items-center rounded-full border-2 border-white bg-zinc-500 text-xs font-medium text-white">
                QP
              </span>
            </div>
            <p className="text-xs text-zinc-600 [text-wrap:pretty]">
              {landing.hero.proof}
            </p>
          </div>
        </div>

        {/* Right Column: Hero Visual — Realistic Interactive Skill Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-zinc-700" aria-hidden="true" />
                <span className="text-xs font-semibold text-zinc-900">
                  Claude 3.7 Sonnet · Production System
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800">
                <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                Verified
              </span>
            </div>

            {/* Code / Prompt snippet */}
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-800">
              <div className="text-zinc-400">{"// Task: Microservice Architecture Review"}</div>
              <div className="mt-1 text-indigo-600">{"@role: Senior Principal Systems Architect"}</div>
              <div className="mt-1 text-zinc-900">
                {"@input: [SystemSchema, ApiGatewayRoutes, DBTopology]"}
              </div>
              <div className="mt-2 text-zinc-500">
                {"@guardrail: Strict schema boundary enforcement. Flag cross-boundary joins immediately."}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-zinc-400">
                <span>Output: Structured RFC Markdown</span>
                <span className="inline-flex items-center gap-1 text-zinc-700">
                  <Copy className="size-3" aria-hidden="true" /> 1-Click Copy
                </span>
              </div>
            </div>

            {/* Result Preview metric badge */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-xs text-zinc-500">First-run accuracy</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">98.4%</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-xs text-zinc-500">Time saved per run</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">45 mins</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
