export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 500) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input") {
    super("VALIDATION", message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = "The resource is in a conflicting state") {
    super("CONFLICT", message, 409);
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message = "The database is not configured or unavailable right now") {
    super("DATABASE_UNAVAILABLE", message, 503);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}