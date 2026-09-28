import type { SkillSummary } from "@/src/domain/skill";
import { formatNumber } from "@/src/lib/utils";

export interface SkillCardViewModel {
  id: string;
  slug: string;
  title: string;
  description: string;
  accessType: SkillSummary["accessType"];
  coverImageUrl: string | null;
  videoDemoUrl: string | null;
  isOwned: boolean;
  categories: string[];
  industries: string[];
  useCases: string[];
  tools: { name: string; slug: string }[];
  ratingAverage: number | null;
  ratingCount: number;
  favoriteCountLabel: string;
  viewCountLabel: string;
}

export function toSkillCardViewModel(
  skill: SkillSummary,
  options: { isOwned?: boolean } = {},
): SkillCardViewModel {
  return {
    id: skill.id,
    slug: skill.slug,
    title: skill.title,
    description: skill.shortDescription,
    accessType: skill.accessType,
    coverImageUrl: skill.coverImageUrl,
    videoDemoUrl: skill.videoDemoUrl,
    isOwned: options.isOwned ?? false,
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

/** Set skillId đã sở hữu để tra cứu O(1) khi map sang view model. */
export function createOwnershipLookup(ownedSkillIds: string[]): (skillId: string) => boolean {
  const owned = new Set(ownedSkillIds);
  return (skillId) => owned.has(skillId);
}