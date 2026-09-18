import type { EngagementRepository } from "@/src/domain/identity/entities";
import { NotFoundError } from "@/src/domain/errors";
import type { SkillRepository } from "@/src/domain/skill";

export interface EngagementDeps {
  skills: SkillRepository;
  engagement: EngagementRepository;
}

export interface FavoriteState {
  skillSlug: string;
  isFavorite: boolean;
}

export function createEngagementCommands(deps: EngagementDeps) {
  return {
    async toggleFavorite(userId: string, skillSlug: string): Promise<FavoriteState> {
      const skill = await deps.skills.findBySlug(skillSlug);
      if (!skill) {
        throw new NotFoundError(`Skill "${skillSlug}" was not found`);
      }

      const isFavorite = await deps.engagement.isFavorite(userId, skill.id);
      if (isFavorite) {
        await deps.engagement.removeFavorite(userId, skill.id);
      } else {
        await deps.engagement.addFavorite(userId, skill.id);
      }

      return { skillSlug, isFavorite: !isFavorite };
    },

    async isFavorite(userId: string, skillSlug: string): Promise<boolean> {
      const skill = await deps.skills.findBySlug(skillSlug);
      if (!skill) {
        throw new NotFoundError(`Skill "${skillSlug}" was not found`);
      }
      return deps.engagement.isFavorite(userId, skill.id);
    },

    recordSkillView(skillSlug: string, opts: { userId: string | null; sessionHash: string | null }): Promise<void> {
      return deps.skills.findBySlug(skillSlug).then((skill) => {
        if (!skill) {
          throw new NotFoundError(`Skill "${skillSlug}" was not found`);
        }
        return deps.engagement.recordSkillView(skill.id, opts);
      });
    },
  };
}