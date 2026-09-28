export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { RichText } from "@/src/presentation/components/shared/rich-text";
import { toolQueries } from "@/src/infrastructure/composition";
import { formatMoney } from "@/src/domain/shared";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/src/lib/video";
import { periodLabel } from "@/src/presentation/view-models/tool";
import { formatSize } from "@/src/presentation/components/upload/format-size";
import { getDictionary, trans } from "@/src/lib/i18n";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = await toolQueries.findBySlug(slug);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.shortDescription,
    openGraph: {
      title: tool.title,
      description: tool.shortDescription,
      type: "website",
    },
  };
}

export default async function ToolDetailPage({ params }: Props) {
  const { slug } = await params;
  const [dict, tool] = await Promise.all([getDictionary(), toolQueries.findBySlug(slug)]);
  if (!tool) notFound();

  const version = tool.version;
  const videoEmbedUrl = tool.videoDemoUrl ? getVideoEmbedUrl(tool.videoDemoUrl) : null;
  const videoFileUrl =
    tool.videoDemoUrl && isDirectVideoUrl(tool.videoDemoUrl) ? tool.videoDemoUrl : null;
  // `appUrl` do admin nhập nên chỉ mở link ngoài, không nhúng vào trang.
  const appUrl = tool.appUrl;
  const extraConfig = Object.fromEntries(
    Object.entries(tool.config ?? {}).filter(([key]) => key !== "appUrl"),
  );

  return (
    <Container className="py-10 md:py-14">
      <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {dict.tools.backAll}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-medium text-indigo-700">
              {dict.tools.types[tool.type]}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-600">
              {dict.tools.billingTypes[tool.billingType]}
            </span>
            {tool.latestVersion ? (
              <span className="text-zinc-400">
                {trans(dict.tools.latestVersion, { version: tool.latestVersion })}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {tool.title}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-zinc-600">{tool.shortDescription}</p>
          <p className="mt-2 text-sm text-zinc-400">{dict.tools.typeHints[tool.type]}</p>

          {tool.description ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.aboutTitle}</h2>
              <RichText html={tool.description} className="mt-3" />
            </section>
          ) : null}

          {version?.changelog ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.versionTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{version.changelog}</p>
            </section>
          ) : null}

          {tool.videoDemoUrl ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.videoDemo}</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-sm">
                {videoEmbedUrl ? (
                  <iframe
                    src={videoEmbedUrl}
                    title={dict.tools.videoDemo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="aspect-video w-full"
                  />
                ) : videoFileUrl ? (
                  <video
                    src={videoFileUrl}
                    controls
                    preload="metadata"
                    playsInline
                    className="aspect-video w-full"
                  />
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {tool.coverImageUrl ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              <Image
                src={tool.coverImageUrl}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 320px"
                className="object-cover"
              />
            </div>
          ) : null}

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.pricingTitle}</h2>
            {tool.billingType === "FREE" || tool.prices.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">
                {tool.billingType === "FREE" ? dict.tools.freeToUse : dict.tools.noPrice}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {tool.prices.map((price, index) => (
                  <li
                    key={`${price.currency}-${price.durationDays}-${index}`}
                    className="flex items-baseline justify-between gap-3 border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-zinc-500">{periodLabel(price, dict)}</span>
                    <span className="text-base font-semibold text-zinc-900">
                      {formatMoney(price.amount, price.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {appUrl ? (
              <a
                href={appUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
              >
                {dict.tools.openApp}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            ) : null}
            <p className="mt-4 text-xs text-zinc-400">{dict.tools.purchaseSoon}</p>
          </section>

          {version?.fileUrl || version?.scriptUrl ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.versionTitle}</h2>
              <dl className="mt-3 space-y-3 text-sm">
                {version.versionCode ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500">{dict.tools.versionLabel}</dt>
                    <dd className="text-right font-medium text-zinc-800">{version.versionCode}</dd>
                  </div>
                ) : null}
                {version.fileName ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500">{dict.tools.downloadFile}</dt>
                    <dd className="text-right font-medium text-zinc-800">{version.fileName}</dd>
                  </div>
                ) : null}
                {version.fileSize !== null ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500">{dict.tools.fileSize}</dt>
                    <dd className="text-right font-medium text-zinc-800">{formatSize(version.fileSize)}</dd>
                  </div>
                ) : null}
              </dl>
              {version.fileUrl ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500 ring-1 ring-zinc-100">
                  <Download className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-all">{version.fileUrl}</span>
                </p>
              ) : null}
              {version.scriptUrl ? (
                <p className="mt-4 break-all text-xs text-zinc-500">{version.scriptUrl}</p>
              ) : null}
            </section>
          ) : null}

          {Object.keys(extraConfig).length > 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.configTitle}</h2>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 font-mono text-xs text-zinc-700 ring-1 ring-zinc-100">
                {JSON.stringify(extraConfig, null, 2)}
              </pre>
            </section>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
