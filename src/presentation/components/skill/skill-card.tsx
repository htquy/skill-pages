import Image from "next/image";
import Link from "next/link";
import { Layers, Play } from "lucide-react";
import type { SkillCardViewModel } from "@/src/presentation/view-models/skill";
import { SkillBadge } from "@/src/presentation/components/skill/skill-badge";
import { PurchasePanel } from "@/src/presentation/components/checkout/purchase-panel";
import { OwnedBadge } from "@/src/presentation/components/shared/owned-badge";
import { formatMoney } from "@/src/domain/shared";
import { getDictionary, getLocale } from "@/src/lib/i18n";

/**
 * Thẻ skill kiểu "SaaS AI": poster xem thử (từ R2) phủ đầu thẻ, huy hiệu Free/Pro + giá nổi trên ảnh,
 * bên dưới là nhãn loại sản phẩm (mono), tên, mô tả ngắn. Cả thẻ là một link phủ kín.
 */
export async function SkillCard({ skill, priority = false }: { skill: SkillCardViewModel; priority?: boolean }) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const price =
    skill.accessType === "PAID" && skill.price
      ? formatMoney(skill.price.amount, skill.price.currency, locale === "vi" ? "vi-VN" : "en-US")
      : null;

  return (
    // Link phủ kín thẻ; nội dung đặt `pointer-events-none` để click rơi xuống link. Nút "Mua ngay" là ngoại lệ
    // vì cần giữ tương tác (không lồng <button> trong <a>).
    <article className="group card-lift card-topline relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-surface shadow-sm">
      <Link
        href={`/skills/${skill.slug}`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        aria-label={skill.title}
      />

      <div className="pointer-events-none relative z-10 aspect-[16/10] overflow-hidden bg-zinc-100">
        {skill.coverImageUrl ? (
          <Image
            src={skill.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-fluid group-hover:scale-[1.04]"
          />
        ) : (
          <div className="aurora flex h-full w-full items-center justify-center text-zinc-400">
            <Layers className="size-8" aria-hidden="true" />
          </div>
        )}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <SkillBadge accessType={skill.accessType} />
          {skill.videoDemoUrl ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wide text-white backdrop-blur">
              <Play className="size-3" aria-hidden="true" />
              Demo
            </span>
          ) : null}
        </div>
        {price ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-sm font-bold text-[#4f55c1] shadow-lg">
            {price}
          </span>
        ) : null}
        {skill.isOwned ? (
          <span className="absolute right-3 top-3">
            <OwnedBadge dict={dict} />
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-5">
        {skill.useCases[0] ? (
          <p className="font-mono text-[0.7rem] font-medium uppercase tracking-wider text-[#c490ff]">
            {skill.categories[0] ? `${skill.categories[0]} · ` : ""}
            {skill.useCases[0]}
          </p>
        ) : null}
        <h3 className="mt-1.5 text-lg font-semibold leading-snug text-zinc-900 transition-colors duration-300 group-hover:text-brand-700">
          {skill.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-500">{skill.description}</p>
      </div>

      {skill.accessType === "PAID" && !skill.isOwned ? (
        <div className="relative z-10 px-5 pb-5">
          <PurchasePanel skill={skill} />
        </div>
      ) : null}
    </article>
  );
}
