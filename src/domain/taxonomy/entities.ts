export interface TaxonomyOption {
  id: string;
  slug: string;
  name: string;
}

export interface TaxonomySnapshot {
  industries: TaxonomyOption[];
  categories: TaxonomyOption[];
  useCases: TaxonomyOption[];
  tools: TaxonomyOption[];
}

export interface TaxonomyRepository {
  getSnapshot(): Promise<TaxonomySnapshot>;
  getAdminOptions(): Promise<TaxonomySnapshot>;
}