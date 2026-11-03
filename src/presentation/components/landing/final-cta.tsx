import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

export async function FinalCta() {
  const dict = await getDictionary();
  const cta = dict.landing.finalCta;

  return (
    <section className="bg-white py-20 sm:py-28">
      <Container>
        <div className="aurora-dark reveal rounded-3xl bg-zinc-950 p-8 text-center text-white shadow-glow sm:p-16">
          <div aria-hidden="true" className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <div className="mx-auto max-w-[680px]">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance]">
              {cta.title}
            </h2>
            <p className="mt-4 text-base text-zinc-300 sm:text-lg [text-wrap:pretty]">{cta.subtitle}</p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/#catalog"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-5 py-3 text-base font-semibold text-zinc-950 shadow-[0_0_0_1px_rgb(255_255_255/0.2),0_18px_50px_-12px_rgb(138_127_248/0.7)] transition-all duration-500 ease-fluid hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgb(255_255_255/0.3),0_24px_60px_-10px_rgb(138_127_248/0.9)] active:scale-[0.98]"
              >
                {cta.button}
                <ArrowRight
                  className="size-4 text-brand-600 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">
              <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
              <span>{cta.guarantee}</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
