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
  taskId?: string | null;
  taskType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "EMBEDDING";
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  errorMessage?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface AiGatewayAdminPanelProps {
  initialKeys: KeyItem[];
  initialLogs: LogItem[];
  totalLogsCount: number;
}

const SUPPORTED_PROVIDERS = [
  { id: "openai", name: "OpenAI (GPT-4o, o1, DALL-E, TTS)", defaultModel: "gpt-4o-mini" },
  { id: "gemini", name: "Google Gemini (2.5 Flash, Pro)", defaultModel: "gemini-2.5-flash" },
  { id: "fal-ai", name: "Fal.ai (Flux, SDXL)", defaultModel: "fal-ai/flux/schnell" },
  { id: "luma", name: "Luma Dream Machine (Ray-2 Video)", defaultModel: "ray-2" },
  { id: "anthropic", name: "Anthropic Claude (3.5 Sonnet)", defaultModel: "claude-3-5-sonnet" },
  { id: "elevenlabs", name: "ElevenLabs Voice AI", defaultModel: "multilingual_v2" },
  { id: "groq", name: "Groq (Llama 3, Mixtral)", defaultModel: "llama-3.1-70b" },
  { id: "deepseek", name: "DeepSeek (V3, R1)", defaultModel: "deepseek-chat" },
];

