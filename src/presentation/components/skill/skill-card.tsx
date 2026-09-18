import Link from "next/link";
import { Bookmark, Eye } from "lucide-react";
import type { SkillCardViewModel } from "@/src/presentation/view-models/skill";
import { SkillBadge } from "@/src/presentation/components/skill/skill-badge";
import { StarRating } from "@/src/presentation/components/skill/star-rating";

function ToolTags({ tools, limit = 3 }: { tools: SkillCardViewModel["tools"]; limit?: number }) {
  if (tools.length === 0) return null;
  const visible = tools.slice(0, limit);
  return (
    <p className="text-sm text-zinc-600">
      <span className="font-medium text-zinc-500">Tools:</span>{" "}
      {visible.map((tool, index) => (
        <span key={tool.slug}>
          {index > 0 ? " / " : ""}
          {tool.name}
        </span>
      ))}
      {tools.length > limit ? ` +${tools.length - limit}` : ""}
    </p>
  );
}

export function SkillCard({ skill }: { skill: SkillCardViewModel }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <SkillBadge accessType={skill.accessType} />
        {skill.categories[0] ? (
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            {skill.categories[0]}
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-zinc-900 group-hover:text-indigo-700">
        {skill.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">
        {skill.description}
      </p>

      <div className="mt-4 space-y-1.5">
        {skill.industries[0] ? (
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-500">Industry:</span>{" "}
            {skill.industries.join(", ")}
          </p>
        ) : null}
        {skill.useCases[0] ? (
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-500">Use case:</span>{" "}
            {skill.useCases.join(", ")}
          </p>
        ) : null}
        <ToolTags tools={skill.tools} />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
        {skill.ratingAverage != null ? (
          <StarRating rating={skill.ratingAverage} count={skill.ratingCount} />
        ) : (
          <span className="text-sm text-zinc-400">No ratings yet</span>
        )}
        <span className="flex items-center gap-2 text-sm text-zinc-500" aria-label={`${skill.favoriteCountLabel} saves`}>
          <span className="flex items-center gap-1">
            <Bookmark className="size-4" aria-hidden="true" />
            {skill.favoriteCountLabel}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="size-4" aria-hidden="true" />
            {skill.viewCountLabel}
          </span>
        </span>
      </div>
    </Link>
  );
}