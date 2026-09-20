import { createSkillQueries } from "@/src/application/skills/queries";
import { createNewsQueries } from "@/src/application/news/queries";
import { createRankingQueries } from "@/src/application/rankings/queries";
import { createTaxonomyQueries } from "@/src/application/taxonomy/queries";
import { createAccountQueries } from "@/src/application/account/queries";
import { createEngagementCommands } from "@/src/application/engagement/commands";
import { createOrderCommands } from "@/src/application/orders/orders";
import { createPaymentCommands } from "@/src/application/payments/payments";
import { createAccessCommands } from "@/src/application/access/access";
import { createUserCommands } from "@/src/application/users/users";
import { createStatistics } from "@/src/application/statistics/statistics";
import { createSkillAdminCommands } from "@/src/application/admin/skills-admin";
import { createArticleAdminCommands } from "@/src/application/admin/articles-admin";
import { createRankingAdminCommands } from "@/src/application/admin/rankings-admin";

import { prismaSkillRepository } from "@/src/infrastructure/repositories/prisma-skill-repository";
import { prismaNewsRepository } from "@/src/infrastructure/repositories/prisma-news-repository";
import { prismaRankingRepository } from "@/src/infrastructure/repositories/prisma-ranking-repository";
import { prismaTaxonomyRepository } from "@/src/infrastructure/repositories/prisma-taxonomy-repository";
import { prismaEngagementRepository } from "@/src/infrastructure/repositories/prisma-engagement-repository";
import { prismaOrderRepository } from "@/src/infrastructure/repositories/prisma-order-repository";
import { prismaPaymentTransactionRepository } from "@/src/infrastructure/repositories/prisma-payment-transaction-repository";
import { prismaSkillAccessRepository } from "@/src/infrastructure/repositories/prisma-skill-access-repository";
import { prismaAuditLogRepository } from "@/src/infrastructure/repositories/prisma-audit-log-repository";
import { prismaUserRepository } from "@/src/infrastructure/repositories/prisma-user-repository";
import { prismaSkillAdminRepository } from "@/src/infrastructure/repositories/prisma-skill-admin-repository";
import { prismaNewsAdminRepository } from "@/src/infrastructure/repositories/prisma-news-admin-repository";
import { prismaRankingAdminRepository } from "@/src/infrastructure/repositories/prisma-ranking-admin-repository";

import { mockPaymentProvider } from "@/src/infrastructure/payment/mock-payment-provider";
import { prismaPaymentGateway } from "@/src/infrastructure/payment/prisma-payment-gateway";

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

export const orderCommands = createOrderCommands({
  orders: prismaOrderRepository,
  skills: prismaSkillRepository,
  access: prismaSkillAccessRepository,
});

export const paymentCommands = createPaymentCommands({
  payments: prismaPaymentTransactionRepository,
  provider: mockPaymentProvider,
  gateway: prismaPaymentGateway,
  orders: prismaOrderRepository,
  access: prismaSkillAccessRepository,
  audit: prismaAuditLogRepository,
});

export const accessCommands = createAccessCommands({
  access: prismaSkillAccessRepository,
  audit: prismaAuditLogRepository,
  skills: prismaSkillRepository,
});

export const userCommands = createUserCommands({
  users: prismaUserRepository,
  audit: prismaAuditLogRepository,
});

export const statistics = createStatistics({
  orders: prismaOrderRepository,
  users: prismaUserRepository,
  skills: prismaSkillAdminRepository,
  articles: prismaNewsAdminRepository,
});

export const skillAdminCommands = createSkillAdminCommands({
  skills: prismaSkillAdminRepository,
  audit: prismaAuditLogRepository,
});

export const articleAdminCommands = createArticleAdminCommands({
  articles: prismaNewsAdminRepository,
  audit: prismaAuditLogRepository,
});

export const rankingAdminCommands = createRankingAdminCommands({
  rankings: prismaRankingAdminRepository,
  audit: prismaAuditLogRepository,
});

export const skillAccessRepository = prismaSkillAccessRepository;
export const orderRepository = prismaOrderRepository;