import { prisma } from "@/src/infrastructure/database/prisma";
import type { TaxonomyOption, TaxonomyRepository, TaxonomySnapshot } from "@/src/domain/taxonomy/entities";

function toOption<T extends { slug: string; name: string }>(row: T): TaxonomyOption {
  return { slug: row.slug, name: row.name };
}

export const prismaTaxonomyRepository: TaxonomyRepository = {
  async getSnapshot() {
    const [industries, categories, useCases, tools] = await Promise.all([
      prisma.industry.findMany({
        where: { skills: { some: { skill: { status: "PUBLISHED" } } } },
        orderBy: { name: "asc" },
      }),
      prisma.skillCategory.findMany({
        where: { skills: { some: { skill: { status: "PUBLISHED" } } } },
        orderBy: { name: "asc" },
      }),
      prisma.useCase.findMany({
        where: { skills: { some: { skill: { status: "PUBLISHED" } } } },
        orderBy: { name: "asc" },
      }),
      prisma.aITool.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      }),
    ]);

    const snapshot: TaxonomySnapshot = {
      industries: industries.map(toOption),
      categories: categories.map(toOption),
      useCases: useCases.map(toOption),
      tools: tools.map(toOption),
    };
    return snapshot;
  },
};