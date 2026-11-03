import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

export async function HowItWorks() {
  const dict = await getDictionary();
  const hiw = dict.landing.howItWorks;

  const steps = [
    { number: "01", title: hiw.step1Title, description: hiw.step1Desc },
    { number: "02", title: hiw.step2Title, description: hiw.step2Desc },
    { number: "03", title: hiw.step3Title, description: hiw.step3Desc },
  ];

  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-b from-white to-brand-50/50 py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="eyebrow">{hiw.badge}</div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {hiw.title}
          </h2>
        </div>

        <div className="relative mt-12">
          {/* Đường nối các bước (chỉ hiện khi 3 cột). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-px bg-gradient-to-r from-brand-300 via-violet-300 to-spark-300 md:block"
          />
          <ol className="relative grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {steps.map((step) => (
            <li
              key={step.number}
              className="group card-lift reveal relative rounded-3xl border border-zinc-200 bg-white/90 p-6 backdrop-blur sm:p-8"
            >
              <div className="inline-grid size-12 place-items-center rounded-2xl bg-zinc-950 font-mono text-base font-bold text-white shadow-glow transition-transform duration-500 ease-spring group-hover:scale-110">
                <span className="text-gradient">{step.number}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-zinc-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">
                {step.description}
              </p>
            </li>
          ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
