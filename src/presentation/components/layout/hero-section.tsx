import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { siteConfig } from "@/src/lib/site";

function HeroVisual() {
  return (
    <div className="relative hidden lg:block" aria-hidden="true">
      <div className="absolute -top-10 right-0 size-64 rounded-full bg-gradient-to-br from-indigo-200/70 to-violet-200/70 blur-2xl" />
      <div className="absolute bottom-0 left-8 size-48 rounded-full bg-gradient-to-tr from-fuchsia-200/60 to-indigo-200/60 blur-2xl" />

      <div className="relative space-y-4">
        <div className="w-80 rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-lg backdrop-blur">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <Sparkles className="size-3" aria-hidden="true" /> Prompt · Video
          </span>
          <p className="mt-3 text-sm font-semibold text-zinc-900">
            &quot;Podcast-to-snip: extract key moments with Sora&quot;
          </p>
          <div className="mt-2 h-2 w-3/4 rounded-full bg-zinc-100" />
          <div className="mt-1 h-2 w-1/2 rounded-full bg-zinc-100" />
        </div>

        <div className="ml-16 w-72 rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-lg backdrop-blur">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            Workflow · Marketing
          </span>
          <p className="mt-3 text-sm font-semibold text-zinc-900">
            &quot;Doc-to-ad-copy funnel with Claude&quot;
          </p>
          <div className="mt-2 h-2 w-2/3 rounded-full bg-zinc-100" />
          <div className="mt-1 h-2 w-4/5 rounded-full bg-zinc-100" />
        </div>

        <div className="ml-8 w-64 rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-lg backdrop-blur">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700">
            Skill · Coding
          </span>
          <p className="mt-3 text-sm font-semibold text-zinc-900">
            &quot;AI-assisted code review checklist&quot;
          </p>
          <div className="mt-2 h-2 w-1/2 rounded-full bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-100">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-transparent" aria-hidden="true" />
      <Container className="relative grid grid-cols-1 items-center gap-12 py-16 md:py-20 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Curated by humans, powered by AI
          </p>
          <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            Discover better ways to{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              work with AI
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-zinc-600">
            {siteConfig.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#catalog"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
            >
              Explore skills
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/rankings"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Browse AI tools
            </Link>
          </div>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}