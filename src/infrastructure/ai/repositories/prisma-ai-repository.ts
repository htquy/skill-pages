import { prisma } from "@/src/infrastructure/database/prisma";
import {
  AiAppCreditPolicyDto,
  AiClientDto,
  AiKeyStatus,
  AiProviderKeyDto,
  AiTaskDto,
  AiTaskStatus,
  AiTaskType,
  AiUsageLogDto,
  AiUserCreditPeriodDto,
  CreditResetMode,
} from "@/src/domain/ai/models";
import { IAiRepository } from "@/src/domain/ai/contracts";

function mapUsageLog(l: {
  id: string;
  clientId: string | null;
  userId: string | null;
  appSlug: string | null;
  taskId: string | null;
  taskType: AiTaskType;
  provider: string;
  model: string;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: unknown;
  creditsCharged: unknown;
  fallbackUsed: boolean;
  fallbackFrom: string | null;
  latencyMs: number;
  statusCode: number;
  errorMessage: string | null;
  ipAddress: string | null;
  createdAt: Date;
}): AiUsageLogDto {
  return {
    id: l.id,
    clientId: l.clientId,
    userId: l.userId,
    appSlug: l.appSlug,
    taskId: l.taskId,
    taskType: l.taskType,
    provider: l.provider,
    model: l.model,
    promptTokens: l.promptTokens,
    cachedTokens: l.cachedTokens,
    completionTokens: l.completionTokens,
    totalTokens: l.totalTokens,
    costUsd: Number(l.costUsd ?? 0),
    creditsCharged: Number(l.creditsCharged ?? 0),
    fallbackUsed: l.fallbackUsed,
    fallbackFrom: l.fallbackFrom,
    latencyMs: l.latencyMs,
    statusCode: l.statusCode,
    errorMessage: l.errorMessage,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt,
  };
}

