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
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-8 text-center text-white sm:p-16">
          <div className="mx-auto max-w-[680px]">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance]">
              {cta.title}
            </h2>
            <p className="mt-4 text-base text-zinc-300 sm:text-lg [text-wrap:pretty]">
              {cta.subtitle}
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/#catalog"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-base font-semibold text-zinc-950 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-zinc-200 active:scale-[0.98]"
              >
                {cta.button}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            {/* Risk Reversal Guarantee */}
            <div className="mt-8 inline-flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
              <span>{cta.guarantee}</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
