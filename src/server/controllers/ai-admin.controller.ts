import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import {
  aiGatewayService,
  aiRepository,
  appsService,
  keyManagerService,
  toolQueries,
  userRepository,
} from "@/src/infrastructure/composition";
import { isAppError } from "@/src/domain/errors";
import { currentUtcPeriodKey, monthBoundsUtc } from "@/src/application/ai/credit-pricing";

const createKeySchema = z.object({
  provider: z.string().min(1).max(60),
  keySecret: z.string().min(1),
  alias: z.string().max(120).optional(),
  clientId: z.string().optional().nullable(),
  weight: z.number().int().min(1).max(100).default(1),
});

const updateKeySchema = z.object({
  alias: z.string().max(120).optional().nullable(),
  keySecret: z.string().min(1).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "RATE_LIMITED", "SUSPENDED", "EXPIRED"]).optional(),
  resetCooldown: z.boolean().optional(),
});

const testApiSchema = z.object({
  taskType: z.enum(["VERIFY_KEY", "TEXT", "IMAGE", "AUDIO"]),
  provider: z.string().min(1),
  model: z.string().optional(),
  prompt: z.string().max(4000).optional(),
  customKey: z.string().optional(),
});

const upsertPolicySchema = z.object({
  appSlug: z.string().trim().min(1).max(120),
  planKey: z.string().trim().min(1).max(80),
  monthlyCredits: z.number().min(0).max(1_000_000),
  usdPerCredit: z.number().positive().max(10).default(0.002),
  resetMode: z.enum(["MONTHLY", "TRIAL"]).default("MONTHLY"),
  primaryProvider: z.string().trim().min(1).max(60).default("openrouter"),
  primaryModel: z.string().trim().min(1).max(120).default("anthropic/claude-haiku-5.5"),
  fallbackProvider: z.string().trim().max(60).nullable().optional(),
  fallbackModel: z.string().trim().max(120).nullable().optional(),
  allowedModels: z.array(z.string().trim().min(1)).max(50).optional(),
  isActive: z.boolean().default(true),
  description: z.string().max(500).nullable().optional(),
});

const bonusCreditSchema = z.object({
  userId: z.string().trim().min(1),
  appSlug: z.string().trim().min(1).max(120).default("skill-studio"),
  periodKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  bonusDelta: z.number().min(-100_000).max(100_000),
});

async function resolveUsersMap(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, { id: string; email: string | null; name: string | null }>();
  await Promise.all(
    unique.map(async (id) => {
      const u = await userRepository.findById(id);
      if (u) map.set(id, { id: u.id, email: u.email, name: u.name });
    }),
  );
  return map;
}

export class AiAdminController {
  /** GET /api/admin/ai/keys */
  static async listKeys(): Promise<NextResponse> {
    try {
      await requireAdmin();
      const keys = await keyManagerService.listKeys();
      const maskedKeys = keys.map((k) => ({
        ...k,
        keySecretMasked:
          k.keySecret.length > 10
            ? `${k.keySecret.slice(0, 4)}••••••••${k.keySecret.slice(-4)}`
            : "••••••••",
      }));
      return NextResponse.json(maskedKeys);
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to list AI keys" }, { status: 500 });
    }
  }

