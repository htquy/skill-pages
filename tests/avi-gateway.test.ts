import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { OpenAIAdapter } from "../src/infrastructure/ai/adapters/openai.adapter";
import { AiGatewayService } from "../src/application/ai/ai-gateway.service";
import { KeyManagerService, sanitizeApiKeySecret } from "../src/application/ai/key-manager.service";
import { AiCreditsExhaustedError } from "../src/domain/ai/errors";
import type {
  AiAppCreditPolicyDto,
  AiTaskDto,
  AiUsageLogDto,
  AiUserCreditPeriodDto,
  TextStreamChunk,
  UnifiedTextRequest,
  UnifiedTextResponse,
} from "../src/domain/ai/models";
import type { IAiRepository, ITaskQueue, ITextProvider } from "../src/domain/ai/contracts";
import { calculateCostUsd, currentUtcPeriodKey, isRetryableFallbackError, usdToCredits } from "../src/application/ai/credit-pricing";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("OpenRouter forwards tool definitions/results with deny collection and returns calls", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.provider.data_collection, "deny");
    assert.equal(body.tool_choice, "auto");
    assert.equal(body.tools[0].function.name, "catalog");
    assert.deepEqual(body.messages[1], {
      role: "tool",
      content: "{}",
      tool_call_id: "prior",
    });
    return Response.json({
      id: "r1",
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call1",
                type: "function",
                function: { name: "catalog", arguments: "{}" },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
      usage: { prompt_tokens: 9, completion_tokens: 2, total_tokens: 11 },
    });
  };
  const adapter = new OpenAIAdapter(
    "https://openrouter.ai/api/v1",
    "openrouter",
  );
  const result = await adapter.generateText(
    {
      model: "test",
      messages: [
        { role: "user", content: "price" },
        { role: "tool", content: "{}", tool_call_id: "prior" },
      ],
      tools: [
        {
          type: "function",
          function: { name: "catalog", parameters: { type: "object" } },
        },
      ],
    },
    "fake-test-key",
  );
  assert.equal(result.toolCalls?.[0].function.name, "catalog");
  assert.equal(result.usage.totalTokens, 11);
});

test("SSE preserves tool-call deltas including partial arguments", async () => {
  const encoder = new TextEncoder();
  const frames = [
    {
      id: "r2",
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call2",
                type: "function",
                function: { name: "catalog", arguments: '{"q":' },
              },
            ],
          },
        },
      ],
    },
    {
      id: "r2",
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '"tile"}' } }],
          },
          finish_reason: "tool_calls",
        },
      ],
    },
  ];
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          for (const frame of frames)
            controller.enqueue(
              encoder.encode("data: " + JSON.stringify(frame) + "\n\n"),
            );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );
  const adapter = new OpenAIAdapter();
  const chunks = [];
  for await (const chunk of adapter.streamText(
    { messages: [{ role: "user", content: "find" }] },
    "fake-test-key",
  ))
    chunks.push(chunk);
  assert.equal(chunks[0].toolCallDeltas?.[0].id, "call2");
  assert.equal(chunks[1].finishReason, "tool_calls");
  assert.ok(chunks[1].toolCallDeltas?.[0].function?.arguments);
  assert.equal(chunks.at(-1)?.isFinished, true);
});


