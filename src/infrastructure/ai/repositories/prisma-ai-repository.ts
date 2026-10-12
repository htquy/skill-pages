import { prisma } from "@/src/infrastructure/database/prisma";
import {
  AiClientDto,
  AiKeyStatus,
  AiProviderKeyDto,
  AiTaskDto,
  AiTaskStatus,
  AiTaskType,
  AiUsageLogDto,
} from "@/src/domain/ai/models";
import { IAiRepository } from "@/src/domain/ai/contracts";

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
    taskId?: string | null;
    taskType: AiTaskType;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    statusCode: number;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    await prisma.aiUsageLog.create({
      data: {
        clientId: data.clientId,
        taskId: data.taskId,
        taskType: data.taskType,
        provider: data.provider,
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
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

    return logs.map((l) => ({
      id: l.id,
      clientId: l.clientId,
      taskId: l.taskId,
      taskType: l.taskType,
      provider: l.provider,
      model: l.model,
      promptTokens: l.promptTokens,
      completionTokens: l.completionTokens,
      totalTokens: l.totalTokens,
      latencyMs: l.latencyMs,
      statusCode: l.statusCode,
      errorMessage: l.errorMessage,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    }));
  }

  async countUsageLogs(): Promise<number> {
    return await prisma.aiUsageLog.count();
  }
}

export const prismaAiRepository = new PrismaAiRepository();
