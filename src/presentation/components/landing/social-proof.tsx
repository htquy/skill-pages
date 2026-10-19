import { Star } from "lucide-react";
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
        {/* Organic Stats Strip */}
        <div className="grid grid-cols-2 gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-6 md:grid-cols-4 md:p-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl font-bold tracking-tight text-zinc-950 font-mono sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Real Testimonials Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {testimonials.map((t, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8"
            >
              <div>
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <p className="mt-4 text-base leading-relaxed text-zinc-800 [text-wrap:pretty]">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 border-t border-zinc-200/80 pt-4">
                <p className="text-sm font-bold text-zinc-950">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
