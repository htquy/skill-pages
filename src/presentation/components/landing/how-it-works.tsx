import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

export async function HowItWorks() {
  const dict = await getDictionary();
  const hiw = dict.landing.howItWorks;

  const steps = [
    {
      number: "01",
      title: hiw.step1Title,
      description: hiw.step1Desc,
    },
    {
      number: "02",
      title: hiw.step2Title,
      description: hiw.step2Desc,
    },
    {
      number: "03",
      title: hiw.step3Title,
      description: hiw.step3Desc,
    },
  ];

  return (
    <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-800">
            <span>{hiw.badge}</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {hiw.title}
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative rounded-3xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8"
            >
              <div className="text-3xl font-bold text-zinc-300 font-mono">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
