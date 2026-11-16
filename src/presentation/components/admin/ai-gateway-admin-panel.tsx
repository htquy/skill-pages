"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  Activity,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  Sparkles,
  Bot,
  Image as ImageIcon,
  Volume2,
  Coins,
  Users,
  Search,
  ShieldCheck,
} from "lucide-react";

export interface KeyItem {
  id: string;
  provider: string;
  keySecretMasked: string;
  alias?: string | null;
  status: "ACTIVE" | "RATE_LIMITED" | "SUSPENDED" | "EXPIRED";
  cooldownUntil?: string | null;
  failureCount: number;
  successCount: number;
  weight: number;
  lastUsedAt?: string | null;
  clientId?: string | null;
}

export interface LogItem {
  id: string;
  clientId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  appSlug?: string | null;
  taskId?: string | null;
  taskType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "EMBEDDING";
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
  createdAt: string;
}

export interface CreditPolicyItem {
  id: string;
  appSlug: string;
  planKey: string;
  monthlyCredits: number;
  usdPerCredit: number;
  resetMode: "MONTHLY" | "TRIAL";
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider?: string | null;
  fallbackModel?: string | null;
  allowedModels: string[];
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyAccountUsageItem {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  appSlug: string;
  periodKey: string;
  planKey: string;
  allowanceCredits: number;
  bonusCredits: number;
  usedCredits: number;
  remainingCredits: number;
  usedCostUsd: number;
  requestCount: number;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppOptionItem {
  slug: string;
  label: string;
  plans: Array<{ id: string; name: string }>;
}

interface AiGatewayAdminPanelProps {
  initialKeys: KeyItem[];
  initialLogs: LogItem[];
  totalLogsCount: number;
  initialPolicies: CreditPolicyItem[];
  initialMonthlyAccounts: MonthlyAccountUsageItem[];
  initialPeriodKey: string;
  appOptions: AppOptionItem[];
}

const SUPPORTED_PROVIDERS = [
  { id: "openrouter", name: "OpenRouter (Claude Haiku 5.5, GPT-6 Luna)", defaultModel: "anthropic/claude-haiku-5.5" },
  { id: "openai", name: "OpenAI (GPT-4o, o1, DALL-E, TTS)", defaultModel: "gpt-4o-mini" },
  { id: "gemini", name: "Google Gemini (2.5 Flash, Pro)", defaultModel: "gemini-2.5-flash" },
  { id: "fal-ai", name: "Fal.ai (Flux, SDXL)", defaultModel: "fal-ai/flux/schnell" },
  { id: "luma", name: "Luma Dream Machine (Ray-2 Video)", defaultModel: "ray-2" },
  { id: "anthropic", name: "Anthropic Claude Direct", defaultModel: "anthropic/claude-haiku-5.5" },
  { id: "elevenlabs", name: "ElevenLabs Voice AI", defaultModel: "multilingual_v2" },
  { id: "groq", name: "Groq (Llama 3, Mixtral)", defaultModel: "llama-3.1-70b" },
  { id: "deepseek", name: "DeepSeek (V3, R1)", defaultModel: "deepseek-chat" },
];

export function AiGatewayAdminPanel({
  initialKeys,
  initialLogs,
  totalLogsCount,
  initialPolicies,
  initialMonthlyAccounts,
  initialPeriodKey,
  appOptions,
}: AiGatewayAdminPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"policies" | "usage" | "keys" | "logs" | "tester">("policies");

  // Keys State
  const [keys, setKeys] = useState<KeyItem[]>(initialKeys);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState("openrouter");
  const [newKeySecret, setNewKeySecret] = useState("");
  const [newKeyAlias, setNewKeyAlias] = useState("");
  const [newKeyWeight, setNewKeyWeight] = useState(1);
  const [keySubmitting, setKeySubmitting] = useState(false);

  // Policies State
  const [policies, setPolicies] = useState<CreditPolicyItem[]>(initialPolicies);
  const [polAppSlug, setPolAppSlug] = useState(appOptions[0]?.slug || "skill-studio");
  const [polPlanKey, setPolPlanKey] = useState("plan-skillstudio-pro");
  const [polCredits, setPolCredits] = useState(1000);
  const [polUsdPerCredit, setPolUsdPerCredit] = useState(0.002);
  const [polResetMode, setPolResetMode] = useState<"MONTHLY" | "TRIAL">("MONTHLY");
  const [polPrimaryProvider, setPolPrimaryProvider] = useState("openrouter");
  const [polPrimaryModel, setPolPrimaryModel] = useState("anthropic/claude-haiku-5.5");
  const [polFallbackProvider, setPolFallbackProvider] = useState("openrouter");
  const [polFallbackModel, setPolFallbackModel] = useState("openai/gpt-6-luna");
  const [polAllowedModels, setPolAllowedModels] = useState("anthropic/claude-haiku-5.5, openai/gpt-6-luna");
  const [polDesc, setPolDesc] = useState("");
  const [polSaving, setPolSaving] = useState(false);

  // Monthly Usage State
  const [usagePeriodKey, setUsagePeriodKey] = useState(initialPeriodKey);
  const [usageAppFilter, setUsageAppFilter] = useState("");
  const [usageSearch, setUsageSearch] = useState("");
  const [usageAccounts, setUsageAccounts] = useState<MonthlyAccountUsageItem[]>(initialMonthlyAccounts);
  const [usageLoading, setUsageLoading] = useState(false);
  const [selectedUserLogs, setSelectedUserLogs] = useState<{
    label: string;
    logs: LogItem[];
    loading: boolean;
  } | null>(null);
  const [bonusUserId, setBonusUserId] = useState<string | null>(null);
  const [bonusAppSlug, setBonusAppSlug] = useState<string>("skill-studio");
  const [bonusAmount, setBonusAmount] = useState<number>(50);

  // Logs State
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);

  // Playground / Tester State
  const [testTaskType, setTestTaskType] = useState<"TEXT" | "IMAGE" | "AUDIO">("TEXT");
  const [testProvider, setTestProvider] = useState("openrouter");
  const [testModel, setTestModel] = useState("anthropic/claude-haiku-5.5");
  const [testPrompt, setTestPrompt] = useState("Chào bạn! Hãy giới thiệu ngắn gọn về bản thân.");
  const [testCustomKey, setTestCustomKey] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    kind: string;
    result?: unknown;
    error?: string;
  } | null>(null);

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    setPolSaving(true);
    try {
      const allowedModels = polAllowedModels
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/ai/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appSlug: polAppSlug.trim(),
          planKey: polPlanKey.trim(),
          monthlyCredits: Number(polCredits),
          usdPerCredit: Number(polUsdPerCredit),
          resetMode: polResetMode,
          primaryProvider: polPrimaryProvider,
          primaryModel: polPrimaryModel.trim(),
          fallbackProvider: polFallbackProvider || null,
          fallbackModel: polFallbackModel.trim() || null,
          allowedModels,
          isActive: true,
          description: polDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu cấu hình");

      const listRes = await fetch("/api/admin/ai/policies");
      if (listRes.ok) {
        const refreshed = await listRes.json();
        setPolicies(refreshed.policies || []);
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi lưu chính sách");
    } finally {
      setPolSaving(false);
    }
  }

