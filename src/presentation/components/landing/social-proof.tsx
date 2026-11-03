import { Quote, Star } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

export async function SocialProof() {
  const dict = await getDictionary();
  const metrics = dict.landing.metrics;
  const testimonials = dict.landing.testimonials;

  const stats = [
    { value: metrics.stat1Value, label: metrics.stat1Label },
    { value: metrics.stat2Value, label: metrics.stat2Label },
    { value: metrics.stat3Value, label: metrics.stat3Label },
    { value: metrics.stat4Value, label: metrics.stat4Label },
  ];

  return (
    <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
      <Container>
        {/* Dải số liệu trên nền tối */}
        <div className="aurora-dark reveal grid grid-cols-2 gap-6 rounded-3xl bg-gradient-to-br from-brand-950 via-zinc-950 to-zinc-950 p-6 md:grid-cols-4 md:p-10">
          <div aria-hidden="true" className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="bg-gradient-to-b from-white to-brand-200 bg-clip-text font-mono text-3xl font-bold tracking-tight text-transparent tabular-nums sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {testimonials.map((t, index) => (
            <figure
              key={index}
              className="group card-lift reveal relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"
            >
              <Quote
                className="absolute right-6 top-6 size-10 text-brand-100 transition-colors duration-500 group-hover:text-brand-200"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="flex gap-1 text-spark-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-4 text-base leading-relaxed text-zinc-800 [text-wrap:pretty]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>

              <figcaption className="relative mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4">
                <span className="inline-grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-semibold text-white">
                  {t.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <span>
                  <span className="block text-sm font-bold text-zinc-950">{t.name}</span>
                  <span className="block text-xs text-zinc-500">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
