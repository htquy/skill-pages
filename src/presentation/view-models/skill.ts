import type { SkillSummary } from "@/src/domain/skill";
import { formatNumber } from "@/src/lib/utils";

export interface SkillCardViewModel {
  slug: string;
  title: string;
  description: string;
  accessType: SkillSummary["accessType"];
  coverImageUrl: string | null;
  categories: string[];
  industries: string[];
  useCases: string[];
  tools: { name: string; slug: string }[];
  ratingAverage: number | null;
  ratingCount: number;
  favoriteCountLabel: string;
  viewCountLabel: string;
}

export function toSkillCardViewModel(skill: SkillSummary): SkillCardViewModel {
  return {
    slug: skill.slug,
    title: skill.title,
    description: skill.shortDescription,
    accessType: skill.accessType,
    coverImageUrl: skill.coverImageUrl,
    categories: skill.categories.map((c) => c.name),
    industries: skill.industries.map((i) => i.name),
    useCases: skill.useCases.map((u) => u.name),
    tools: skill.tools.map((t) => ({ name: t.name, slug: t.slug })),
    ratingAverage: skill.ratingAverage,
    ratingCount: skill.ratingCount,
    favoriteCountLabel: formatNumber(skill.favoriteCount),
    viewCountLabel: formatNumber(skill.viewCount),
  };
}