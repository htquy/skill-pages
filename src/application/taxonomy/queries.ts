import type { TaxonomyRepository, TaxonomySnapshot } from "@/src/domain/taxonomy/entities";

export interface TaxonomyDeps {
  taxonomy: TaxonomyRepository;
}

export function createTaxonomyQueries(deps: TaxonomyDeps) {
  return {
    getSnapshot(): Promise<TaxonomySnapshot> {
      return deps.taxonomy.getSnapshot();
    },

    getAdminOptions(): Promise<TaxonomySnapshot> {
      return deps.taxonomy.getAdminOptions();
    },
  };
}