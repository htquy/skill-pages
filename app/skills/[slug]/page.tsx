export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Bookmark, Calendar, Eye, FileText, FolderOpen, Lock, Megaphone, Rocket } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { SkillBadge } from "@/src/presentation/components/skill/skill-badge";
import { StarRating } from "@/src/presentation/components/skill/star-rating";
import { SaveButton } from "@/src/presentation/components/skill/save-button";
import { CopyButton } from "@/src/presentation/components/shared/copy-button";
import { PurchasePanel } from "@/src/presentation/components/checkout/purchase-panel";
import { OwnedBadge } from "@/src/presentation/components/shared/owned-badge";
import { RichText } from "@/src/presentation/components/shared/rich-text";
import { skillQueries, engagementCommands, accessCommands } from "@/src/infrastructure/composition";
import { getCurrentUser } from "@/src/infrastructure/authentication/authorization";
import { formatMoney } from "@/src/domain/shared";
import { formatDate, formatNumber } from "@/src/lib/utils";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/src/lib/video";
import { getDictionary, getLocale, trans } from "@/src/lib/i18n";
import { pickTranslation } from "@/src/presentation/view-models/skill";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const FILES_VISIBLE = 12;

function FileRow({
  asset,
  unlocked,
  openLabel,
}: {
  asset: { path: string; sizeBytes: number; url: string | null };
  unlocked: boolean;
  openLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      {unlocked ? (
        <FileText className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
      ) : (
        <Lock className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-700">{asset.path}</span>
      <span className="shrink-0 text-xs text-zinc-400">{formatBytes(asset.sizeBytes)}</span>
      {unlocked && asset.url ? (
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
        >
          {openLabel}
        </a>
      ) : null}
    </li>
  );
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = await skillQueries.findBySlug(slug);
  if (!skill) return {};
  return {
    title: skill.title,
    description: skill.shortDescription,
    openGraph: {
      title: skill.title,
      description: skill.shortDescription,
      type: "article",
    },
  };
}

function Chips({
  label,
  queryKey,
  icon,
  items,
}: {
  label: string;
  queryKey: string;
  icon: React.ReactNode;
  items: { slug: string; name: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {icon}
        {label}
      </span>
      {items.map((item) => (
        <Link
          key={item.slug}
          href={`/search?${new URLSearchParams({ [queryKey]: item.slug })}`}
          className="rounded-full border border-zinc-200 bg-surface px-2.5 py-0.5 text-xs font-medium text-zinc-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}

export default async function SkillDetailPage({ params }: Props) {
  const { slug } = await params;
  const skill = await skillQueries.findBySlug(slug);
  if (!skill) notFound();

  const [dict, user, locale] = await Promise.all([getDictionary(), getCurrentUser(), getLocale()]);
  const t = pickTranslation(skill, locale);
  const title = t.title ?? skill.title;
  const shortDescription = t.shortDescription ?? skill.shortDescription;
  const aboutText = t.description ?? skill.description;
  const isFavorite = user ? await engagementCommands.isFavorite(user.id, slug) : false;
  const isOwned = skill.accessType === "PAID" && Boolean(user && (await accessCommands.hasActiveAccess(user.id, skill.id)));
  const hasAccess = skill.accessType === "FREE" || isOwned;
  const visibleContent = hasAccess ? skill.content : dict.skillDetail.previewLocked;
  // Chỉ nhúng được nguồn có iframe (YouTube/Vimeo); file mp4/webm dùng thẻ
  // `<video>`; link lạ chỉ hiện để mở tab mới vì không rõ cách nhúng.
  const videoEmbedUrl = skill.videoDemoUrl ? getVideoEmbedUrl(skill.videoDemoUrl) : null;
  const videoFileUrl =
    skill.videoDemoUrl && isDirectVideoUrl(skill.videoDemoUrl) ? skill.videoDemoUrl : null;

  if (user) {
    void engagementCommands
      .recordSkillView(slug, { userId: user.id, sessionHash: null })
      .catch((error: unknown) => console.error("[view-record]", error));
  }

  const tools =
    skill.tools.length > 0
      ? skill.tools
      : [
          {
            slug: "unknown",
            name: dict.skillDetail.anyAi,
            logoUrl: null,
          },
        ];

  return (
    <Container className="py-10 md:py-14">
      <Link
        href="/skills"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeft className="size-4 transition-transform duration-500 ease-fluid group-hover:-translate-x-1" aria-hidden="true" />
        {dict.skillDetail.back}
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <SkillBadge accessType={skill.accessType} />
            {isOwned ? <OwnedBadge dict={dict} /> : null}
            {skill.categories[0] || skill.useCases[0] ? (
              <span className="eyebrow">
                {[skill.categories[0]?.name, skill.useCases[0]?.name].filter(Boolean).join(" · ")}
              </span>
            ) : null}
            {skill.ratingCount > 0 ? <StarRating rating={skill.ratingAverage ?? 0} count={skill.ratingCount} /> : null}
          </div>

          <h1 className="mt-4 animate-fade-up text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {title}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-zinc-600">
            {shortDescription}
          </p>

          {skill.coverImageUrl || videoFileUrl ? (
            <div className="relative mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-glow">
              {videoFileUrl ? (
                <video
                  src={videoFileUrl}
                  poster={skill.coverImageUrl ?? undefined}
                  controls
                  muted
                  loop
                  preload="none"
                  playsInline
                  aria-label={dict.skillDetail.preview}
                  className="aspect-video w-full bg-black object-cover"
                />
              ) : (
                <Image
                  src={skill.coverImageUrl!}
                  alt={title}
                  width={1280}
                  height={720}
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  priority
                  className="aspect-video w-full object-cover"
                />
              )}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" aria-hidden="true" />
              {skill.publishedAt ? formatDate(skill.publishedAt) : "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-4" aria-hidden="true" />
              {trans(dict.skillDetail.viewsLabel, { count: formatNumber(skill.viewCount) })}
            </span>
            <span className="flex items-center gap-1.5">
              <Bookmark className="size-4" aria-hidden="true" />
              {trans(dict.skillDetail.savesLabel, { count: formatNumber(skill.favoriteCount) })}
            </span>
            {skill.authorName ? (
              <span>{trans(dict.skillDetail.byAuthor, { name: skill.authorName })}</span>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SaveButton skillSlug={skill.slug} isFavorite={isFavorite} dict={dict} />
            {hasAccess ? <CopyButton text={skill.content} dict={dict} /> : null}
          </div>

          <div className="mt-10 space-y-4">
            <Chips
              label={dict.filters.industry}
              queryKey="industry"
              icon={<FolderOpen className="size-3.5" aria-hidden="true" />}
              items={skill.industries}
            />
            <Chips
              label={dict.filters.category}
              queryKey="category"
              icon={<FolderOpen className="size-3.5" aria-hidden="true" />}
              items={skill.categories}
            />
            <Chips
              label={dict.filters.useCase}
              queryKey="useCase"
              icon={<Megaphone className="size-3.5" aria-hidden="true" />}
              items={skill.useCases}
            />
          </div>

          <section className="mt-10 rounded-2xl border border-zinc-200 bg-surface shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-4 sm:px-7">
              <h2 className="text-lg font-semibold text-zinc-900">
                {skill.r2Prefix ? dict.skillDetail.skillContent : dict.skillDetail.thePrompt}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {trans(dict.skillDetail.version, { version: skill.version })}
                {skill.changelog ? ` · ${skill.changelog}` : ""}
              </p>
            </div>
            <div className="px-5 py-6 sm:px-7">
              <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-5 font-mono text-sm leading-relaxed text-zinc-800 ring-1 ring-zinc-100">
                {visibleContent}
              </pre>
            </div>
          </section>

          {skill.instructions ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.howToUse}</h2>
              <RichText
                html={skill.instructions}
                className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-5 text-sm"
                fallbackClassName="text-sm text-zinc-700"
              />
            </section>
          ) : null}

          {aboutText ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.about}</h2>
              <RichText html={aboutText} className="mt-3" />
            </section>
          ) : null}

          {skill.assets.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.files}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {hasAccess ? dict.skillDetail.filesHint : dict.skillDetail.filesLocked}
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-surface">
                <ul className="divide-y divide-zinc-100">
                  {skill.assets.slice(0, FILES_VISIBLE).map((asset) => (
                    <FileRow key={asset.path} asset={asset} unlocked={hasAccess} openLabel={dict.skillDetail.download} />
                  ))}
                </ul>
                {skill.assets.length > FILES_VISIBLE ? (
                  <details className="group border-t border-zinc-100">
                    <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-brand-600 hover:bg-zinc-50">
                      {trans(dict.skillDetail.moreFiles, { count: skill.assets.length - FILES_VISIBLE })}
                    </summary>
                    <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
                      {skill.assets.slice(FILES_VISIBLE).map((asset) => (
                        <FileRow key={asset.path} asset={asset} unlocked={hasAccess} openLabel={dict.skillDetail.download} />
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            </section>
          ) : null}

          {skill.videoDemoUrl && !videoFileUrl ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.videoDemo}</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-sm">
                {videoEmbedUrl ? (
                  <iframe
                    src={videoEmbedUrl}
                    title={dict.skillDetail.videoDemo}
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
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center p-6 text-center text-sm text-zinc-300">
                    {dict.skillDetail.videoDemoOpen}
                  </div>
                )}
              </div>
              <a
                href={skill.videoDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
              >
                {dict.skillDetail.videoDemoOpen}
              </a>
            </section>
          ) : null}

          {skill.variables ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.inputFields}</h2>
              <dl className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-surface shadow-sm">
                {Object.entries(skill.variables).map(([key, value], index) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-4 px-5 py-3 text-sm ${
                      index > 0 ? "border-t border-zinc-100" : ""
                    }`}
                  >
                    <dt className="font-medium text-zinc-900">{key}</dt>
                    <dd className="text-zinc-500">
                      {typeof value === "string" || typeof value === "number"
                        ? String(value)
                        : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </article>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {skill.accessType === "PAID" ? dict.skillDetail.pricing : dict.skillDetail.access}
            </h3>
            {skill.accessType === "PAID" ? (
              <div className="mt-3 space-y-2">
                {skill.prices.map((price) => (
                  <div
                    key={`${price.currency}-${price.amount}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                  >
                    <span className="text-sm text-zinc-500">{price.currency}</span>
                    <span className="text-lg font-bold text-zinc-900">
                      {formatMoney(price.amount, price.currency, locale === "vi" ? "vi-VN" : "en-US")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {dict.skillDetail.freeToUse}
              </div>
            )}

            {skill.accessType === "PAID" ? (
              <div className="mt-4">
                <PurchasePanel
                  skill={{
                    id: skill.id,
                    slug: skill.slug,
                    title,
                    accessType: skill.accessType,
                    isOwned,
                  }}
                  variant="detail"
                />
              </div>
            ) : null}
          </div>

          {skill.tools.length === 0 ? (
            <div className="aurora rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
              <Rocket className="size-5 text-[#c490ff]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-zinc-900">{dict.skillDetail.runWith}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{dict.skillDetail.runWithText}</p>
              <Link href="/apps/skill-studio" className="btn-secondary mt-4 w-full text-sm">
                {dict.skillDetail.getSkillStudio}
              </Link>
            </div>
          ) : (
          <div className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {dict.skillDetail.worksWith}
            </h3>
            <ul className="mt-3 space-y-2">
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/search?${new URLSearchParams({ tool: tool.slug })}`}
                    className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-zinc-50"
                  >
                    {tool.logoUrl ? (
                      <Image
                        src={tool.logoUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 rounded-md border border-zinc-100 object-contain"
                      />
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-md bg-brand-50 text-xs font-bold text-brand-600">
                        {tool.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium text-zinc-700 group-hover:text-brand-700">
                      {tool.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          )}
        </aside>
      </div>
    </Container>
  );
}