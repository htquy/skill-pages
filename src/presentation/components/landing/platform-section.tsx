import { Database, History, Layers, QrCode, UserCheck } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { getDictionary, getLocale } from "@/src/lib/i18n";

export interface PlatformNumbers {
  publishedSkills: number;
  publishedTools: number;
  activeAccounts: number;
  publishedArticles: number;
}

// Mỗi cam kết một sắc riêng để lưới bốn thẻ không đơn điệu.
const tones = [
  { Icon: UserCheck, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06] group-hover:text-zinc-950", glow: "from-brand-200/70" },
  { Icon: QrCode, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06] group-hover:text-zinc-950", glow: "from-emerald-200/70" },
  { Icon: Layers, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06] group-hover:text-zinc-950", glow: "from-spark-200/70" },
  { Icon: History, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06] group-hover:text-zinc-950", glow: "from-brand-200/70" },
];

/** Dải số liệu đếm thật từ DB + các cam kết nền tảng (thay cho mục nhận xét người dùng). */
export async function PlatformSection({ numbers }: { numbers: PlatformNumbers }) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const platform = dict.landing.platform;
  const number = new Intl.NumberFormat(locale);

  const stats = [
    { value: numbers.publishedTools, label: platform.stats.tools },
    { value: numbers.publishedSkills, label: platform.stats.skills },
    { value: numbers.activeAccounts, label: platform.stats.accounts },
    { value: numbers.publishedArticles, label: platform.stats.articles },
  ];

  return (
    <section className="border-b border-zinc-200 bg-surface py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="eyebrow">{platform.badge}</div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {platform.title}
          </h2>
        </div>

        {/* Dải số liệu trên nền tối */}
        <div className="aurora-dark reveal mt-12 rounded-2xl border border-zinc-200 bg-ink p-6 md:p-10">
          <div aria-hidden="true" className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl text-zinc-950">
                  {number.format(stat.value)}
                </p>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-white/10 pt-4 text-xs text-zinc-400">
            <Database className="size-3.5" aria-hidden="true" />
            {platform.statsNote}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {platform.features.map((item, index) => {
            const tone = tones[index % tones.length];
            return (
              <div
                key={item.title}
                className="group card-lift reveal relative overflow-hidden rounded-2xl border border-zinc-200 bg-surface p-6"
              >
                <div
                  aria-hidden="true"
                  className="hidden"
                />
                <div
                  className={`relative inline-grid size-11 place-items-center rounded-xl transition-all duration-500 ease-out ${tone.tile}`}
                >
                  <tone.Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="relative mt-5 text-base font-bold text-zinc-950">{item.title}</h3>
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
