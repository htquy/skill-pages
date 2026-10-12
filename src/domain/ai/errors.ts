import { AppError } from "@/src/domain/errors";
import { ProblemDetails } from "./models";

export class AiGatewayError extends AppError {
  readonly instance?: string;
  readonly typeUrl: string;

  constructor(
    code: string,
    message: string,
    status = 500,
    typeUrl = "about:blank",
    instance?: string,
  ) {
    super(code, message, status);
    this.typeUrl = typeUrl;
    this.instance = instance;
  }

  toProblemDetails(): ProblemDetails {
    return {
      type: this.typeUrl,
      title: this.name.replace(/([A-Z])/g, " $1").trim(),
      status: this.status,
      detail: this.message,
      instance: this.instance,
      code: this.code,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiUnauthorizedClientError extends AiGatewayError {
  constructor(message = "Invalid or missing X-API-KEY / Bearer token", instance?: string) {
    super("UNAUTHORIZED_CLIENT", message, 401, "https://api.gateway.dev/errors/unauthorized", instance);
  }
}

export class AiRateLimitExceededError extends AiGatewayError {
  constructor(message = "Rate limit exceeded for client", instance?: string) {
    super("CLIENT_RATE_LIMIT_EXCEEDED", message, 429, "https://api.gateway.dev/errors/rate-limit-exceeded", instance);
  }
}

export class AiAllKeysExhaustedError extends AiGatewayError {
  constructor(provider: string, instance?: string) {
    super(
      "ALL_KEYS_EXHAUSTED",
      `All API keys for provider '${provider}' are currently rate limited or exhausted. Please retry shortly.`,
      503,
      "https://api.gateway.dev/errors/all-keys-exhausted",
      instance,
    );
  }
}

export class AiProviderUnavailableError extends AiGatewayError {
  constructor(provider: string, detailMessage?: string, instance?: string) {
    super(
      "PROVIDER_UNAVAILABLE",
      `Provider '${provider}' responded with an upstream error: ${detailMessage || "Service Unavailable"}`,
      502,
      "https://api.gateway.dev/errors/upstream-provider-failure",
      instance,
    );
  }
}

export class AiTaskNotFoundError extends AiGatewayError {
  constructor(taskId: string, instance?: string) {
    super("TASK_NOT_FOUND", `AI Task with ID '${taskId}' was not found`, 404, "https://api.gateway.dev/errors/not-found", instance);
  }
}

export class AiValidationError extends AiGatewayError {
  readonly invalidParams?: Array<{ name: string; reason: string }>;

  constructor(message = "Validation failed", invalidParams?: Array<{ name: string; reason: string }>, instance?: string) {
    super("VALIDATION_ERROR", message, 400, "https://api.gateway.dev/errors/validation-error", instance);
    this.invalidParams = invalidParams;
  }

  override toProblemDetails(): ProblemDetails {
    const base = super.toProblemDetails();
    if (this.invalidParams) {
      base.invalidParams = this.invalidParams;
    }
    return base;
  }
}

export function toProblemDetailsResponse(error: unknown, instance?: string): ProblemDetails {
  if (error instanceof AiGatewayError) {
    return error.toProblemDetails();
  }

  const message = error instanceof Error ? error.message : "Internal AI Gateway error occurred";
  return {
    type: "https://api.gateway.dev/errors/internal-error",
    title: "Internal Server Error",
    status: 500,
    detail: message,
    instance,
    code: "INTERNAL_GATEWAY_ERROR",
    timestamp: new Date().toISOString(),
  };
}