function createInMemoryAiRepo() {
  const logs: AiUsageLogDto[] = [];
  const policies: AiAppCreditPolicyDto[] = [];
  const periods = new Map<string, AiUserCreditPeriodDto>();

  const repo: IAiRepository = {
    async getClientByApiKey() {
      return null;
    },
    async createClient() {
      throw new Error("not used");
    },
    async findKeysByProvider(provider: string) {
      if (provider === "openrouter") {
        return [
          {
            id: "key-or-1",
            provider: "openrouter",
            keySecret: "sk-or-test-key",
            alias: "OpenRouter Primary",
            status: "ACTIVE",
            failureCount: 0,
            successCount: 0,
            weight: 1,
          },
        ];
      }
      return [];
    },
    async getKeyById() {
      return null;
    },
    async updateKeyStatus() {},
    async incrementKeySuccess() {},
    async incrementKeyFailure() {},
    async saveKey() {
      throw new Error("not used");
    },
    async updateKey() {
      throw new Error("not used");
    },
    async deleteKey() {},
    async getAllKeys() {
      return [];
    },
    async createTask(): Promise<AiTaskDto> {
      throw new Error("not used");
    },
    async getTaskById() {
      return null;
    },
    async updateTaskStatus() {
      throw new Error("not used");
    },
    async createUsageLog(data) {
      logs.push({
        id: `log-${logs.length + 1}`,
        clientId: data.clientId ?? null,
        userId: data.userId ?? null,
        appSlug: data.appSlug ?? null,
        taskId: data.taskId ?? null,
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
        fallbackFrom: data.fallbackFrom ?? null,
        latencyMs: data.latencyMs,
        statusCode: data.statusCode,
        errorMessage: data.errorMessage ?? null,
        ipAddress: data.ipAddress ?? null,
        createdAt: new Date(),
      });
    },
    async getUsageLogs() {
      return logs;
    },
    async countUsageLogs() {
      return logs.length;
    },
    async listUsageLogsFiltered(filter) {
      return logs.filter(
        (l) =>
          (!filter?.userId || l.userId === filter.userId) &&
          (!filter?.appSlug || l.appSlug === filter.appSlug),
      );
    },
    async countUsageLogsFiltered(filter) {
      return (await this.listUsageLogsFiltered(filter)).length;
    },
    async listCreditPolicies(appSlug) {
      return appSlug ? policies.filter((p) => p.appSlug === appSlug) : policies;
    },
    async findCreditPolicy(appSlug, planKey) {
      return policies.find((p) => p.appSlug === appSlug && p.planKey === planKey) ?? null;
    },
    async upsertCreditPolicy(data) {
      const idx = policies.findIndex(
        (p) => p.appSlug === data.appSlug && p.planKey === data.planKey,
      );
      const item: AiAppCreditPolicyDto = {
        id: idx >= 0 ? policies[idx].id : `pol-${policies.length + 1}`,
        appSlug: data.appSlug,
        planKey: data.planKey,
        monthlyCredits: data.monthlyCredits,
        usdPerCredit: data.usdPerCredit ?? 0.002,
        resetMode: data.resetMode ?? "MONTHLY",
        primaryProvider: data.primaryProvider ?? "openrouter",
        primaryModel: data.primaryModel ?? "anthropic/claude-haiku-5.5",
        fallbackProvider: data.fallbackProvider ?? "openrouter",
        fallbackModel: data.fallbackModel ?? "openai/gpt-6-luna",
        allowedModels: data.allowedModels ?? ["anthropic/claude-haiku-5.5", "openai/gpt-6-luna"],
        isActive: data.isActive ?? true,
        description: data.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (idx >= 0) policies[idx] = item;
      else policies.push(item);
      return item;
    },
    async deleteCreditPolicy(id) {
      const idx = policies.findIndex((p) => p.id === id);
      if (idx >= 0) policies.splice(idx, 1);
    },
    async getUserCreditPeriod(userId, appSlug, periodKey) {
      return periods.get(`${userId}:${appSlug}:${periodKey}`) ?? null;
    },
    async getTrialAggregateForUserApp(userId, appSlug) {
      let usedCredits = 0;
      let bonusCredits = 0;
      let usedCostUsd = 0;
      let requestCount = 0;
      for (const p of periods.values()) {
        if (p.userId === userId && p.appSlug === appSlug && p.planKey === "FREE") {
          usedCredits += p.usedCredits;
          bonusCredits += p.bonusCredits;
          usedCostUsd += p.usedCostUsd;
          requestCount += p.requestCount;
        }
      }
      return { usedCredits, bonusCredits, usedCostUsd, requestCount };
    },
    async addBonusCredits(data) {
      const key = `${data.userId}:${data.appSlug}:${data.periodKey}`;
      const existing = periods.get(key);
      if (existing) {
        existing.bonusCredits += data.bonusDelta;
        return existing;
      }
      const created: AiUserCreditPeriodDto = {
        id: key,
        userId: data.userId,
        appSlug: data.appSlug,
        periodKey: data.periodKey,
        planKey: data.planKey ?? "FREE",
        allowanceCredits: data.allowanceCredits ?? 0,
        bonusCredits: data.bonusDelta,
        usedCredits: 0,
        usedCostUsd: 0,
        requestCount: 0,
        promptTokens: 0,
        cachedTokens: 0,
        completionTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      periods.set(key, created);
      return created;
    },
    async recordUserPeriodUsageAndLog(data) {
      await repo.createUsageLog(data);
      const key = `${data.userId}:${data.appSlug}:${data.periodKey}`;
      const existing = periods.get(key);
      if (!existing) {
        const created: AiUserCreditPeriodDto = {
          id: key,
          userId: data.userId,
          appSlug: data.appSlug,
          periodKey: data.periodKey,
          planKey: data.planKey,
          allowanceCredits: data.allowanceCredits,
          bonusCredits: 0,
          usedCredits: data.creditsCharged,
          usedCostUsd: data.costUsd,
          requestCount: 1,
          promptTokens: data.promptTokens,
          cachedTokens: data.cachedTokens,
          completionTokens: data.completionTokens,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        periods.set(key, created);
        return created;
      }
      existing.usedCredits = Number((existing.usedCredits + data.creditsCharged).toFixed(4));
      existing.usedCostUsd = Number((existing.usedCostUsd + data.costUsd).toFixed(6));
      existing.requestCount += 1;
      existing.promptTokens += data.promptTokens;
      existing.cachedTokens += data.cachedTokens;
      existing.completionTokens += data.completionTokens;
      return existing;
    },
    async listUserCreditPeriods(filter) {
      return [...periods.values()].filter(
        (p) =>
          (!filter?.periodKey || p.periodKey === filter.periodKey) &&
          (!filter?.appSlug || p.appSlug === filter.appSlug) &&
          (!filter?.userId || p.userId === filter.userId),
      );
    },
    async countUserCreditPeriods(filter) {
      return (await this.listUserCreditPeriods(filter)).length;
    },
  };

  return { repo, logs, periods };
}

test("Credit pricing enforces Haiku 5.5 100k threshold and $0.002/credit ratio", () => {
  const under100k = calculateCostUsd("anthropic/claude-haiku-5.5", {
    promptTokens: 50_000,
    cachedTokens: 0,
    completionTokens: 4_000,
    totalTokens: 54_000,
  });
  // 50k * $0.10/1M ($0.005) + 4k * $0.50/1M ($0.002) = $0.007 => 3.5 credits
  assert.equal(under100k, 0.007);
  assert.equal(usdToCredits(under100k, 0.002), 3.5);
  assert.equal(usdToCredits(2.0, 0.002), 1000);

  const over100k = calculateCostUsd("anthropic/claude-haiku-5.5", {
    promptTokens: 120_000,
    cachedTokens: 0,
    completionTokens: 2_000,
    totalTokens: 122_000,
  });
  // >100k jumps 5x: 120k * $0.50/1M ($0.06) + 2k * $2.50/1M ($0.005) = $0.065
  assert.equal(over100k, 0.065);
});

test("AiGatewayService falls back from claude-haiku-5.5 to gpt-6-luna, tracks monthly count, and enforces 402 quota", async () => {
  const { repo, logs } = createInMemoryAiRepo();
  const keyManager = new KeyManagerService(repo);
  const queue: ITaskQueue = {
    async enqueue() {},
    registerProcessor() {},
  };

  const mockProvider: ITextProvider = {
    providerName: "openrouter",
    async generateText(req: UnifiedTextRequest): Promise<UnifiedTextResponse> {
      if (req.model === "anthropic/claude-haiku-5.5") {
        const err = new Error("Haiku overloaded") as Error & { statusCode: number };
        err.statusCode = 503;
        throw err;
      }
      return {
        id: "ok-fallback",
        provider: "openrouter",
        model: req.model || "openai/gpt-6-luna",
        content: "fallback answer",
        usage: {
          promptTokens: 100_000,
          cachedTokens: 0,
          completionTokens: 180_000,
          totalTokens: 280_000,
        },
        executionTimeMs: 120,
      };
    },
    async *streamText(req: UnifiedTextRequest): AsyncIterable<TextStreamChunk> {
      if (req.model === "anthropic/claude-haiku-5.5") {
        const err = new Error("Haiku stream 502") as Error & { statusCode: number };
        err.statusCode = 502;
        throw err;
      }
      yield { id: "c1", deltaText: "hi ", isFinished: false };
      yield {
        id: "done",
        deltaText: "",
        isFinished: true,
        finishReason: "stop",
        usage: {
          promptTokens: 10_000,
          cachedTokens: 0,
          completionTokens: 2_000,
          totalTokens: 12_000,
          costUsd: 0.002,
        },
      };
    },
  };

  let isPaidUser = false;
  const service = new AiGatewayService({
    repository: repo,
    keyManager,
    queue,
    textProviders: [mockProvider],
    resolveOAuthToken: async (tok) =>
      tok === "user-token"
        ? { id: "user-1", email: "demo@example.com", name: "Demo" }
        : null,
    checkAppAccess: async () => ({
      hasActiveSubscription: isPaidUser,
      subscription: isPaidUser
        ? { planId: "plan-skillstudio-pro", planName: "Pro" }
        : null,
    }),
  });

  const auth = await service.authenticateClient("Bearer user-token", "127.0.0.1", {
    appSlug: "skill-studio",
  });
  const initialStatus = await service.getUserCreditStatus("user-1", "skill-studio");
  assert.equal(initialStatus.allowanceCredits, 50);
  assert.equal(initialStatus.remainingCredits, 50);

  // First call: Haiku fails 503 -> falls back to gpt-6-luna, consumes 50 credits ($0.10 = 100k*$0.10/1M + 180k*$0.50/1M)
  const res = await service.generateText(
    { messages: [{ role: "user", content: "hello" }] },
    auth,
  );
  assert.equal(res.fallbackUsed, true);
  assert.equal(res.fallbackFrom, "anthropic/claude-haiku-5.5");
  assert.equal(res.model, "openai/gpt-6-luna");
  assert.equal(res.creditsCharged, 50);
  assert.equal(res.remainingCredits, 0);

  // Next call must reject with 402 CREDITS_EXHAUSTED
  await assert.rejects(
    async () => {
      await service.generateText({ messages: [{ role: "user", content: "again" }] }, auth);
    },
    (err: unknown) => err instanceof AiCreditsExhaustedError && err.status === 402,
  );

  // Upgrade to Pro => gets full 1000 monthly credits and SSE streaming works with fallback
  isPaidUser = true;
  const proStatus = await service.getUserCreditStatus("user-1", "skill-studio");
  assert.equal(proStatus.allowanceCredits, 1000);
  assert.equal(proStatus.remainingCredits, 1000);

  const chunks: TextStreamChunk[] = [];
  for await (const ch of service.streamText(
    { messages: [{ role: "user", content: "stream" }], stream: true },
    auth,
  )) {
    chunks.push(ch);
  }
  const terminal = chunks.at(-1);
  assert.equal(terminal?.isFinished, true);
  assert.equal(terminal?.fallbackUsed, true);
  assert.equal(terminal?.creditsCharged, 1); // $0.002 / $0.002 = 1 credit
  assert.equal(terminal?.remainingCredits, 999);

  // Verify monthly period request counter & logs
  const period = await repo.getUserCreditPeriod(
    "user-1",
    "skill-studio",
    currentUtcPeriodKey(),
  );
  assert.equal(period?.requestCount, 2);
  assert.ok(logs.length >= 2);
});

test("sanitizeApiKeySecret strips quotes/Bearer/newlines, same-provider 401 skips fallback, and verifyKey uses 0 tokens", async () => {
  assert.equal(
    sanitizeApiKeySecret('  "Bearer sk-or-v1-abc123\r\n"  '),
    "sk-or-v1-abc123",
  );
  assert.equal(isRetryableFallbackError({ statusCode: 401 }, true), false);
  assert.equal(isRetryableFallbackError({ statusCode: 401 }, false), true);
  assert.equal(isRetryableFallbackError({ statusCode: 402 }, true), false);

  let calledUrl = "";
  let authHeader = "";
  globalThis.fetch = async (url, init) => {
    calledUrl = String(url);
    authHeader = String((init?.headers as Record<string, string>)?.Authorization ?? "");
    return Response.json({
      data: { label: "sk-prod", limit: 10, limit_remaining: 9.5, usage: 0.5, is_free_tier: false },
    });
  };

  const adapter = new OpenAIAdapter("https://openrouter.ai/api/v1", "openrouter");
  const check = await adapter.verifyKey("sk-or-v1-test");
  assert.equal(calledUrl, "https://openrouter.ai/api/v1/auth/key");
  assert.equal(authHeader, "Bearer sk-or-v1-test");
  assert.equal(check.valid, true);
  assert.equal(check.label, "sk-prod");
  assert.equal(check.limitRemaining, 9.5);

  globalThis.fetch = async () =>
    Response.json({
      data: { label: "sk-mgmt", is_management_key: true, is_provisioning_key: true },
    });
  const mgmtCheck = await adapter.verifyKey("sk-or-v1-mgmt");
  assert.equal(mgmtCheck.valid, false);
  assert.equal(mgmtCheck.isProvisioningKey, true);
  assert.match(mgmtCheck.error ?? "", /Provisioning|Management/i);
});

test("OpenRouter omits require_parameters and unrequested temperature to avoid Filter by Parameters 404", async () => {
  const bodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return Response.json({
      id: "chatcmpl-or-params",
      model: "openai/gpt-6-luna",
      choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
    });
  };

  const adapter = new OpenAIAdapter("https://openrouter.ai/api/v1", "openrouter");
  await adapter.generateText(
    {
      model: "openai/gpt-6-luna",
      reasoningEffort: "high",
      maxTokens: 12_288,
      messages: [{ role: "user", content: "hi" }],
    },
    "sk-or-v1-test",
  );

  assert.equal(bodies.length, 1);
  assert.equal("temperature" in bodies[0], false);
  assert.deepEqual(bodies[0].provider, { data_collection: "deny" });
  assert.deepEqual(bodies[0].reasoning, { effort: "high" });
  assert.equal(bodies[0].max_tokens, 12_288);
});
