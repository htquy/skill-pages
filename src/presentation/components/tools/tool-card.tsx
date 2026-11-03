import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { ToolCardViewModel } from "@/src/presentation/view-models/tool";
import { getDictionary, trans } from "@/src/lib/i18n";

export async function ToolCard({ tool }: { tool: ToolCardViewModel }) {
  const dict = await getDictionary();

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group card-lift card-topline relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      {tool.coverImageUrl ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
          <Image
            src={tool.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 ease-fluid group-hover:scale-[1.06]"
          />
        </div>
      ) : (
        <div className="aurora relative flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-violet-50">
          <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10" />
          <p className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600 shadow-sm ring-1 ring-brand-100 backdrop-blur">
            {dict.tools.eyebrow}
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
            {dict.tools.types[tool.type]}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-600">
            {dict.tools.billingTypes[tool.billingType]}
          </span>
          {tool.latestVersion ? (
            <span className="text-zinc-400">{trans(dict.tools.latestVersion, { version: tool.latestVersion })}</span>
          ) : null}
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-brand-700">
          {tool.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">{tool.description}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="text-sm font-semibold text-zinc-900">
            {tool.billingType === "FREE"
              ? dict.tools.freeToUse
              : (tool.priceLabel ?? dict.tools.noPrice)}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
            {dict.tools.viewTool}
            <ArrowRight
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
