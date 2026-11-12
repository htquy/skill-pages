import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

export async function FinalCta() {
  const dict = await getDictionary();
  const cta = dict.landing.finalCta;

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="aurora-dark reveal rounded-2xl border border-zinc-200 bg-ink p-8 text-center text-white shadow-glow sm:p-16">
          <div aria-hidden="true" className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <div className="mx-auto max-w-[680px]">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance]">
              {cta.title}
            </h2>
            <p className="mt-4 text-base text-zinc-300 sm:text-lg [text-wrap:pretty]">{cta.subtitle}</p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/tools"
                className="btn-primary group text-base"
              >
                {cta.buttonPrimary}
                <ArrowRight
                  className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/skills"
                className="btn-secondary text-base"
              >
                {cta.buttonSecondary}
              </Link>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">
              <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
              <span>{cta.note}</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
