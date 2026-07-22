import { AppError } from "@/lib/errors";

export async function fetchAPI(url, options = {}) {
  const {
    timeoutMs = 30_000,
    signal: callerSignal,
    headers,
    ...requestOptions
  } = options;

  try {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
    const response = await fetch(url, {
      ...requestOptions,
      headers: { "Content-Type": "application/json", ...headers },
      signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new AppError(data.error || "Request failed", response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === "TimeoutError") {
      throw new AppError("Request timed out. Please try again.", 408);
    }
    throw new AppError(error.message || "Network error");
  }
}
