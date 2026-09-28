import type {
  PaginatedResult,
  Pagination,
  ToolDetail,
  ToolListFilters,
  ToolRepository,
  ToolSummary,
} from "@/src/domain/tool";

export interface ToolsDeps {
  tools: ToolRepository;
}

export function createToolQueries(deps: ToolsDeps) {
  return {
    list(
      filters: ToolListFilters,
      pagination: Pagination,
    ): Promise<PaginatedResult<ToolSummary>> {
      return deps.tools.list(filters, pagination);
    },

    findBySlug(slug: string): Promise<ToolDetail | null> {
      return deps.tools.findBySlug(slug);
    },
  };
}
