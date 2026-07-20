export const ErrorCodes = {
  // Auth (1xxx)
  UNAUTHORIZED: "AUTH_001",
  FORBIDDEN: "AUTH_002",
  TOKEN_EXPIRED: "AUTH_003",

  // Validation (2xxx)
  VALIDATION_FAILED: "VAL_001",
  MISSING_REQUIRED_FIELD: "VAL_002",
  INVALID_FORMAT: "VAL_003",
  INVALID_UUID: "VAL_004",

  // Resource (3xxx)
  NOT_FOUND: "RES_001",
  ALREADY_EXISTS: "RES_002",
  CONFLICT: "RES_003",

  // Database (4xxx)
  DATABASE_ERROR: "DB_001",
  QUERY_FAILED: "DB_002",
  UNIQUE_VIOLATION: "DB_003",

  // External (5xxx)
  EXTERNAL_SERVICE_ERROR: "EXT_001",

  // Business (8xxx)
  INSUFFICIENT_BALANCE: "BIZ_001",
  INVALID_TRANSACTION: "BIZ_002",
  RATE_NOT_FOUND: "BIZ_003",
  CUSTOMER_HAS_TRANSACTIONS: "BIZ_004",

  // Server (9xxx)
  INTERNAL_ERROR: "SRV_001",
  TIMEOUT: "SRV_002",
};

export class AppError extends Error {
  constructor(message, statusCode = 500, code = ErrorCodes.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, ErrorCodes.UNAUTHORIZED);
  }

  static forbidden(message = "Access denied") {
    return new AppError(message, 403, ErrorCodes.FORBIDDEN);
  }

  static notFound(resource = "Resource") {
    return new AppError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND);
  }

  static validationFailed(message, details = null) {
    return new AppError(message, 400, ErrorCodes.VALIDATION_FAILED, details);
  }

  static alreadyExists(resource) {
    return new AppError(`${resource} already exists`, 409, ErrorCodes.ALREADY_EXISTS);
  }

  static databaseError(message = "Database operation failed", cause = null) {
    const error = new AppError(message, 500, ErrorCodes.DATABASE_ERROR);
    if (cause) error.cause = cause;
    return error;
  }

  static internal(message = "Internal server error", cause = null) {
    const error = new AppError(message, 500, ErrorCodes.INTERNAL_ERROR);
    if (cause) error.cause = cause;
    return error;
  }

  static from(error) {
    if (error instanceof AppError) return error;

    const msg = error?.message || "Unknown error";

    if (error?.code === "PGRST116") {
      return AppError.notFound();
    }
    if (error?.code === "23505") {
      return AppError.alreadyExists("Resource");
    }

    return AppError.internal(msg, error);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export default AppError;