  /** POST /api/admin/ai/keys */
  static async createKey(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const input = createKeySchema.parse(body);

      const created = await keyManagerService.upsertKey({
        provider: input.provider.toLowerCase().trim(),
        keySecret: input.keySecret.trim(),
        alias: input.alias?.trim() || null,
        clientId: input.clientId || null,
        weight: input.weight,
      });

      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Dữ liệu không hợp lệ", details: error.flatten() }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to create AI key" }, { status: 500 });
    }
  }

  /** PUT /api/admin/ai/keys/[id] */
  static async updateKey(request: Request, id: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const input = updateKeySchema.parse(body);

      const updated = await keyManagerService.updateKey(id, {
        alias: input.alias,
        keySecret: input.keySecret,
        weight: input.weight,
        status: input.status,
        cooldownUntil: input.resetCooldown ? null : undefined,
      });

      return NextResponse.json(updated);
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to update AI key" }, { status: 500 });
    }
  }

  /** DELETE /api/admin/ai/keys/[id] */
  static async deleteKey(_request: Request, id: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      await keyManagerService.deleteKey(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to delete AI key" }, { status: 500 });
    }
  }

  /** GET /api/admin/ai/logs */
  static async listLogs(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const offset = (page - 1) * limit;
      const userId = searchParams.get("userId")?.trim() || undefined;
      const appSlug = searchParams.get("appSlug")?.trim().toLowerCase() || undefined;
      const periodKey = searchParams.get("periodKey")?.trim() || undefined;
      const bounds = periodKey ? monthBoundsUtc(periodKey) : null;

      const filter = {
        userId,
        appSlug,
        periodStart: bounds?.start,
        periodEnd: bounds?.end,
        limit,
        offset,
      };

      const [logs, total] = await Promise.all([
        aiRepository.listUsageLogsFiltered(filter),
        aiRepository.countUsageLogsFiltered(filter),
      ]);

      const usersMap = await resolveUsersMap(
        logs.map((l) => l.userId || "").filter(Boolean),
      );

      return NextResponse.json({
        logs: logs.map((l) => ({
          ...l,
          userEmail: l.userId ? usersMap.get(l.userId)?.email ?? null : null,
          userName: l.userId ? usersMap.get(l.userId)?.name ?? null : null,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to load AI logs" }, { status: 500 });
    }
  }

  /** GET /api/admin/ai/policies */
  static async listPolicies(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const appSlug = searchParams.get("appSlug")?.trim().toLowerCase() || undefined;

      const [policies, activeApps, toolsPage] = await Promise.all([
        aiRepository.listCreditPolicies(appSlug),
        appsService.listActiveApps(),
        toolQueries.list({}, { page: 1, pageSize: 100 }),
      ]);

      return NextResponse.json({
        policies,
        apps: activeApps.map((a) => ({
          id: a.id,
          slug: a.slug,
          name: a.name,
          plans: a.plans.map((p) => ({ id: p.id, name: p.name })),
        })),
        tools: toolsPage.items.map((t) => ({
          slug: t.slug,
          title: t.title,
          appSlug: t.appSlug ?? t.slug,
        })),
      });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to load credit policies" }, { status: 500 });
    }
  }

  /** PUT /api/admin/ai/policies */
  static async upsertPolicy(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const input = upsertPolicySchema.parse(body);

      const saved = await aiRepository.upsertCreditPolicy({
        appSlug: input.appSlug.toLowerCase(),
        planKey: input.planKey,
        monthlyCredits: input.monthlyCredits,
        usdPerCredit: input.usdPerCredit,
        resetMode: input.resetMode,
        primaryProvider: input.primaryProvider.toLowerCase(),
        primaryModel: input.primaryModel,
        fallbackProvider: input.fallbackProvider ? input.fallbackProvider.toLowerCase() : null,
        fallbackModel: input.fallbackModel || null,
        allowedModels:
          input.allowedModels && input.allowedModels.length > 0
            ? input.allowedModels
            : [
                input.primaryModel,
                ...(input.fallbackModel ? [input.fallbackModel] : []),
              ],
        isActive: input.isActive,
        description: input.description ?? null,
      });

      return NextResponse.json(saved);
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to save credit policy" }, { status: 500 });
    }
  }

  /** DELETE /api/admin/ai/policies/[id] */
  static async deletePolicy(_request: Request, id: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      await aiRepository.deleteCreditPolicy(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to delete credit policy" }, { status: 500 });
    }
  }

  /** GET /api/admin/ai/usage?periodKey=YYYY-MM&appSlug=...&q=...&userId=... */
  static async getMonthlyUsage(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const periodKey = searchParams.get("periodKey")?.trim() || currentUtcPeriodKey();
      const appSlug = searchParams.get("appSlug")?.trim().toLowerCase() || undefined;
      const q = searchParams.get("q")?.trim() || undefined;
      const explicitUserId = searchParams.get("userId")?.trim() || undefined;
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const offset = (page - 1) * limit;

      let targetUserId = explicitUserId;
      if (!targetUserId && q) {
        if (q.includes("@")) {
          const exact = await userRepository.findByEmail(q);
          if (exact) targetUserId = exact.id;
        }
        if (!targetUserId) {
          const found = await userRepository.listForAdmin({ q }, { page: 1, pageSize: 10 });
          if (found.items.length === 1) {
            targetUserId = found.items[0].id;
          } else if (found.items.length === 0) {
            return NextResponse.json({
              periodKey,
              accounts: [],
              totals: { accounts: 0, requests: 0, creditsUsed: 0, costUsd: 0 },
              pagination: { total: 0, page, limit, totalPages: 0 },
            });
          } else {
            // Multiple matching users: fetch all their periods and combine
            const matchedPeriods = (
              await Promise.all(
                found.items.map((u) =>
                  aiRepository.listUserCreditPeriods({
                    periodKey,
                    appSlug,
                    userId: u.id,
                    limit: 50,
                  }),
                ),
              )
            ).flat();
            const userLookup = new Map(found.items.map((u) => [u.id, u]));
            const accounts = matchedPeriods.map((p) => {
              const u = userLookup.get(p.userId);
              return {
                ...p,
                userEmail: u?.email ?? null,
                userName: u?.name ?? null,
                remainingCredits: Math.max(
                  0,
                  Number((p.allowanceCredits + p.bonusCredits - p.usedCredits).toFixed(4)),
                ),
              };
            });
            return NextResponse.json({
              periodKey,
              accounts,
              totals: {
                accounts: accounts.length,
                requests: accounts.reduce((s, a) => s + a.requestCount, 0),
                creditsUsed: Number(accounts.reduce((s, a) => s + a.usedCredits, 0).toFixed(4)),
                costUsd: Number(accounts.reduce((s, a) => s + a.usedCostUsd, 0).toFixed(6)),
              },
              pagination: { total: accounts.length, page: 1, limit, totalPages: 1 },
            });
          }
        }
      }

      const [periods, total] = await Promise.all([
        aiRepository.listUserCreditPeriods({
          periodKey,
          appSlug,
          userId: targetUserId,
          limit,
          offset,
        }),
        aiRepository.countUserCreditPeriods({
          periodKey,
          appSlug,
          userId: targetUserId,
        }),
      ]);

      const usersMap = await resolveUsersMap(periods.map((p) => p.userId));
      const accounts = periods.map((p) => {
        const u = usersMap.get(p.userId);
        return {
          ...p,
          userEmail: u?.email ?? null,
          userName: u?.name ?? null,
          remainingCredits: Math.max(
            0,
            Number((p.allowanceCredits + p.bonusCredits - p.usedCredits).toFixed(4)),
          ),
        };
      });

      return NextResponse.json({
        periodKey,
        accounts,
        totals: {
          accounts: total,
          requests: accounts.reduce((s, a) => s + a.requestCount, 0),
          creditsUsed: Number(accounts.reduce((s, a) => s + a.usedCredits, 0).toFixed(4)),
          costUsd: Number(accounts.reduce((s, a) => s + a.usedCostUsd, 0).toFixed(6)),
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to load monthly usage" }, { status: 500 });
    }
  }

  /** POST /api/admin/ai/usage/bonus */
  static async grantBonusCredits(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const input = bonusCreditSchema.parse(body);

      const periodKey = input.periodKey || currentUtcPeriodKey();
      const currentStatus = await aiGatewayService.getUserCreditStatus(
        input.userId,
        input.appSlug,
      );
      const updated = await aiRepository.addBonusCredits({
        userId: input.userId,
        appSlug: currentStatus.appSlug,
        periodKey,
        planKey: currentStatus.planKey,
        allowanceCredits: currentStatus.allowanceCredits,
        bonusDelta: input.bonusDelta,
      });

      return NextResponse.json(updated);
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to adjust bonus credits" }, { status: 500 });
    }
  }

  /** POST /api/admin/ai/test - Trực tiếp thử nghiệm API từ Admin Panel */
  static async testApi(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const input = testApiSchema.parse(body);

      if (input.taskType === "VERIFY_KEY") {
        const result = await aiGatewayService.verifyProviderKey(
          input.provider,
          input.customKey,
        );
        return NextResponse.json({ kind: "VERIFY_KEY", result });
      }

      const prompt = input.prompt?.trim() || "";
      if (!prompt) {
        return NextResponse.json({ error: "Vui lòng nhập prompt để test API." }, { status: 400 });
      }

      // Không truyền fake clientId để tránh vi phạm FK ai_usage_logs.clientId -> ai_clients.id
      const adminAuth = {
        client: null,
        authType: "api_key" as const,
        byokKey: input.customKey || undefined,
      };

      if (input.taskType === "TEXT") {
        const result = await aiGatewayService.generateText(
          {
            provider: input.provider,
            model: input.model,
            messages: [{ role: "user", content: prompt }],
            maxTokens: 128,
            allowFallback: false,
            stream: false,
          },
          adminAuth,
        );
        return NextResponse.json({ kind: "TEXT", result });
      }

      if (input.taskType === "AUDIO") {
        const result = await aiGatewayService.synthesizeAudio(
          {
            provider: input.provider,
            model: input.model,
            text: prompt,
            voice: "alloy",
          },
          adminAuth,
        );
        const base64Audio = result.audioBuffer
          ? `data:${result.contentType};base64,${result.audioBuffer.toString("base64")}`
          : undefined;

        return NextResponse.json({
          kind: "AUDIO",
          result: {
            audioUrl: base64Audio,
            durationSeconds: result.durationSeconds,
            executionTimeMs: result.executionTimeMs,
          },
        });
      }

      if (input.taskType === "IMAGE") {
        const result = await aiGatewayService.generateImage(
          {
            provider: input.provider,
            model: input.model,
            prompt,
            aspectRatio: "1:1",
          },
          adminAuth,
        );
        return NextResponse.json({ kind: "IMAGE", result });
      }

      return NextResponse.json({ error: "Unsupported task type" }, { status: 400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test execution failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
