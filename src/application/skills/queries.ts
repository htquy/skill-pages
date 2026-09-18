import type {
  Pagination,
  PaginatedResult,
  SkillDetail,
  SkillListFilters,
  SkillRepository,
  SkillSummary,
} from "@/src/domain/skill";

export interface SkillsDeps {
  skills: SkillRepository;
}

export function createSkillQueries(deps: SkillsDeps) {
  return {
    getFeatured(limit = 6): Promise<SkillSummary[]> {
      return deps.skills.findFeatured(limit);
    },

    search(
      filters: SkillListFilters,
      pagination: Pagination,
    ): Promise<PaginatedResult<SkillSummary>> {
      return deps.skills.search(filters, pagination);
    },

    findBySlug(slug: string): Promise<SkillDetail | null> {
      return deps.skills.findBySlug(slug);
    },
  };
}