export function AiGatewayAdminPanel({
  initialKeys,
  initialLogs,
  totalLogsCount,
}: AiGatewayAdminPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"keys" | "logs" | "tester">("keys");

  // Keys State
  const [keys, setKeys] = useState<KeyItem[]>(initialKeys);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState("openai");
  const [newKeySecret, setNewKeySecret] = useState("");
  const [newKeyAlias, setNewKeyAlias] = useState("");
  const [newKeyWeight, setNewKeyWeight] = useState(1);
  const [keySubmitting, setKeySubmitting] = useState(false);

  // Logs State
  const [logs] = useState<LogItem[]>(initialLogs);

  // Playground / Tester State
  const [testTaskType, setTestTaskType] = useState<"TEXT" | "IMAGE" | "AUDIO">("TEXT");
  const [testProvider, setTestProvider] = useState("openai");
  const [testModel, setTestModel] = useState("gpt-4o-mini");
  const [testPrompt, setTestPrompt] = useState("Chào bạn! Hãy giới thiệu ngắn gọn về bản thân.");
  const [testCustomKey, setTestCustomKey] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    kind: string;
    result?: unknown;
    error?: string;
  } | null>(null);

  // 1. Thêm API Key mới
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
      // Reload keys
      const updatedKeysRes = await fetch("/api/admin/ai/keys");
      if (updatedKeysRes.ok) setKeys(await updatedKeysRes.json());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo key");
    } finally {
      setKeySubmitting(false);
    }
  }

  // 2. Xóa Key
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

  // 3. Reset Cooldown / Chuyển Status
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

  // 4. Chạy Test Playground
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

  // Stats calculation
  const totalKeys = keys.length;
  const activeKeys = keys.filter((k) => k.status === "ACTIVE").length;
  const rateLimitedKeys = keys.filter((k) => k.status === "RATE_LIMITED").length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Tổng API Keys</span>
            <Key className="size-5 text-brand-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{totalKeys}</span>
            <span className="text-xs text-zinc-500">keys trong kho</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Khả dụng (Active)</span>
            <CheckCircle2 className="size-5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{activeKeys}</span>
            <span className="text-xs text-zinc-500">keys đang hoạt động</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Đang Cooldown (429)</span>
            <Clock className="size-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{rateLimitedKeys}</span>
            <span className="text-xs text-zinc-500">tự phục hồi sau cooldown</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Tổng Request Đã Log</span>
            <Activity className="size-5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{totalLogsCount}</span>
            <span className="text-xs text-zinc-500">lượt gọi gateway</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("keys")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "keys"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Key className="size-4" />
          Kho API Keys & Models ({keys.length})
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "logs"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Activity className="size-4" />
          Nhật ký Hoạt động & Tokens ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab("tester")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "tester"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Play className="size-4" />
          🧪 Playground & API Tester
        </button>
      </div>

      {/* TAB 1: Quản lý Keys & Models */}
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

          {/* Form Thêm Key */}
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
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
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
                    placeholder="sk-..."
                    required
                    value={newKeySecret}
                    onChange={(e) => setNewKeySecret(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700">Nhãn gợi nhớ (Alias)</label>
                  <input
                    type="text"
                    placeholder="VD: OpenAI Tier 4 Primary"
                    value={newKeyAlias}
                    onChange={(e) => setNewKeyAlias(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
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
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingKey(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
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

          {/* Bảng danh sách Keys */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
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
                        className="inline-flex items-center rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50"
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
                      Chưa có API Key nào được cấu hình trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Nhật ký Hoạt động (Logs) */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">
              Nhật ký gọi Gateway & Token Tracking
            </h2>
            <span className="text-xs text-zinc-500">Hiển thị {logs.length} bản ghi gần nhất</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 font-medium text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Tác vụ</th>
                  <th className="px-4 py-3">Provider / Model</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Độ trễ</th>
                  <th className="px-4 py-3">HTTP Status</th>
                  <th className="px-4 py-3">IP / Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          log.taskType === "TEXT"
                            ? "bg-blue-50 text-blue-700"
                            : log.taskType === "IMAGE"
                            ? "bg-purple-50 text-purple-700"
                            : log.taskType === "AUDIO"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {log.taskType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{log.provider}</div>
                      <div className="text-xs text-zinc-500">{log.model}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.totalTokens > 0 ? (
                        <span>
                          <strong className="text-zinc-900">{log.totalTokens}</strong> tokens
                          <span className="text-zinc-400"> ({log.promptTokens}+{log.completionTokens})</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-600 whitespace-nowrap">
                      {log.latencyMs} ms
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.statusCode === 200
                            ? "bg-emerald-50 text-emerald-700"
                            : log.statusCode === 429
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.statusCode}
                      </span>
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

      {/* TAB 3: Playground / Tester */}
      {activeTab === "tester" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Cột Trái: Input Controls */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold">
              <Sliders className="size-4 text-brand-600" />
              <span>Cấu hình Thử nghiệm API</span>
            </div>

            {/* Loại Tác vụ */}
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
                        setTestProvider("openai");
                        setTestModel("gpt-4o-mini");
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
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
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
                  onChange={(e) => setTestProvider(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                >
                  {testTaskType === "TEXT" && (
                    <>
                      <option value="openai">OpenAI</option>
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
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
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
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
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
                className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-brand-500"
                placeholder="Nhập nội dung cần AI xử lý..."
              />
            </div>

            <button
              type="button"
              onClick={handleRunTest}
              disabled={testLoading || !testPrompt.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {testLoading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {testLoading ? "Đang gọi AI Gateway..." : "Thực thi Test API"}
            </button>
          </div>

          {/* Cột Phải: Kết quả Output */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col">
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

            <div className="mt-4 flex-1 overflow-auto rounded-lg bg-zinc-900 p-4 font-mono text-xs text-zinc-100">
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
                  {/* Text Output Preview */}
                  {testResult.kind === "TEXT" && (
                    <div>
                      <div className="text-zinc-400 text-xs mb-1">[AI RESPONSE CONTENT]</div>
                      <div className="text-emerald-400 whitespace-pre-wrap bg-zinc-800 p-3 rounded-md">
                        {String((testResult.result as { content?: string }).content ?? "")}
                      </div>
                    </div>
                  )}

                  {/* Audio Output Preview */}
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

                  {/* Image Output Preview */}
                  {testResult.kind === "IMAGE" && (
                    <div className="space-y-2">
                      <div className="text-zinc-400 text-xs">[IMAGE TASK QUEUE ACCEPTED]</div>
                      <pre className="text-brand-300">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Raw JSON Details */}
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
