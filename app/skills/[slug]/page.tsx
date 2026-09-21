export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Bookmark, Calendar, Eye, FolderOpen, Megaphone } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { SkillBadge } from "@/src/presentation/components/skill/skill-badge";
import { StarRating } from "@/src/presentation/components/skill/star-rating";
import { SaveButton } from "@/src/presentation/components/skill/save-button";
import { CopyButton } from "@/src/presentation/components/shared/copy-button";
import { skillQueries, engagementCommands, accessCommands } from "@/src/infrastructure/composition";
import { getCurrentUser } from "@/src/infrastructure/authentication/authorization";
import { formatDate, formatNumber, formatCurrencyAmount } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";

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
          className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
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

  const [dict, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  const isFavorite = user ? await engagementCommands.isFavorite(user.id, slug) : false;
  const hasAccess = skill.accessType === "FREE" || Boolean(user && await accessCommands.hasActiveAccess(user.id, skill.id));
  const visibleContent = hasAccess ? skill.content : dict.skillDetail.previewLocked;

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
        href="/#catalog"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {dict.skillDetail.back}
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <SkillBadge accessType={skill.accessType} />
            <StarRating rating={skill.ratingAverage ?? 0} count={skill.ratingCount} />
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {skill.title}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-zinc-600">
            {skill.shortDescription}
          </p>

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

          <section className="mt-10 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-4 sm:px-7">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.thePrompt}</h2>
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
              <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-violet-100 bg-violet-50/50 p-5 text-sm leading-relaxed text-zinc-700">
                {skill.instructions}
              </div>
            </section>
          ) : null}

          {skill.description ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.about}</h2>
              <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-zinc-700">
                {skill.description}
              </div>
            </section>
          ) : null}

          {skill.variables ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">{dict.skillDetail.inputFields}</h2>
              <dl className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
                      {formatCurrencyAmount(price.amount, price.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {dict.skillDetail.freeToUse}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
                      <span className="flex size-7 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-600">
                        {tool.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium text-zinc-700 group-hover:text-indigo-700">
                      {tool.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}