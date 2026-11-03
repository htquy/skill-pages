import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary } from "@/src/lib/i18n";

export async function ProblemSolution() {
  const dict = await getDictionary();
  const ps = dict.landing.problemSolution;

  return (
    <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="eyebrow">{ps.badge}</div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {ps.title}
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {/* Vấn đề: tông hồng nhạt, đánh dấu bằng dấu x. */}
          <div className="reveal rounded-3xl border border-rose-100 bg-gradient-to-b from-rose-50/70 to-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="inline-grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <AlertCircle className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">{ps.problemTitle}</h3>
            </div>

            <ul className="mt-6 space-y-4">
              {ps.problemPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-zinc-600 [text-wrap:pretty]">
                  <X className="mt-0.5 size-4 shrink-0 text-rose-400" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Giải pháp: nền tối có quầng aurora. */}
          <div className="aurora-dark reveal rounded-3xl border border-brand-900 bg-zinc-950 p-6 text-white shadow-glow sm:p-8">
            <div className="flex items-center gap-3">
              <div className="inline-grid size-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-white">{ps.solutionTitle}</h3>
            </div>

            <ul className="mt-6 space-y-4">
              {ps.solutionPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-zinc-200 [text-wrap:pretty]">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
