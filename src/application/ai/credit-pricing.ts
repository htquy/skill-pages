import { AiAppCreditPolicyDto, TokenUsage } from "@/src/domain/ai/models";

export const DEFAULT_USD_PER_CREDIT = 0.002; // 1000 credits = $2.00
export const DEFAULT_OPENROUTER_MAX_TOKENS = 12_288; // Tránh OpenRouter reserve max_tokens quá cao & hạn chế đốt quota
export const DEFAULT_PRIMARY_PROVIDER = "openrouter";
export const DEFAULT_PRIMARY_MODEL = "anthropic/claude-haiku-5.5";
export const DEFAULT_FALLBACK_PROVIDER = "openrouter";
export const DEFAULT_FALLBACK_MODEL = "openai/gpt-6-luna";

export function defaultPolicyFor(appSlug: string, planKey: string): AiAppCreditPolicyDto {
  const isPro = planKey !== "FREE";
  const now = new Date();
  return {
    id: `default-${appSlug}-${planKey}`,
    appSlug,
    planKey,
    monthlyCredits: isPro ? 1000 : 50,
    usdPerCredit: DEFAULT_USD_PER_CREDIT,
    resetMode: isPro ? "MONTHLY" : "TRIAL",
    primaryProvider: DEFAULT_PRIMARY_PROVIDER,
    primaryModel: DEFAULT_PRIMARY_MODEL,
    fallbackProvider: DEFAULT_FALLBACK_PROVIDER,
    fallbackModel: DEFAULT_FALLBACK_MODEL,
    allowedModels: [DEFAULT_PRIMARY_MODEL, DEFAULT_FALLBACK_MODEL],
    isActive: true,
    description: isPro
      ? "Chính sách mặc định Pro (1000 credit/tháng = $2.00)"
      : "Chính sách mặc định Free trial (50 credit = $0.10)",
    createdAt: now,
    updatedAt: now,
  };
}

export function currentUtcPeriodKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthBoundsUtc(periodKey: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return null;
  }
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

/**
 * Tính chi phí USD thực tế theo biểu giá OpenRouter / provider dựa trên token.
 * Nếu provider trả sẵn `usage.costUsd` (OpenRouter trả `usage.cost`), ưu tiên tuyệt đối giá trị đó.
 */
export function calculateCostUsd(model: string, usage: TokenUsage): number {
  if (typeof usage.costUsd === "number" && Number.isFinite(usage.costUsd) && usage.costUsd >= 0) {
    return Number(usage.costUsd.toFixed(6));
  }

  const normalized = model.toLowerCase();
  const prompt = Math.max(0, usage.promptTokens || 0);
  const cached = Math.min(prompt, Math.max(0, usage.cachedTokens || 0));
  const uncachedPrompt = Math.max(0, prompt - cached);
  const completion = Math.max(0, usage.completionTokens || 0);

  // Anthropic Claude Haiku 5.5 on OpenRouter: <=100k is $0.10 / $0.50 per 1M, >100k is 5x ($0.50 / $2.50)
  if (normalized.includes("claude-haiku-5.5") || normalized.includes("haiku-5.5")) {
    const overThreshold = prompt > 100_000;
    const inputPer1M = overThreshold ? 0.5 : 0.1;
    const cachePer1M = overThreshold ? 0.05 : 0.01;
    const outputPer1M = overThreshold ? 2.5 : 0.5;
    return Number(
      (
        (uncachedPrompt * inputPer1M +
          cached * cachePer1M +
          completion * outputPer1M) /
        1_000_000
      ).toFixed(6),
    );
  }

  // OpenAI GPT-6 Luna on OpenRouter: <=272k is $0.10 / $0.50 per 1M, >272k is $0.20 / $0.75 per 1M
  if (normalized.includes("gpt-6-luna")) {
    const overThreshold = prompt > 272_000;
    const inputPer1M = overThreshold ? 0.2 : 0.1;
    const cachePer1M = overThreshold ? 0.02 : 0.01;
    const outputPer1M = overThreshold ? 0.75 : 0.5;
    return Number(
      (
        (uncachedPrompt * inputPer1M +
          cached * cachePer1M +
          completion * outputPer1M) /
        1_000_000
      ).toFixed(6),
    );
  }

  if (normalized.includes("gpt-4o-mini")) {
    return Number(
      ((uncachedPrompt * 0.15 + cached * 0.075 + completion * 0.6) / 1_000_000).toFixed(6),
    );
  }
  if (normalized.includes("gpt-4o")) {
    return Number(
      ((uncachedPrompt * 2.5 + cached * 1.25 + completion * 10) / 1_000_000).toFixed(6),
    );
  }
  if (normalized.includes("gemini-2.0-flash")) {
    return Number(
      ((uncachedPrompt * 0.1 + cached * 0.025 + completion * 0.4) / 1_000_000).toFixed(6),
    );
  }

  // Safe conservative default if an unlisted model is queried
  return Number(
    ((uncachedPrompt * 0.25 + cached * 0.025 + completion * 1.0) / 1_000_000).toFixed(6),
  );
}

export function usdToCredits(costUsd: number, usdPerCredit = DEFAULT_USD_PER_CREDIT): number {
  const unit = usdPerCredit > 0 ? usdPerCredit : DEFAULT_USD_PER_CREDIT;
  return Number(Math.max(0, costUsd / unit).toFixed(4));
}

export function isRetryableFallbackError(err: unknown, sameProvider = false): boolean {
  if (!err || typeof err !== "object") return true;
  const status =
    (err as { statusCode?: number; status?: number }).statusCode ??
    (err as { statusCode?: number; status?: number }).status;

  // Do not fallback on user input errors (400), exhausted user/account balance (402), forbidden (403), or validation (422)
  if (status === 400 || status === 402 || status === 403 || status === 422) {
    return false;
  }
  // A 401 on the same upstream provider will fail identically on the fallback model and waste quota
  if (status === 401 && sameProvider) {
    return false;
  }
  // Retryable upstream statuses: 404 (model unavailable), 408, 429, 500, 502, 503, 504, or network failures
  return true;
}
