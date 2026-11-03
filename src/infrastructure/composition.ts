import { createSkillQueries } from "@/src/application/skills/queries";
import { createNewsQueries } from "@/src/application/news/queries";
import { createRankingQueries } from "@/src/application/rankings/queries";
import { createToolQueries } from "@/src/application/tools/queries";
import { createTaxonomyQueries } from "@/src/application/taxonomy/queries";
import { createAccountQueries } from "@/src/application/account/queries";
import { createEngagementCommands } from "@/src/application/engagement/commands";
import { createOrderCommands } from "@/src/application/orders/orders";
import { createAppsService } from "@/src/application/apps/apps-service";
import { createPaymentCommands } from "@/src/application/payments/payments";
import { createSePayWebhookHandler } from "@/src/application/payments/sepay-webhook";
import { createAccessCommands } from "@/src/application/access/access";
import { createUserCommands } from "@/src/application/users/users";
import { createStatistics } from "@/src/application/statistics/statistics";
import { createSkillAdminCommands } from "@/src/application/admin/skills-admin";
import { createArticleAdminCommands } from "@/src/application/admin/articles-admin";
import { createToolAdminCommands } from "@/src/application/admin/tools-admin";
import { createRankingAdminCommands } from "@/src/application/admin/rankings-admin";

import { prismaSkillRepository } from "@/src/infrastructure/repositories/prisma-skill-repository";
import { prismaToolRepository } from "@/src/infrastructure/repositories/prisma-tool-repository";
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
import { prismaToolAdminRepository } from "@/src/infrastructure/repositories/prisma-tool-admin-repository";
import { prismaNewsAdminRepository, prismaNewsCategoryAdminRepository } from "@/src/infrastructure/repositories/prisma-news-admin-repository";
import { prismaRankingAdminRepository } from "@/src/infrastructure/repositories/prisma-ranking-admin-repository";
import { prismaWebhookEventRepository } from "@/src/infrastructure/repositories/prisma-webhook-event-repository";

import { mockPaymentProvider } from "@/src/infrastructure/payment/mock-payment-provider";
import { sePayPaymentProvider } from "@/src/infrastructure/payment/sepay/sepay-payment-provider";
import { prismaPaymentGateway } from "@/src/infrastructure/payment/prisma-payment-gateway";
import { consolePurchaseDeliveryNotifier } from "@/src/infrastructure/notifications/console-purchase-delivery-notifier";
import { isSePayConfigured } from "@/src/lib/env";
import { siteConfig } from "@/src/lib/site";

/**
 * Chọn payment provider theo cấu hình môi trường.
 *
 * - Có SEPAY_API_KEY + SEPAY_ACCOUNT_NUMBER => dùng SePay thật (QR VietQR + webhook).
 * - Ngược lại                      => provider giả lập để demo luồng mua local.
 */
const paymentProvider = isSePayConfigured() ? sePayPaymentProvider : mockPaymentProvider;

export const skillQueries = createSkillQueries({ skills: prismaSkillRepository });
export const toolQueries = createToolQueries({ tools: prismaToolRepository });
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

export const appsService = createAppsService({
  apps: prismaAppRepository,
  users: prismaUserRepository,
});

export const orderCommands = createOrderCommands({
  orders: prismaOrderRepository,
  skills: prismaSkillRepository,
  access: prismaSkillAccessRepository,
  plans: appsService,
});

export const paymentCommands = createPaymentCommands({
  payments: prismaPaymentTransactionRepository,
  provider: paymentProvider,
  gateway: prismaPaymentGateway,
  orders: prismaOrderRepository,
  access: prismaSkillAccessRepository,
  audit: prismaAuditLogRepository,
  revokePlanOrder: (orderId) => appsService.revokeSubscriptionForOrder(orderId),
});

export const sePayWebhook = createSePayWebhookHandler({
  provider: paymentProvider,
  gateway: prismaPaymentGateway,
  events: prismaWebhookEventRepository,
  orders: prismaOrderRepository,
  audit: prismaAuditLogRepository,
  notifier: consolePurchaseDeliveryNotifier,
  fulfilPlan: (input) => appsService.fulfilPaidPlanOrder(input),
  siteUrl: siteConfig.url,
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

export const toolAdminCommands = createToolAdminCommands({
  tools: prismaToolAdminRepository,
  audit: prismaAuditLogRepository,
});

export const articleAdminCommands = createArticleAdminCommands({
  articles: prismaNewsAdminRepository,
  categories: prismaNewsCategoryAdminRepository,
  audit: prismaAuditLogRepository,
});

export const rankingAdminCommands = createRankingAdminCommands({
  rankings: prismaRankingAdminRepository,
  audit: prismaAuditLogRepository,
});

export const skillAccessRepository = prismaSkillAccessRepository;
export const orderRepository = prismaOrderRepository;
export const webhookEventRepository = prismaWebhookEventRepository;

import { prismaOAuthRepository } from "@/src/infrastructure/repositories/prisma-oauth-repository";
import { createOAuthService } from "@/src/application/identity/oauth-service";
export const oauthService = createOAuthService({
  oauth: prismaOAuthRepository,
  users: prismaUserRepository,
});

import { prismaAppRepository } from "@/src/infrastructure/repositories/prisma-app-repository";

// ---------------------------------------------------------------------------
// AI Gateway Module Composition
// ---------------------------------------------------------------------------
import { prismaAiRepository } from "@/src/infrastructure/ai/repositories/prisma-ai-repository";
import { KeyManagerService } from "@/src/application/ai/key-manager.service";
import { taskQueue } from "@/src/infrastructure/ai/queue/task-queue";
import { s3MediaStorage } from "@/src/infrastructure/ai/storage/s3-media-storage";
import { openAIAdapter } from "@/src/infrastructure/ai/adapters/openai.adapter";
import { geminiAdapter } from "@/src/infrastructure/ai/adapters/gemini.adapter";
import { falAiFluxAdapter } from "@/src/infrastructure/ai/adapters/fal-flux.adapter";
import { lumaVideoAdapter } from "@/src/infrastructure/ai/adapters/video.adapter";
import { audioTtsAdapter } from "@/src/infrastructure/ai/adapters/edge-tts.adapter";
import { AiGatewayService } from "@/src/application/ai/ai-gateway.service";
import { TaskWorkerService } from "@/src/application/ai/task-worker.service";

export const aiRepository = prismaAiRepository;
export const keyManagerService = new KeyManagerService(prismaAiRepository);

const imageProvidersMap = new Map([["fal-ai", falAiFluxAdapter]]);
const videoProvidersMap = new Map([["luma", lumaVideoAdapter]]);

export const taskWorkerService = new TaskWorkerService({
  queue: taskQueue,
  repository: prismaAiRepository,
  keyManager: keyManagerService,
  imageProviders: imageProvidersMap,
  videoProviders: videoProvidersMap,
  storage: s3MediaStorage,
});

export const aiGatewayService = new AiGatewayService({
  repository: prismaAiRepository,
  keyManager: keyManagerService,
  queue: taskQueue,
  textProviders: [openAIAdapter, geminiAdapter],
  imageProviders: [falAiFluxAdapter],
  videoProviders: [lumaVideoAdapter],
  audioProviders: [audioTtsAdapter],
});



import { DistributionService } from "@/src/application/apps/distribution-service";
import { prismaDistributionRepository } from "@/src/infrastructure/repositories/prisma-distribution-repository";
import { distributionStorage } from "@/src/infrastructure/storage/distribution-storage";
export const distributionService = new DistributionService(prismaAppRepository, prismaDistributionRepository, distributionStorage);
