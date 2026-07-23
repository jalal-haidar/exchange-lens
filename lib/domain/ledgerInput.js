const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/;
const SIGNED_DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.(\d+))?$/;

export function requireUuid(value, label) {
  const normalized = String(value ?? "").trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a valid UUID`);
  }
  return normalized;
}

export function optionalUuid(value, label) {
  return value ? requireUuid(value, label) : null;
}

export function requireDecimal(value, label, {
  scale,
  allowZero = false,
} = {}) {
  const normalized = String(value ?? "").trim();
  const match = DECIMAL_PATTERN.exec(normalized);
  if (!match || (!allowZero && /^0(?:\.0+)?$/.test(normalized))) {
    throw new RangeError(`${label} must be ${allowZero ? "zero or positive" : "positive"}`);
  }
  if (scale !== undefined && (match[1]?.length ?? 0) > scale) {
    throw new RangeError(`${label} supports at most ${scale} decimal places`);
  }
  return normalized;
}

export function requireSignedDecimal(value, label, {
  scale,
  allowZero = true,
} = {}) {
  const normalized = String(value ?? "").trim();
  const match = SIGNED_DECIMAL_PATTERN.exec(normalized);
  if (!match || (!allowZero && /^-?0(?:\.0+)?$/.test(normalized))) {
    throw new RangeError(`${label} must be a valid decimal`);
  }
  if (scale !== undefined && (match[1]?.length ?? 0) > scale) {
    throw new RangeError(`${label} supports at most ${scale} decimal places`);
  }
  return normalized;
}

export function optionalText(value, maxLength = 500) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length > maxLength) {
    throw new RangeError(`Text must not exceed ${maxLength} characters`);
  }
  return normalized || null;
}

export function requireTimestamp(value, label = "Posting time") {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new TypeError(`${label} must be valid`);
  }
  return parsed.toISOString();
}

export function mapLedgerError(error) {
  if (error?.code === "P0002") return { status: 404, message: error.message };
  if (["22003", "22023"].includes(error?.code)) {
    return { status: 400, message: error.message };
  }
  if (["23505", "23514"].includes(error?.code)) {
    return { status: 409, message: error.message };
  }
  return { status: 500, message: "Financial operation failed" };
}

export function subtractMoney(...values) {
  const toCents = (value) => {
    const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value ?? "0"));
    if (!match) throw new TypeError("Invalid two-decimal money value");
    const units = BigInt(match[2]) * 100n
      + BigInt((match[3] || "").padEnd(2, "0"));
    return match[1] === "-" ? -units : units;
  };
  const result = values.reduce(
    (total, value, index) => total + (index === 0 ? toCents(value) : -toCents(value)),
    0n,
  );
  const negative = result < 0n;
  const absolute = negative ? -result : result;
  return `${negative ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