function mapCreditPolicy(p: {
  id: string;
  appSlug: string;
  planKey: string;
  monthlyCredits: unknown;
  usdPerCredit: unknown;
  resetMode: string;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  allowedModels: string[];
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AiAppCreditPolicyDto {
  return {
    id: p.id,
    appSlug: p.appSlug,
    planKey: p.planKey,
    monthlyCredits: Number(p.monthlyCredits ?? 0),
    usdPerCredit: Number(p.usdPerCredit ?? 0.002),
    resetMode: (p.resetMode === "TRIAL" ? "TRIAL" : "MONTHLY") as CreditResetMode,
    primaryProvider: p.primaryProvider,
    primaryModel: p.primaryModel,
    fallbackProvider: p.fallbackProvider,
    fallbackModel: p.fallbackModel,
    allowedModels: p.allowedModels,
    isActive: p.isActive,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function mapCreditPeriod(row: {
  id: string;
  userId: string;
  appSlug: string;
  periodKey: string;
  planKey: string;
  allowanceCredits: unknown;
  bonusCredits: unknown;
  usedCredits: unknown;
  usedCostUsd: unknown;
  requestCount: number;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  createdAt: Date;
  updatedAt: Date;
}): AiUserCreditPeriodDto {
  return {
    id: row.id,
    userId: row.userId,
    appSlug: row.appSlug,
    periodKey: row.periodKey,
    planKey: row.planKey,
    allowanceCredits: Number(row.allowanceCredits ?? 0),
    bonusCredits: Number(row.bonusCredits ?? 0),
    usedCredits: Number(row.usedCredits ?? 0),
    usedCostUsd: Number(row.usedCostUsd ?? 0),
    requestCount: row.requestCount,
    promptTokens: row.promptTokens,
    cachedTokens: row.cachedTokens,
    completionTokens: row.completionTokens,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAiRepository implements IAiRepository {
  async getClientByApiKey(apiKey: string): Promise<AiClientDto | null> {
    const client = await prisma.aiClient.findUnique({
      where: { apiKey },
    });
    if (!client) return null;
    return {
      id: client.id,
      name: client.name,
      apiKey: client.apiKey,
      status: client.status,
      rateLimitPerMin: client.rateLimitPerMin,
      allowedProviders: client.allowedProviders,
      allowedTasks: client.allowedTasks,
    };
  }

  async createClient(data: {
    name: string;
    apiKey: string;
    rateLimitPerMin?: number;
    allowedProviders?: string[];
    allowedTasks?: string[];
  }): Promise<AiClientDto> {
    const created = await prisma.aiClient.create({
      data: {
        name: data.name,
        apiKey: data.apiKey,
        rateLimitPerMin: data.rateLimitPerMin ?? 60,
        allowedProviders: data.allowedProviders ?? [],
        allowedTasks: data.allowedTasks ?? [],
      },
    });
    return {
      id: created.id,
      name: created.name,
      apiKey: created.apiKey,
      status: created.status,
      rateLimitPerMin: created.rateLimitPerMin,
      allowedProviders: created.allowedProviders,
      allowedTasks: created.allowedTasks,
    };
  }

  async findKeysByProvider(provider: string, clientId?: string | null): Promise<AiProviderKeyDto[]> {
    const now = new Date();
    const keys = await prisma.aiProviderKey.findMany({
      where: {
        provider,
        AND: [
          {
            OR: [
              { status: "ACTIVE" },
              {
                status: "RATE_LIMITED",
                cooldownUntil: { lte: now },
              },
            ],
          },
          clientId ? { OR: [{ clientId }, { clientId: null }] } : { clientId: null },
        ],
      },
      orderBy: [
        { failureCount: "asc" },
        { successCount: "desc" },
        { lastUsedAt: "asc" },
      ],
    });

    return keys.map((k) => ({
      id: k.id,
      provider: k.provider,
      keySecret: k.keySecret,
      alias: k.alias,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      failureCount: k.failureCount,
      successCount: k.successCount,
      weight: k.weight,
      lastUsedAt: k.lastUsedAt,
      clientId: k.clientId,
    }));
  }

  async getKeyById(id: string): Promise<AiProviderKeyDto | null> {
    const k = await prisma.aiProviderKey.findUnique({ where: { id } });
    if (!k) return null;
    return {
      id: k.id,
      provider: k.provider,
      keySecret: k.keySecret,
      alias: k.alias,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      failureCount: k.failureCount,
      successCount: k.successCount,
      weight: k.weight,
      lastUsedAt: k.lastUsedAt,
      clientId: k.clientId,
    };
  }

  async updateKeyStatus(id: string, status: AiKeyStatus, cooldownUntil?: Date | null): Promise<void> {
    await prisma.aiProviderKey.update({
      where: { id },
      data: {
        status,
        cooldownUntil: cooldownUntil ?? null,
      },
    });
  }

  async incrementKeySuccess(id: string): Promise<void> {
    await prisma.aiProviderKey.update({
      where: { id },
      data: {
        status: "ACTIVE",
        cooldownUntil: null,
        successCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  async incrementKeyFailure(id: string): Promise<void> {
    await prisma.aiProviderKey.update({
      where: { id },
      data: {
        failureCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  async saveKey(data: {
    provider: string;
    keySecret: string;
    alias?: string | null;
    clientId?: string | null;
    weight?: number;
  }): Promise<AiProviderKeyDto> {
    const k = await prisma.aiProviderKey.create({
      data: {
        provider: data.provider,
        keySecret: data.keySecret,
        alias: data.alias,
        clientId: data.clientId,
        weight: data.weight ?? 1,
      },
    });
    return {
      id: k.id,
      provider: k.provider,
      keySecret: k.keySecret,
      alias: k.alias,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      failureCount: k.failureCount,
      successCount: k.successCount,
      weight: k.weight,
      lastUsedAt: k.lastUsedAt,
      clientId: k.clientId,
    };
  }

  async updateKey(
    id: string,
    data: Partial<{
      alias: string | null;
      keySecret: string;
      weight: number;
      status: AiKeyStatus;
      cooldownUntil: Date | null;
    }>,
  ): Promise<AiProviderKeyDto> {
    const k = await prisma.aiProviderKey.update({
      where: { id },
      data: {
        alias: data.alias,
        keySecret: data.keySecret,
        weight: data.weight,
        status: data.status,
        cooldownUntil: data.cooldownUntil,
      },
    });
    return {
      id: k.id,
      provider: k.provider,
      keySecret: k.keySecret,
      alias: k.alias,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      failureCount: k.failureCount,
      successCount: k.successCount,
      weight: k.weight,
      lastUsedAt: k.lastUsedAt,
      clientId: k.clientId,
    };
  }

  async deleteKey(id: string): Promise<void> {
    await prisma.aiProviderKey.delete({ where: { id } });
  }

  async getAllKeys(provider?: string): Promise<AiProviderKeyDto[]> {
    const keys = await prisma.aiProviderKey.findMany({
      where: provider ? { provider } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return keys.map((k) => ({
      id: k.id,
      provider: k.provider,
      keySecret: k.keySecret,
      alias: k.alias,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      failureCount: k.failureCount,
      successCount: k.successCount,
      weight: k.weight,
      lastUsedAt: k.lastUsedAt,
      clientId: k.clientId,
    }));
  }

  async createTask(data: {
    id?: string;
    clientId?: string | null;
    taskType: AiTaskType;
    provider: string;
    model: string;
    prompt?: string | null;
    inputParams?: Record<string, unknown> | null;
    callbackUrl?: string | null;
  }): Promise<AiTaskDto> {
    const created = await prisma.aiTask.create({
      data: {
        id: data.id,
        clientId: data.clientId,
        taskType: data.taskType,
        provider: data.provider,
        model: data.model,
        prompt: data.prompt,
        inputParams: data.inputParams ? JSON.parse(JSON.stringify(data.inputParams)) : undefined,
        callbackUrl: data.callbackUrl,
        callbackStatus: data.callbackUrl ? "PENDING" : "NONE",
      },
    });
    return {
      id: created.id,
      clientId: created.clientId,
      taskType: created.taskType,
      status: created.status,
      provider: created.provider,
      model: created.model,
      prompt: created.prompt,
      inputParams: created.inputParams as Record<string, unknown> | null,
      outputResult: created.outputResult as Record<string, unknown> | null,
      errorMessage: created.errorMessage,
      callbackUrl: created.callbackUrl,
      callbackStatus: created.callbackStatus,
      executionTimeMs: created.executionTimeMs,
      tokensConsumed: created.tokensConsumed,
      costUsd: created.costUsd ? Number(created.costUsd) : null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async getTaskById(taskId: string): Promise<AiTaskDto | null> {
    const task = await prisma.aiTask.findUnique({
      where: { id: taskId },
    });
    if (!task) return null;
    return {
      id: task.id,
      clientId: task.clientId,
      taskType: task.taskType,
      status: task.status,
      provider: task.provider,
      model: task.model,
      prompt: task.prompt,
      inputParams: task.inputParams as Record<string, unknown> | null,
      outputResult: task.outputResult as Record<string, unknown> | null,
      errorMessage: task.errorMessage,
      callbackUrl: task.callbackUrl,
      callbackStatus: task.callbackStatus,
      executionTimeMs: task.executionTimeMs,
      tokensConsumed: task.tokensConsumed,
      costUsd: task.costUsd ? Number(task.costUsd) : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async updateTaskStatus(
    taskId: string,
    data: {
      status: AiTaskStatus;
      outputResult?: Record<string, unknown> | null;
      errorMessage?: string | null;
      callbackStatus?: "NONE" | "PENDING" | "DELIVERED" | "FAILED";
      executionTimeMs?: number | null;
      tokensConsumed?: number | null;
    },
  ): Promise<AiTaskDto> {
    const updated = await prisma.aiTask.update({
      where: { id: taskId },
      data: {
        status: data.status,
        outputResult: data.outputResult ? JSON.parse(JSON.stringify(data.outputResult)) : undefined,
        errorMessage: data.errorMessage,
        callbackStatus: data.callbackStatus,
        executionTimeMs: data.executionTimeMs,
        tokensConsumed: data.tokensConsumed,
      },
    });
    return {
      id: updated.id,
      clientId: updated.clientId,
      taskType: updated.taskType,
      status: updated.status,
      provider: updated.provider,
      model: updated.model,
      prompt: updated.prompt,
      inputParams: updated.inputParams as Record<string, unknown> | null,
      outputResult: updated.outputResult as Record<string, unknown> | null,
      errorMessage: updated.errorMessage,
      callbackUrl: updated.callbackUrl,
      callbackStatus: updated.callbackStatus,
      executionTimeMs: updated.executionTimeMs,
      tokensConsumed: updated.tokensConsumed,
      costUsd: updated.costUsd ? Number(updated.costUsd) : null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async createUsageLog(data: {
    clientId?: string | null;
    userId?: string | null;
    appSlug?: string | null;
    taskId?: string | null;
    taskType: AiTaskType;
    provider: string;
    model: string;
    promptTokens: number;
    cachedTokens?: number;
    completionTokens: number;
    totalTokens: number;
    costUsd?: number;
    creditsCharged?: number;
    fallbackUsed?: boolean;
    fallbackFrom?: string | null;
    latencyMs: number;
    statusCode: number;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    await prisma.aiUsageLog.create({
      data: {
        clientId: data.clientId,
        userId: data.userId,
        appSlug: data.appSlug,
        taskId: data.taskId,
        taskType: data.taskType,
        provider: data.provider,
        model: data.model,
        promptTokens: data.promptTokens,
        cachedTokens: data.cachedTokens ?? 0,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        costUsd: data.costUsd ?? 0,
        creditsCharged: data.creditsCharged ?? 0,
        fallbackUsed: data.fallbackUsed ?? false,
        fallbackFrom: data.fallbackFrom,
        latencyMs: data.latencyMs,
        statusCode: data.statusCode,
        errorMessage: data.errorMessage,
        ipAddress: data.ipAddress,
      },
    });
  }

  async getUsageLogs(limit = 50, offset = 0): Promise<AiUsageLogDto[]> {
    const logs = await prisma.aiUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    return logs.map(mapUsageLog);
  }

  async countUsageLogs(): Promise<number> {
    return await prisma.aiUsageLog.count();
  }

  async listUsageLogsFiltered(filter?: {
    userId?: string;
    appSlug?: string;
    periodStart?: Date;
    periodEnd?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AiUsageLogDto[]> {
    const logs = await prisma.aiUsageLog.findMany({
      where: {
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.appSlug ? { appSlug: filter.appSlug } : {}),
        ...(filter?.periodStart || filter?.periodEnd
          ? {
              createdAt: {
                ...(filter.periodStart ? { gte: filter.periodStart } : {}),
                ...(filter.periodEnd ? { lt: filter.periodEnd } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return logs.map(mapUsageLog);
  }

  async countUsageLogsFiltered(filter?: {
    userId?: string;
    appSlug?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<number> {
    return await prisma.aiUsageLog.count({
      where: {
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.appSlug ? { appSlug: filter.appSlug } : {}),
        ...(filter?.periodStart || filter?.periodEnd
          ? {
              createdAt: {
                ...(filter.periodStart ? { gte: filter.periodStart } : {}),
                ...(filter.periodEnd ? { lt: filter.periodEnd } : {}),
              },
            }
          : {}),
      },
    });
  }

  async listCreditPolicies(appSlug?: string): Promise<AiAppCreditPolicyDto[]> {
    const rows = await prisma.aiAppCreditPolicy.findMany({
      where: appSlug ? { appSlug } : undefined,
      orderBy: [{ appSlug: "asc" }, { planKey: "asc" }],
    });
    return rows.map(mapCreditPolicy);
  }

  async findCreditPolicy(appSlug: string, planKey: string): Promise<AiAppCreditPolicyDto | null> {
    const row = await prisma.aiAppCreditPolicy.findUnique({
      where: { appSlug_planKey: { appSlug, planKey } },
    });
    return row ? mapCreditPolicy(row) : null;
  }

  async upsertCreditPolicy(data: {
    appSlug: string;
    planKey: string;
    monthlyCredits: number;
    usdPerCredit?: number;
    resetMode?: CreditResetMode;
    primaryProvider?: string;
    primaryModel?: string;
    fallbackProvider?: string | null;
    fallbackModel?: string | null;
    allowedModels?: string[];
    isActive?: boolean;
    description?: string | null;
  }): Promise<AiAppCreditPolicyDto> {
    const row = await prisma.aiAppCreditPolicy.upsert({
      where: { appSlug_planKey: { appSlug: data.appSlug, planKey: data.planKey } },
      create: {
        appSlug: data.appSlug,
        planKey: data.planKey,
        monthlyCredits: data.monthlyCredits,
        usdPerCredit: data.usdPerCredit ?? 0.002,
        resetMode: data.resetMode ?? (data.planKey === "FREE" ? "TRIAL" : "MONTHLY"),
        primaryProvider: data.primaryProvider ?? "openrouter",
        primaryModel: data.primaryModel ?? "anthropic/claude-haiku-5.5",
        fallbackProvider: data.fallbackProvider === undefined ? "openrouter" : data.fallbackProvider,
        fallbackModel: data.fallbackModel === undefined ? "openai/gpt-6-luna" : data.fallbackModel,
        allowedModels: data.allowedModels ?? ["anthropic/claude-haiku-5.5", "openai/gpt-6-luna"],
        isActive: data.isActive ?? true,
        description: data.description ?? null,
      },
      update: {
        monthlyCredits: data.monthlyCredits,
        ...(data.usdPerCredit !== undefined ? { usdPerCredit: data.usdPerCredit } : {}),
        ...(data.resetMode !== undefined ? { resetMode: data.resetMode } : {}),
        ...(data.primaryProvider !== undefined ? { primaryProvider: data.primaryProvider } : {}),
        ...(data.primaryModel !== undefined ? { primaryModel: data.primaryModel } : {}),
        ...(data.fallbackProvider !== undefined ? { fallbackProvider: data.fallbackProvider } : {}),
        ...(data.fallbackModel !== undefined ? { fallbackModel: data.fallbackModel } : {}),
        ...(data.allowedModels !== undefined ? { allowedModels: data.allowedModels } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
    return mapCreditPolicy(row);
  }

  async deleteCreditPolicy(id: string): Promise<void> {
    await prisma.aiAppCreditPolicy.delete({ where: { id } });
  }

  async getUserCreditPeriod(userId: string, appSlug: string, periodKey: string): Promise<AiUserCreditPeriodDto | null> {
    const row = await prisma.aiUserCreditPeriod.findUnique({
      where: { userId_appSlug_periodKey: { userId, appSlug, periodKey } },
    });
    return row ? mapCreditPeriod(row) : null;
  }

  async getTrialAggregateForUserApp(userId: string, appSlug: string): Promise<{
    usedCredits: number;
    bonusCredits: number;
    usedCostUsd: number;
    requestCount: number;
  }> {
    const agg = await prisma.aiUserCreditPeriod.aggregate({
      where: { userId, appSlug, planKey: "FREE" },
      _sum: {
        usedCredits: true,
        bonusCredits: true,
        usedCostUsd: true,
        requestCount: true,
      },
    });
    return {
      usedCredits: Number(agg._sum.usedCredits ?? 0),
      bonusCredits: Number(agg._sum.bonusCredits ?? 0),
      usedCostUsd: Number(agg._sum.usedCostUsd ?? 0),
      requestCount: Number(agg._sum.requestCount ?? 0),
    };
  }

  async addBonusCredits(data: {
    userId: string;
    appSlug: string;
    periodKey: string;
    planKey?: string;
    allowanceCredits?: number;
    bonusDelta: number;
  }): Promise<AiUserCreditPeriodDto> {
    const row = await prisma.aiUserCreditPeriod.upsert({
      where: {
        userId_appSlug_periodKey: {
          userId: data.userId,
          appSlug: data.appSlug,
          periodKey: data.periodKey,
        },
      },
      create: {
        userId: data.userId,
        appSlug: data.appSlug,
        periodKey: data.periodKey,
        planKey: data.planKey ?? "FREE",
        allowanceCredits: data.allowanceCredits ?? 0,
        bonusCredits: data.bonusDelta,
      },
      update: {
        bonusCredits: { increment: data.bonusDelta },
      },
    });
    return mapCreditPeriod(row);
  }

  async recordUserPeriodUsageAndLog(data: {
    clientId?: string | null;
    userId: string;
    appSlug: string;
    periodKey: string;
    planKey: string;
    allowanceCredits: number;
    freeAllowanceOnUpgrade?: number;
    taskId?: string | null;
    taskType: AiTaskType;
    provider: string;
    model: string;
    promptTokens: number;
    cachedTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    creditsCharged: number;
    fallbackUsed: boolean;
    fallbackFrom?: string | null;
    latencyMs: number;
    statusCode: number;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<AiUserCreditPeriodDto> {
    return await prisma.$transaction(async (tx) => {
      await tx.aiUsageLog.create({
        data: {
          clientId: data.clientId,
          userId: data.userId,
          appSlug: data.appSlug,
          taskId: data.taskId,
          taskType: data.taskType,
          provider: data.provider,
          model: data.model,
          promptTokens: data.promptTokens,
          cachedTokens: data.cachedTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          costUsd: data.costUsd,
          creditsCharged: data.creditsCharged,
          fallbackUsed: data.fallbackUsed,
          fallbackFrom: data.fallbackFrom,
          latencyMs: data.latencyMs,
          statusCode: data.statusCode,
          errorMessage: data.errorMessage,
          ipAddress: data.ipAddress,
        },
      });

      const existing = await tx.aiUserCreditPeriod.findUnique({
        where: {
          userId_appSlug_periodKey: {
            userId: data.userId,
            appSlug: data.appSlug,
            periodKey: data.periodKey,
          },
        },
      });

      if (!existing) {
        const created = await tx.aiUserCreditPeriod.create({
          data: {
            userId: data.userId,
            appSlug: data.appSlug,
            periodKey: data.periodKey,
            planKey: data.planKey,
            allowanceCredits: data.allowanceCredits,
            usedCredits: data.creditsCharged,
            usedCostUsd: data.costUsd,
            requestCount: 1,
            promptTokens: data.promptTokens,
            cachedTokens: data.cachedTokens,
            completionTokens: data.completionTokens,
          },
        });
        return mapCreditPeriod(created);
      }

      let nextAllowance = Number(existing.allowanceCredits);
      if (existing.planKey === "FREE" && data.planKey !== "FREE") {
        // User upgraded from FREE to paid plan mid-month: keep prior FREE usage covered so they enjoy full Pro monthly allowance.
        const coveredFreeUsed = Math.min(
          Number(existing.usedCredits),
          data.freeAllowanceOnUpgrade ?? Number(existing.allowanceCredits),
        );
        nextAllowance = Math.max(nextAllowance, data.allowanceCredits + coveredFreeUsed);
      } else if (data.planKey !== existing.planKey || data.allowanceCredits > nextAllowance) {
        nextAllowance = Math.max(nextAllowance, data.allowanceCredits);
      }

      const updated = await tx.aiUserCreditPeriod.update({
        where: { id: existing.id },
        data: {
          planKey: data.planKey,
          allowanceCredits: nextAllowance,
          usedCredits: { increment: data.creditsCharged },
          usedCostUsd: { increment: data.costUsd },
          requestCount: { increment: 1 },
          promptTokens: { increment: data.promptTokens },
          cachedTokens: { increment: data.cachedTokens },
          completionTokens: { increment: data.completionTokens },
        },
      });
      return mapCreditPeriod(updated);
    });
  }

  async listUserCreditPeriods(filter?: {
    periodKey?: string;
    appSlug?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AiUserCreditPeriodDto[]> {
    const rows = await prisma.aiUserCreditPeriod.findMany({
      where: {
        ...(filter?.periodKey ? { periodKey: filter.periodKey } : {}),
        ...(filter?.appSlug ? { appSlug: filter.appSlug } : {}),
        ...(filter?.userId ? { userId: filter.userId } : {}),
      },
      orderBy: [{ periodKey: "desc" }, { usedCredits: "desc" }],
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(mapCreditPeriod);
  }

  async countUserCreditPeriods(filter?: {
    periodKey?: string;
    appSlug?: string;
    userId?: string;
  }): Promise<number> {
    return await prisma.aiUserCreditPeriod.count({
      where: {
        ...(filter?.periodKey ? { periodKey: filter.periodKey } : {}),
        ...(filter?.appSlug ? { appSlug: filter.appSlug } : {}),
        ...(filter?.userId ? { userId: filter.userId } : {}),
      },
    });
  }
}

export const prismaAiRepository = new PrismaAiRepository();
