import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { skillQueries } from "@/src/infrastructure/composition";
import { getDictionary } from "@/src/lib/i18n";

/**
 * Băng chuyền poster các phong cách trong kho (tương đương dải "Trusted by brands" của SaaS AI):
 * hai bản của cùng danh sách nối đuôi nhau, cuộn vô hạn, dừng khi rê chuột. Kho chưa có skill nào thì ẩn mục này.
 */
export async function FeaturedSkills() {
  const [dict, result] = await Promise.all([getDictionary(), skillQueries.search({}, { page: 1, pageSize: 16 })]);
  const items = result.items.filter((s) => s.coverImageUrl);
  if (items.length < 4) return null;
  const copy = dict.landing.featuredSkills;

  const row = (suffix: string, hidden: boolean) => (
    <ul className="flex shrink-0 gap-4 pr-4" aria-hidden={hidden || undefined} key={suffix}>
      {items.map((skill, i) => (
        <li key={`${suffix}-${skill.slug}`} className="w-64 shrink-0 sm:w-72">
          <Link
            href={`/skills/${skill.slug}`}
            tabIndex={hidden ? -1 : undefined}
            className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-surface transition-colors hover:border-brand-400"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
              <Image
                src={skill.coverImageUrl!}
                alt=""
                fill
                sizes="288px"
                loading={i < 4 && !hidden ? "eager" : "lazy"}
                className="object-cover transition-transform duration-700 ease-fluid group-hover:scale-105"
              />
            </div>
            <p className="truncate px-3.5 py-3 text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{skill.title}</p>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="relative overflow-hidden border-y border-zinc-200 py-16 sm:py-20">
      <Container>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">{copy.badge}</div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
              {copy.title}
            </h2>
          </div>
          <Link href="/skills" className="btn-secondary group shrink-0 text-sm">
            {copy.viewAll}
            <ArrowRight className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </Container>
      <div className="relative [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="marquee-track">
          {row("a", false)}
          {row("b", true)}
        </div>
      </div>
    </section>
  );
}
