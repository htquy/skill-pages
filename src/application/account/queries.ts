import type { CurrentUser, EngagementRepository } from "@/src/domain/identity/entities";
import type { SkillRepository, SkillSummary } from "@/src/domain/skill";

export interface AccountDeps {
  skills: SkillRepository;
  engagement: EngagementRepository;
}

export function createAccountQueries(deps: AccountDeps) {
  return {
    async listSavedSkills(user: CurrentUser): Promise<SkillSummary[]> {
      const ids = await deps.engagement.listFavoriteSkillIds(user.id);
      if (ids.length === 0) return [];
      return deps.skills.findSummariesByIds(ids);
    },
  };
}