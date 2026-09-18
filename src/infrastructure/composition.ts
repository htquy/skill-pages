import { createSkillQueries } from "@/src/application/skills/queries";
import { createNewsQueries } from "@/src/application/news/queries";
import { createRankingQueries } from "@/src/application/rankings/queries";
import { createTaxonomyQueries } from "@/src/application/taxonomy/queries";
import { createAccountQueries } from "@/src/application/account/queries";
import { createEngagementCommands } from "@/src/application/engagement/commands";
import { prismaSkillRepository } from "@/src/infrastructure/repositories/prisma-skill-repository";
import { prismaNewsRepository } from "@/src/infrastructure/repositories/prisma-news-repository";
import { prismaRankingRepository } from "@/src/infrastructure/repositories/prisma-ranking-repository";
import { prismaTaxonomyRepository } from "@/src/infrastructure/repositories/prisma-taxonomy-repository";
import { prismaEngagementRepository } from "@/src/infrastructure/repositories/prisma-engagement-repository";

export const skillQueries = createSkillQueries({ skills: prismaSkillRepository });
export const newsQueries = createNewsQueries({ news: prismaNewsRepository });
export const rankingQueries = createRankingQueries({ rankings: prismaRankingRepository });
export const taxonomyQueries = createTaxonomyQueries({ taxonomy: prismaTaxonomyRepository });
export const accountQueries = createAccountQueries({
  skills: prismaSkillRepository,
  engagement: prismaEngagementRepository,
});
export const engagementCommands = createEngagementCommands({
  skills: prismaSkillRepository,
  engagement: prismaEngagementRepository,
});