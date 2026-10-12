export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { keyManagerService, aiRepository } from "@/src/infrastructure/composition";
import {
  AiGatewayAdminPanel,
  KeyItem,
  LogItem,
} from "@/src/presentation/components/admin/ai-gateway-admin-panel";

export default async function AdminAiGatewayPage() {
  await requireAdmin();

  // 1. Tải danh sách keys
  const rawKeys = await keyManagerService.listKeys();
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

  // 2. Tải 50 logs gần nhất và tổng số lượng
  const [rawLogs, totalLogsCount] = await Promise.all([
    aiRepository.getUsageLogs(50, 0),
    aiRepository.countUsageLogs(),
  ]);

  const initialLogs: LogItem[] = rawLogs.map((l) => ({
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
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <Container className="py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Quản trị AI Gateway & Models
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Điều phối API Keys, giám sát tải Token/Latency và thử nghiệm các mô hình AI trực tiếp.
            </p>
          </div>
        </div>
      </header>

      <AiGatewayAdminPanel
        initialKeys={initialKeys}
        initialLogs={initialLogs}
        totalLogsCount={totalLogsCount}
      />
    </Container>
  );
}
