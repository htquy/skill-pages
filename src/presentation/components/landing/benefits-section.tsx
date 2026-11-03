import { Cpu, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

// Mỗi lợi ích một sắc riêng để lưới bốn thẻ không đơn điệu.
const tones = [
  { Icon: Zap, tile: "bg-spark-100 text-spark-600 group-hover:bg-spark-500", glow: "from-spark-200/70" },
  { Icon: Cpu, tile: "bg-brand-100 text-brand-600 group-hover:bg-brand-600", glow: "from-brand-200/70" },
  { Icon: ShieldCheck, tile: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500", glow: "from-emerald-200/70" },
  { Icon: RefreshCw, tile: "bg-violet-100 text-violet-600 group-hover:bg-violet-600", glow: "from-violet-200/70" },
];

export async function BenefitsSection() {
  const dict = await getDictionary();
  const benefits = dict.landing.benefits;

  return (
    <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="eyebrow">{benefits.badge}</div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {benefits.title}
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {benefits.items.map((item, index) => {
            const tone = tones[index % tones.length];
            return (
              <div
                key={index}
                className="group card-lift reveal relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br ${tone.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100`}
                />
                <div
                  className={`relative inline-grid size-12 place-items-center rounded-xl transition-all duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110 group-hover:text-white ${tone.tile}`}
                >
                  <tone.Icon className="size-6" aria-hidden="true" />
                </div>
                <h3 className="relative mt-6 text-xl font-bold text-zinc-950">{item.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">
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
