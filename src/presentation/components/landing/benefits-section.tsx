import { Cpu, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

const icons = [Zap, Cpu, ShieldCheck, RefreshCw];

export async function BenefitsSection() {
  const dict = await getDictionary();
  const benefits = dict.landing.benefits;

  return (
    <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-800">
            <span>{benefits.badge}</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {benefits.title}
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {benefits.items.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <div
                key={index}
                className="group rounded-3xl border border-zinc-200 bg-zinc-50 p-6 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-zinc-300 hover:bg-white hover:shadow-sm sm:p-8"
              >
                <div className="inline-grid size-12 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-xs transition-colors group-hover:border-zinc-900 group-hover:bg-zinc-950 group-hover:text-white">
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-zinc-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
