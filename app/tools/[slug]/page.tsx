export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download, ExternalLink } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { RichText } from "@/src/presentation/components/shared/rich-text";
import { appsService, distributionService, toolQueries } from "@/src/infrastructure/composition";
import { isAppError } from "@/src/domain/errors";
import { formatMoney } from "@/src/domain/shared";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/src/lib/video";
import { lowestPlanPrice, periodLabel, productLinkOf } from "@/src/presentation/view-models/tool";
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

/** Gói đang bán của app liên kết (qua facade AppsService); app bị xoá/ẩn thì coi như chưa liên kết. */
async function loadLinkedApp(appSlug: string | null) {
  if (!appSlug) return null;
  try {
    return await appsService.getApp(appSlug);
  } catch (error) {
    if (isAppError(error) && error.status === 404) return null;
    throw error;
  }
}

/** Bản phát hành đang PUBLISHED (kênh stable) của app liên kết; chưa có hoặc lỗi thì để trang dùng link của tool. */
async function loadPublishedRelease(appSlug: string | null) {
  if (!appSlug) return null;
  try {
    return await distributionService.manifest(appSlug, "stable", "win-x64");
  } catch (error) {
    if (isAppError(error) && error.status === 404) return null;
    throw error;
  }
}

export default async function ToolDetailPage({ params }: Props) {
  const { slug } = await params;
  const [dict, tool] = await Promise.all([getDictionary(), toolQueries.findBySlug(slug)]);
  if (!tool) notFound();
  const [linked, release] = await Promise.all([loadLinkedApp(tool.appSlug), loadPublishedRelease(tool.appSlug)]);
  const linkedPlans = linked?.plans.filter((plan) => plan.prices.length > 0) ?? [];
  const fromPrice = lowestPlanPrice(linkedPlans);
  const pricingHref = linked ? `/apps/${linked.app.slug}/pricing` : null;

  const version = tool.version;
  const videoEmbedUrl = tool.videoDemoUrl ? getVideoEmbedUrl(tool.videoDemoUrl) : null;
  const videoFileUrl =
    tool.videoDemoUrl && isDirectVideoUrl(tool.videoDemoUrl) ? tool.videoDemoUrl : null;
  // Link do admin nhập nên chỉ mở link ngoài, không nhúng vào trang.
  // Bản phát hành đã xuất bản của app (admin/app-releases) là nguồn tải chính; thiếu thì dùng link nhập tay ở tool.
  const productLink =
    release && tool.type !== "WEB_APP"
      ? { href: release.application.url, kind: "download" as const }
      : productLinkOf(tool);
  const extraConfig = Object.fromEntries(
    Object.entries(tool.config ?? {}).filter(([key]) => key !== "appUrl"),
  );

  return (
    <Container className="py-10 md:py-14">
      <Link href="/tools" className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-brand-700">
        <ArrowLeft className="size-4 transition-transform duration-500 ease-fluid group-hover:-translate-x-1" aria-hidden="true" />
        {dict.tools.backAll}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
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

          <h1 className="mt-3 animate-fade-up text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
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
              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-ink shadow-sm">
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

          <section className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.pricingTitle}</h2>
            {pricingHref ? (
              <>
                {fromPrice ? (
                  <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-950">
                    {trans(dict.tools.plansFrom, { price: formatMoney(fromPrice.amount, fromPrice.currency) })}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-zinc-600">{dict.tools.noPrice}</p>
                )}
                {linkedPlans.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
                    {linkedPlans.map((plan) => (
                      <li key={plan.id} className="flex justify-between gap-3">
                        <span>{plan.name}</span>
                        <span className="tabular-nums text-zinc-900">
                          {formatMoney(
                            Math.min(...plan.prices.map((price) => price.amount)),
                            plan.prices[0].currency,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link
                  href={pricingHref}
                  className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500"
                >
                  {dict.tools.viewPlans}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-xs text-zinc-400">{dict.tools.plansHint}</p>
              </>
            ) : tool.billingType === "FREE" || tool.prices.length === 0 ? (
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

            {productLink ? (
              <a
                href={productLink.href}
                target="_blank"
                rel="noreferrer noopener"
                className={
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors " +
                  (pricingHref
                    ? "mt-3 border border-zinc-300 bg-surface text-zinc-800 hover:bg-zinc-50"
                    : "mt-5 bg-brand-600 text-white hover:bg-brand-500")
                }
              >
                {productLink.kind === "access" ? (
                  <>
                    {dict.tools.access}
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <Download className="size-4" aria-hidden="true" />
                    {dict.tools.download}
                  </>
                )}
              </a>
            ) : null}
            {pricingHref ? null : (
              <p className="mt-4 text-xs text-zinc-400">{dict.tools.purchaseSoon}</p>
            )}
          </section>

          {release ? (
            <section className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.tools.versionTitle}</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-zinc-500">{dict.tools.versionLabel}</dt>
                  <dd className="text-right font-medium text-zinc-800">{release.version}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-zinc-500">{dict.tools.downloadFile}</dt>
                  <dd className="break-all text-right font-medium text-zinc-800">{release.application.fileName}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-zinc-500">{dict.tools.fileSize}</dt>
                  <dd className="text-right font-medium text-zinc-800">{formatSize(release.application.size)}</dd>
                </div>
              </dl>
              {release.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{release.notes}</p> : null}
            </section>
          ) : version?.fileUrl || version?.scriptUrl ? (
            <section className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
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
            </section>
          ) : null}

          {Object.keys(extraConfig).length > 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
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
