export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import {
  aiRepository,
  appsService,
  keyManagerService,
  toolQueries,
  userRepository,
} from "@/src/infrastructure/composition";
import { currentUtcPeriodKey } from "@/src/application/ai/credit-pricing";
import {
  AiGatewayAdminPanel,
  AppOptionItem,
  CreditPolicyItem,
  KeyItem,
  LogItem,
  MonthlyAccountUsageItem,
} from "@/src/presentation/components/admin/ai-gateway-admin-panel";

export default async function AdminAiGatewayPage() {
  await requireAdmin();

  const periodKey = currentUtcPeriodKey();

  const [rawKeys, rawLogs, totalLogsCount, rawPolicies, rawPeriods, activeApps, toolsPage] =
    await Promise.all([
      keyManagerService.listKeys(),
      aiRepository.getUsageLogs(50, 0),
      aiRepository.countUsageLogs(),
      aiRepository.listCreditPolicies(),
      aiRepository.listUserCreditPeriods({ periodKey, limit: 50, offset: 0 }),
      appsService.listActiveApps(),
      toolQueries.list({}, { page: 1, pageSize: 100 }),
    ]);

  const userIds = [
    ...new Set([
      ...rawLogs.map((l) => l.userId || "").filter(Boolean),
      ...rawPeriods.map((p) => p.userId),
    ]),
  ];
  const userMap = new Map<string, { email: string | null; name: string | null }>();
  await Promise.all(
    userIds.map(async (id) => {
      const u = await userRepository.findById(id);
      if (u) userMap.set(id, { email: u.email, name: u.name });
    }),
  );

  const initialKeys: KeyItem[] = rawKeys.map((k) => ({
    id: k.id,
    provider: k.provider,
    keySecretMasked:
      k.keySecret.length > 10
        ? `${k.keySecret.slice(0, 4)}••••••••${k.keySecret.slice(-4)}`
        : "••••••••",
    alias: k.alias,
    status: k.status,
    cooldownUntil: k.cooldownUntil ? k.cooldownUntil.toISOString() : null,
    failureCount: k.failureCount,
    successCount: k.successCount,
    weight: k.weight,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    clientId: k.clientId,
  }));

  const initialLogs: LogItem[] = rawLogs.map((l) => ({
    id: l.id,
    clientId: l.clientId,
    userId: l.userId ?? null,
    userEmail: l.userId ? userMap.get(l.userId)?.email ?? null : null,
    appSlug: l.appSlug ?? null,
    taskId: l.taskId,
    taskType: l.taskType,
    provider: l.provider,
    model: l.model,
    promptTokens: l.promptTokens,
    cachedTokens: l.cachedTokens,
    completionTokens: l.completionTokens,
    totalTokens: l.totalTokens,
    costUsd: l.costUsd,
    creditsCharged: l.creditsCharged,
    fallbackUsed: l.fallbackUsed,
    fallbackFrom: l.fallbackFrom ?? null,
    latencyMs: l.latencyMs,
    statusCode: l.statusCode,
    errorMessage: l.errorMessage,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
  }));

  const initialPolicies: CreditPolicyItem[] = rawPolicies.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const initialMonthlyAccounts: MonthlyAccountUsageItem[] = rawPeriods.map((p) => {
    const u = userMap.get(p.userId);
    return {
      ...p,
      userEmail: u?.email ?? null,
      userName: u?.name ?? null,
      remainingCredits: Math.max(
        0,
        Number((p.allowanceCredits + p.bonusCredits - p.usedCredits).toFixed(4)),
      ),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  const appOptions: AppOptionItem[] = [
    ...activeApps.map((a) => ({
      slug: a.slug,
      label: `${a.name} (${a.slug})`,
      plans: a.plans.map((p) => ({ id: p.id, name: p.name })),
    })),
    ...toolsPage.items
      .filter((t) => !activeApps.some((a) => a.slug === (t.appSlug ?? t.slug)))
      .map((t) => ({
        slug: t.appSlug ?? t.slug,
        label: `${t.title} (${t.appSlug ?? t.slug})`,
        plans: [],
      })),
  ];

  return (
    <Container className="py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Quản trị AI Gateway, Hạn mức Credit & Đối soát Tháng
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Điều phối OpenRouter / Provider Keys, cấu hình hạn mức credit cho từng công cụ (Free & Pro), theo dõi số request/tháng theo từng tài khoản.
            </p>
          </div>
        </div>
      </header>

      <AiGatewayAdminPanel
        initialKeys={initialKeys}
        initialLogs={initialLogs}
        totalLogsCount={totalLogsCount}
        initialPolicies={initialPolicies}
        initialMonthlyAccounts={initialMonthlyAccounts}
        initialPeriodKey={periodKey}
        appOptions={appOptions}
      />
    </Container>
  );
}