  function loadPolicyIntoForm(p: CreditPolicyItem) {
    setPolAppSlug(p.appSlug);
    setPolPlanKey(p.planKey);
    setPolCredits(p.monthlyCredits);
    setPolUsdPerCredit(p.usdPerCredit);
    setPolResetMode(p.resetMode);
    setPolPrimaryProvider(p.primaryProvider);
    setPolPrimaryModel(p.primaryModel);
    setPolFallbackProvider(p.fallbackProvider || "openrouter");
    setPolFallbackModel(p.fallbackModel || "");
    setPolAllowedModels(p.allowedModels.join(", "));
    setPolDesc(p.description || "");
  }

  async function handleDeletePolicy(id: string) {
    if (!confirm("Xóa cấu hình hạn mức credit này?")) return;
    const res = await fetch(`/api/admin/ai/policies/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function handleSearchMonthlyUsage(e?: React.FormEvent) {
    e?.preventDefault();
    setUsageLoading(true);
    try {
      const qs = new URLSearchParams();
      if (usagePeriodKey) qs.set("periodKey", usagePeriodKey);
      if (usageAppFilter) qs.set("appSlug", usageAppFilter);
      if (usageSearch.trim()) qs.set("q", usageSearch.trim());
      const res = await fetch(`/api/admin/ai/usage?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được dữ liệu tháng");
      setUsageAccounts(data.accounts || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi truy vấn usage");
    } finally {
      setUsageLoading(false);
    }
  }

  async function handleInspectUserLogs(account: MonthlyAccountUsageItem) {
    const label = `${account.userEmail || account.userId} (${account.periodKey} · ${account.appSlug})`;
    setSelectedUserLogs({ label, logs: [], loading: true });
    try {
      const qs = new URLSearchParams({
        userId: account.userId,
        appSlug: account.appSlug,
        periodKey: account.periodKey,
        limit: "100",
      });
      const res = await fetch(`/api/admin/ai/logs?${qs.toString()}`);
      const data = await res.json();
      setSelectedUserLogs({ label, logs: data.logs || [], loading: false });
    } catch {
      setSelectedUserLogs({ label, logs: [], loading: false });
    }
  }

  async function handleGrantBonus(e: React.FormEvent) {
    e.preventDefault();
    if (!bonusUserId) return;
    try {
      const res = await fetch("/api/admin/ai/usage/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: bonusUserId,
          appSlug: bonusAppSlug,
          periodKey: usagePeriodKey,
          bonusDelta: Number(bonusAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cộng credit");
      setBonusUserId(null);
      await handleSearchMonthlyUsage();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi cập nhật bonus credit");
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeySecret.trim()) return;

    setKeySubmitting(true);
    try {
      const res = await fetch("/api/admin/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newKeyProvider,
          keySecret: newKeySecret,
          alias: newKeyAlias || undefined,
          weight: Number(newKeyWeight) || 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể tạo key");
      }

      setNewKeySecret("");
      setNewKeyAlias("");
      setIsAddingKey(false);
      router.refresh();
      const updatedKeysRes = await fetch("/api/admin/ai/keys");
      if (updatedKeysRes.ok) setKeys(await updatedKeysRes.json());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo key");
    } finally {
      setKeySubmitting(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa API Key này không?")) return;
    try {
      const res = await fetch(`/api/admin/ai/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        alert("Không thể xóa key.");
      }
    } catch {
      alert("Lỗi kết nối khi xóa key.");
    }
  }

  async function handleToggleStatus(key: KeyItem) {
    const newStatus = key.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/ai/keys/${key.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          resetCooldown: true,
        }),
      });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((k) =>
            k.id === key.id ? { ...k, status: newStatus, cooldownUntil: null } : k,
          ),
        );
      }
    } catch {
      alert("Không thể cập nhật trạng thái.");
    }
  }

  async function handleReloadLogs() {
    const res = await fetch("/api/admin/ai/logs?limit=50");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
    }
  }

  async function handleVerifyKeyQuotaFree() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "VERIFY_KEY",
          provider: testProvider,
          customKey: testCustomKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ kind: "VERIFY_KEY", error: data.error || "Kiểm tra key thất bại" });
      } else {
        setTestResult(data);
      }
    } catch (err) {
      setTestResult({
        kind: "VERIFY_KEY",
        error: err instanceof Error ? err.message : "Lỗi kết nối khi kiểm tra key",
      });
    } finally {
      setTestLoading(false);
    }
  }

  async function handleRunTest() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: testTaskType,
          provider: testProvider,
          model: testModel || undefined,
          prompt: testPrompt,
          customKey: testCustomKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTestResult({ kind: testTaskType, error: data.error || "Thử nghiệm thất bại" });
      } else {
        setTestResult(data);
        await handleReloadLogs();
      }
    } catch (err) {
      setTestResult({
        kind: testTaskType,
        error: err instanceof Error ? err.message : "Lỗi kết nối khi test",
      });
    } finally {
      setTestLoading(false);
    }
  }

  const totalKeys = keys.length;
  const activeKeys = keys.filter((k) => k.status === "ACTIVE").length;
  const monthRequests = usageAccounts.reduce((s, a) => s + a.requestCount, 0);
  const monthCreditsUsed = usageAccounts.reduce((s, a) => s + a.usedCredits, 0);
  const monthCostUsd = usageAccounts.reduce((s, a) => s + a.usedCostUsd, 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">API Keys (Active / Total)</span>
            <Key className="size-5 text-brand-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{activeKeys}</span>
            <span className="text-xs text-zinc-500">/ {totalKeys} keys trong kho</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Request tháng ({usagePeriodKey})</span>
            <Users className="size-5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{monthRequests}</span>
            <span className="text-xs text-zinc-500">{usageAccounts.length} tài khoản hoạt động</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Credit đã tiêu thụ ({usagePeriodKey})</span>
            <Coins className="size-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{monthCreditsUsed.toFixed(2)}</span>
            <span className="text-xs text-zinc-500">≈ ${monthCostUsd.toFixed(4)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Tổng Nhật Ký Gateway</span>
            <Activity className="size-5 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{totalLogsCount}</span>
            <span className="text-xs text-zinc-500">lượt gọi mọi thời điểm</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("policies")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "policies"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <ShieldCheck className="size-4" />
          Hạn mức Credit theo App/Tool ({policies.length})
        </button>

        <button
          onClick={() => setActiveTab("usage")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "usage"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Users className="size-4" />
          Đối soát Tài khoản theo Tháng ({usageAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab("keys")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "keys"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Key className="size-4" />
          Kho API Keys ({keys.length})
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "logs"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Activity className="size-4" />
          Nhật ký Request & Chi phí ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab("tester")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "tester"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Play className="size-4" />
          Playground & API Tester
        </button>
      </div>

      {/* TAB 0: Hạn mức Credit theo từng App / Tool */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSavePolicy}
            className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Cấu hình Credit mặc định & Model ưu tiên / fallback theo công cụ
                </h2>
                <p className="text-xs text-zinc-500">
                  Ví dụ SkillStudio: Gói Pro = 1000 credit/tháng ($0.002/credit = $2.00), Gói Free đăng nhập = 50 credit ($0.10). Khi Anthropic Haiku lỗi tự chuyển sang OpenAI GPT-6 Luna.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPolAppSlug("skill-studio");
                    setPolPlanKey("FREE");
                    setPolCredits(50);
                    setPolUsdPerCredit(0.002);
                    setPolResetMode("TRIAL");
                    setPolPrimaryProvider("openrouter");
                    setPolPrimaryModel("anthropic/claude-haiku-5.5");
                    setPolFallbackProvider("openrouter");
                    setPolFallbackModel("openai/gpt-6-luna");
                    setPolAllowedModels("anthropic/claude-haiku-5.5, openai/gpt-6-luna");
                    setPolDesc("Dùng thử khi đăng nhập tài khoản SkillStudio");
                  }}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Mẫu Free (50)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPolAppSlug("skill-studio");
                    setPolPlanKey("plan-skillstudio-pro");
                    setPolCredits(1000);
                    setPolUsdPerCredit(0.002);
                    setPolResetMode("MONTHLY");
                    setPolPrimaryProvider("openrouter");
                    setPolPrimaryModel("anthropic/claude-haiku-5.5");
                    setPolFallbackProvider("openrouter");
                    setPolFallbackModel("openai/gpt-6-luna");
                    setPolAllowedModels("anthropic/claude-haiku-5.5, openai/gpt-6-luna");
                    setPolDesc("SkillStudio Pro 1000 credit/tháng (= $2.00)");
                  }}
                  className="rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  Mẫu Pro (1000)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Công cụ / App Slug</label>
                <input
                  list="credit-app-slugs"
                  value={polAppSlug}
                  onChange={(e) => setPolAppSlug(e.target.value)}
                  required
                  placeholder="skill-studio"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                />
                <datalist id="credit-app-slugs">
                  {appOptions.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.label}
                    </option>
                  ))}
                  <option value="*">Mặc định toàn hệ thống (*)</option>
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">Gói (Plan Key)</label>
                <input
                  list="credit-plan-keys"
                  value={polPlanKey}
                  onChange={(e) => setPolPlanKey(e.target.value)}
                  required
                  placeholder="FREE / plan-skillstudio-pro / PRO"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                />
                <datalist id="credit-plan-keys">
                  <option value="FREE">FREE (Tài khoản đăng nhập dùng thử)</option>
                  <option value="PRO">PRO (Mặc định các gói trả phí)</option>
                  {appOptions
                    .find((a) => a.slug === polAppSlug)
                    ?.plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} ({pl.id})
                      </option>
                    ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Số Credit cấp ({(Number(polCredits || 0) * Number(polUsdPerCredit || 0)).toFixed(2)} USD)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={polCredits}
                  onChange={(e) => setPolCredits(Number(e.target.value))}
                  required
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">Chu kỳ / Giá trị 1 Credit (USD)</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <select
                    value={polResetMode}
                    onChange={(e) => setPolResetMode(e.target.value as "MONTHLY" | "TRIAL")}
                    className="rounded-lg border border-zinc-300 bg-surface px-2 py-2 text-xs text-zinc-900 outline-none focus:border-brand-500"
                  >
                    <option value="MONTHLY">Hàng tháng</option>
                    <option value="TRIAL">Dùng thử 1 lần</option>
                  </select>
                  <input
                    type="number"
                    step="0.0005"
                    min="0.0001"
                    value={polUsdPerCredit}
                    onChange={(e) => setPolUsdPerCredit(Number(e.target.value))}
                    className="rounded-lg border border-zinc-300 bg-surface px-2 py-2 text-xs text-zinc-900 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">Model Ưu Tiên (Primary)</label>
                <input
                  value={polPrimaryModel}
                  onChange={(e) => setPolPrimaryModel(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm font-mono text-zinc-900 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">Model Dự Phòng (Fallback)</label>
                <input
                  value={polFallbackModel}
                  onChange={(e) => setPolFallbackModel(e.target.value)}
                  placeholder="openai/gpt-6-luna"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm font-mono text-zinc-900 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">Allowed Models (dấu phẩy)</label>
                <input
                  value={polAllowedModels}
                  onChange={(e) => setPolAllowedModels(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-xs font-mono text-zinc-900 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">Ghi chú</label>
                <input
                  value={polDesc}
                  onChange={(e) => setPolDesc(e.target.value)}
                  placeholder="VD: Gói Pro 1000 credit/tháng"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={polSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {polSaving ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Lưu / Cập nhật Chính sách Credit
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-xs">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 font-medium text-zinc-600">
                <tr>
                  <th className="px-4 py-3">App / Công cụ</th>
                  <th className="px-4 py-3">Gói (Plan Key)</th>
                  <th className="px-4 py-3">Hạn mức Credit (USD)</th>
                  <th className="px-4 py-3">Chu kỳ</th>
                  <th className="px-4 py-3">Ưu tiên -&gt; Dự phòng</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{p.appSlug}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-800">
                        {p.planKey}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <strong className="text-zinc-900">{p.monthlyCredits} credit</strong>
                      <span className="ml-1.5 text-xs text-zinc-500">
                        (${(p.monthlyCredits * p.usdPerCredit).toFixed(2)})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          p.resetMode === "TRIAL"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {p.resetMode === "TRIAL" ? "Dùng thử 1 lần" : "Reset hàng tháng"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-700">
                      <div>{p.primaryModel}</div>
                      {p.fallbackModel && (
                        <div className="text-zinc-400">↳ {p.fallbackModel}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => loadPolicyIntoForm(p)}
                        className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePolicy(p.id)}
                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      Chưa có policy lưu trong DB (hệ thống đang áp dụng mặc định code: Free = 50, Pro = 1000). Nhấn &quot;Mẫu Free&quot; / &quot;Mẫu Pro&quot; ở trên để lưu vào DB.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: Đối soát Request & Credit từng Tài khoản theo Tháng */}
      {activeTab === "usage" && (
        <div className="space-y-4">
          <form
            onSubmit={handleSearchMonthlyUsage}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-surface p-4 shadow-xs"
          >
            <div>
              <label className="block text-xs font-medium text-zinc-700">Tháng đối soát (UTC)</label>
              <input
                type="month"
                value={usagePeriodKey}
                onChange={(e) => setUsagePeriodKey(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-300 bg-surface px-3 py-1.5 text-sm text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700">Công cụ (App Slug)</label>
              <select
                value={usageAppFilter}
                onChange={(e) => setUsageAppFilter(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-300 bg-surface px-3 py-1.5 text-sm text-zinc-900"
              >
                <option value="">Tất cả công cụ</option>
                {appOptions.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-60 flex-1">
              <label className="block text-xs font-medium text-zinc-700">Tìm tài khoản (Email / Tên / User ID)</label>
              <input
                type="text"
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
                placeholder="VD: hoang@gmail.com..."
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-surface px-3 py-1.5 text-sm text-zinc-900"
              />
            </div>

            <button
              type="submit"
              disabled={usageLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {usageLoading ? <RefreshCw className="size-4 animate-spin" /> : <Search className="size-4" />}
              Tra cứu tháng
            </button>
          </form>

          {bonusUserId && (
            <form
              onSubmit={handleGrantBonus}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
            >
              <div className="text-xs text-zinc-700">
                Cộng/trừ Bonus Credit cho User <strong className="font-mono">{bonusUserId}</strong> ({bonusAppSlug} · {usagePeriodKey}):
              </div>
              <input
                type="number"
                step="1"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(Number(e.target.value))}
                className="w-28 rounded-lg border border-zinc-300 bg-surface px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => setBonusUserId(null)}
                className="rounded-lg border border-zinc-300 bg-surface px-3 py-1.5 text-xs text-zinc-700"
              >
                Hủy
              </button>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-xs">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 font-medium text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Công cụ / Gói</th>
                  <th className="px-4 py-3">Số Request tháng</th>
                  <th className="px-4 py-3">Tokens (In / Cache / Out)</th>
                  <th className="px-4 py-3">Đã dùng / Còn lại</th>
                  <th className="px-4 py-3">Chi phí gốc</th>
                  <th className="px-4 py-3 text-right">Xác minh / Tặng thêm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {usageAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{acc.userName || acc.userEmail || acc.userId}</div>
                      <div className="text-xs text-zinc-500">{acc.userEmail || acc.userId}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-zinc-800">{acc.appSlug}</div>
                      <div className="font-mono text-zinc-500">{acc.planKey}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      {acc.requestCount.toLocaleString("en-US")} req
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      <div>In: {acc.promptTokens.toLocaleString("en-US")}</div>
                      <div className="text-zinc-400">
                        Cache: {acc.cachedTokens.toLocaleString("en-US")} · Out: {acc.completionTokens.toLocaleString("en-US")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-zinc-900">
                        {acc.usedCredits.toFixed(2)} / {(acc.allowanceCredits + acc.bonusCredits).toFixed(0)} cr
                      </div>
                      <div className="text-emerald-700">Còn {acc.remainingCredits.toFixed(2)} cr</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                      ${acc.usedCostUsd.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleInspectUserLogs(acc)}
                        className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Xem {acc.requestCount} req
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBonusUserId(acc.userId);
                          setBonusAppSlug(acc.appSlug);
                        }}
                        className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                      >
                        + Bonus
                      </button>
                    </td>
                  </tr>
                ))}
                {usageAccounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      Không có tài khoản nào phát sinh request trong tháng {usagePeriodKey}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedUserLogs && (
            <div className="rounded-xl border border-brand-200 bg-surface p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Chi tiết request xác minh: {selectedUserLogs.label}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedUserLogs(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Đóng
                </button>
              </div>
              {selectedUserLogs.loading ? (
                <div className="py-6 text-center text-xs text-zinc-500">Đang tải danh sách request...</div>
              ) : (
                <div className="max-h-80 overflow-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="px-3 py-2">Thời gian</th>
                        <th className="px-3 py-2">Model</th>
                        <th className="px-3 py-2">Tokens</th>
                        <th className="px-3 py-2">USD / Credit</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {selectedUserLogs.logs.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2 text-zinc-500">
                            {new Date(l.createdAt).toLocaleString("vi-VN")}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {l.model}
                            {l.fallbackUsed && (
                              <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">
                                fallback from {l.fallbackFrom}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {l.promptTokens} in ({l.cachedTokens || 0} cache) + {l.completionTokens} out
                          </td>
                          <td className="px-3 py-2 font-mono">
                            ${(l.costUsd || 0).toFixed(5)} · {(l.creditsCharged || 0).toFixed(3)} cr
                          </td>
                          <td className="px-3 py-2">{l.statusCode}</td>
                        </tr>
                      ))}
                      {selectedUserLogs.logs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                            Chưa có log chi tiết trong tháng này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Quản lý Keys & Models */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Danh sách API Keys điều phối</h2>
            <button
              onClick={() => setIsAddingKey(!isAddingKey)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <Plus className="size-4" />
              Thêm Key / Model Mới
            </button>
          </div>

          {isAddingKey && (
            <form
              onSubmit={handleCreateKey}
              className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 shadow-xs"
            >
              <h3 className="text-sm font-semibold text-zinc-900">Khai báo API Key mới</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Nhà cung cấp (Provider)</label>
                  <select
                    value={newKeyProvider}
                    onChange={(e) => setNewKeyProvider(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                  >
                    {SUPPORTED_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700">API Key bí mật (Secret Key)</label>
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    required
                    value={newKeySecret}
                    onChange={(e) => setNewKeySecret(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700">Nhãn gợi nhớ (Alias)</label>
                  <input
                    type="text"
                    placeholder="VD: OpenRouter Primary"
                    value={newKeyAlias}
                    onChange={(e) => setNewKeyAlias(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700">Trọng số tải (Weight: 1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newKeyWeight}
                    onChange={(e) => setNewKeyWeight(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingKey(false)}
                  className="rounded-lg border border-zinc-300 bg-surface px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={keySubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {keySubmitting ? <RefreshCw className="size-4 animate-spin" /> : null}
                  Lưu Key
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-xs">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 font-medium text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Nhà cung cấp</th>
                  <th className="px-4 py-3">Nhãn / Key Secret</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thành công / Thất bại</th>
                  <th className="px-4 py-3">Trọng số</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <span className="font-semibold uppercase tracking-wider text-brand-700">
                        {k.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{k.alias || "Không có nhãn"}</div>
                      <div className="font-mono text-xs text-zinc-400">{k.keySecretMasked}</div>
                    </td>
                    <td className="px-4 py-3">
                      {k.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="size-3" /> ACTIVE
                        </span>
                      )}
                      {k.status === "RATE_LIMITED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          <Clock className="size-3" /> RATE LIMITED
                        </span>
                      )}
                      {k.status === "SUSPENDED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                          SUSPENDED
                        </span>
                      )}
                      {k.status === "EXPIRED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <AlertCircle className="size-3" /> EXPIRED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-emerald-600 font-semibold">{k.successCount} ok</span>
                      {" / "}
                      <span className="text-red-500 font-semibold">{k.failureCount} fail</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{k.weight}x</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(k)}
                        title={k.status === "ACTIVE" ? "Tạm ngưng key" : "Kích hoạt lại key"}
                        className="inline-flex items-center rounded-md border border-zinc-200 bg-surface p-1.5 text-zinc-600 hover:bg-zinc-50"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(k.id)}
                        title="Xóa key"
                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      Chưa có API Key nào được cấu hình trong Database (có thể dùng OPENROUTER_API_KEY từ .env hoặc thêm key OpenRouter tại đây).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Nhật ký Hoạt động (Logs) */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">
              Nhật ký gọi Gateway, Token & Chi phí
            </h2>
            <button
              type="button"
              onClick={handleReloadLogs}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw className="size-3.5" /> Làm mới
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-xs">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 font-medium text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Tài khoản / App</th>
                  <th className="px-4 py-3">Provider / Model</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">USD / Credits</th>
                  <th className="px-4 py-3">HTTP / Latency</th>
                  <th className="px-4 py-3">Lỗi / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-zinc-900">{log.userEmail || log.userId || log.clientId || "system"}</div>
                      <div className="text-zinc-500">{log.appSlug || log.taskType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{log.provider}</div>
                      <div className="text-xs text-zinc-500">
                        {log.model}
                        {log.fallbackUsed && (
                          <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">
                            fallback
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.totalTokens > 0 ? (
                        <span>
                          <strong className="text-zinc-900">{log.totalTokens}</strong>
                          <span className="text-zinc-400">
                            {" "}
                            ({log.promptTokens}+{log.completionTokens}
                            {log.cachedTokens ? `, ${log.cachedTokens}c` : ""})
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-700 whitespace-nowrap">
                      <div>${(log.costUsd || 0).toFixed(5)}</div>
                      <div className="text-zinc-400">{(log.creditsCharged || 0).toFixed(3)} cr</div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                          log.statusCode === 200
                            ? "bg-emerald-50 text-emerald-700"
                            : log.statusCode === 429
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.statusCode}
                      </span>
                      <span className="ml-2 font-mono text-zinc-500">{log.latencyMs}ms</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate text-zinc-500">
                      {log.errorMessage ? (
                        <span className="text-red-500" title={log.errorMessage}>
                          {log.errorMessage}
                        </span>
                      ) : (
                        log.ipAddress || "-"
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      Chưa có nhật ký request nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Playground / Tester */}
      {activeTab === "tester" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold">
              <Sliders className="size-4 text-brand-600" />
              <span>Cấu hình Thử nghiệm API</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Loại tác vụ AI</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "TEXT", label: "Text LLM", icon: Bot },
                  { id: "IMAGE", label: "Image Gen", icon: ImageIcon },
                  { id: "AUDIO", label: "Audio / TTS", icon: Volume2 },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTestTaskType(item.id as "TEXT" | "IMAGE" | "AUDIO");
                      if (item.id === "TEXT") {
                        setTestProvider("openrouter");
                        setTestModel("anthropic/claude-haiku-5.5");
                      } else if (item.id === "IMAGE") {
                        setTestProvider("fal-ai");
                        setTestModel("fal-ai/flux/schnell");
                      } else {
                        setTestProvider("openai-tts");
                        setTestModel("tts-1");
                      }
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-colors ${
                      testTaskType === item.id
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-zinc-200 bg-surface text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Provider</label>
                <select
                  value={testProvider}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTestProvider(v);
                    if (v === "openrouter") setTestModel("anthropic/claude-haiku-5.5");
                    else if (v === "openai") setTestModel("gpt-4o-mini");
                    else if (v === "gemini") setTestModel("gemini-2.0-flash");
                  }}
                  className="w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                >
                  {testTaskType === "TEXT" && (
                    <>
                      <option value="openrouter">OpenRouter (Haiku 5.5 / GPT-6 Luna)</option>
                      <option value="openai">OpenAI Direct</option>
                      <option value="gemini">Google Gemini</option>
                    </>
                  )}
                  {testTaskType === "IMAGE" && <option value="fal-ai">Fal.ai Flux</option>}
                  {testTaskType === "AUDIO" && <option value="openai-tts">OpenAI TTS</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Model Name</label>
                <input
                  type="text"
                  value={testModel}
                  onChange={(e) => setTestModel(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Custom API Key (Tùy chọn - BYOK)
              </label>
              <input
                type="password"
                placeholder="Để trống nếu muốn dùng key có sẵn trong hệ thống"
                value={testCustomKey}
                onChange={(e) => setTestCustomKey(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Prompt / Nội dung yêu cầu
              </label>
              <textarea
                rows={4}
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-surface p-3 text-sm text-zinc-900 outline-none focus:border-brand-500"
                placeholder="Nhập nội dung cần AI xử lý..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleVerifyKeyQuotaFree}
                disabled={testLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-surface px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                <ShieldCheck className="size-4 text-emerald-600" />
                Kiểm tra Key (0 token)
              </button>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testLoading || !testPrompt.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {testLoading ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {testLoading ? "Đang gọi AI Gateway..." : "Test sinh text (tối đa 128 token)"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-900 font-semibold pb-3 border-b border-zinc-100">
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                Kết quả Thực thi Trực tiếp
              </span>
              {Boolean(testResult?.result) && (
                <span className="text-xs font-normal text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Thành công
                </span>
              )}
            </div>

            <div className="mt-4 flex-1 overflow-auto rounded-lg bg-ink p-4 font-mono text-xs text-zinc-800">
              {testLoading && (
                <div className="flex h-full items-center justify-center text-zinc-400 gap-2">
                  <RefreshCw className="size-4 animate-spin text-brand-400" />
                  Đang gửi request qua Gateway và chờ phản hồi...
                </div>
              )}

              {!testLoading && !testResult && (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  Nhấn &quot;Thực thi Test API&quot; để xem phản hồi thực tế từ Gateway.
                </div>
              )}

              {!testLoading && Boolean(testResult?.error) && (
                <div className="text-red-400 space-y-2">
                  <div className="font-bold">❌ Lỗi thực thi:</div>
                  <pre className="whitespace-pre-wrap">{testResult?.error}</pre>
                </div>
              )}

              {!testLoading && testResult && testResult.result ? (
                <div className="space-y-4">
                  {testResult.kind === "TEXT" && (
                    <div>
                      <div className="text-zinc-400 text-xs mb-1">[AI RESPONSE CONTENT]</div>
                      <div className="text-emerald-400 whitespace-pre-wrap bg-ink p-3 rounded-md">
                        {String((testResult.result as { content?: string }).content ?? "")}
                      </div>
                    </div>
                  )}

                  {testResult.kind === "AUDIO" && (
                    <div className="space-y-3">
                      <div className="text-zinc-400 text-xs">[AUDIO STREAM PREVIEW]</div>
                      {(testResult.result as { audioUrl?: string }).audioUrl ? (
                        <audio
                          controls
                          className="w-full mt-2"
                          src={(testResult.result as { audioUrl?: string }).audioUrl}
                        />
                      ) : null}
                    </div>
                  )}

                  {testResult.kind === "IMAGE" && (
                    <div className="space-y-2">
                      <div className="text-zinc-400 text-xs">[IMAGE TASK QUEUE ACCEPTED]</div>
                      <pre className="text-brand-300">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="text-zinc-500 text-[11px] mb-1">[RAW RESPONSE DETAILS]</div>
                    <pre className="text-zinc-300 text-[11px] overflow-x-auto">
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
