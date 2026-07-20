import { AppError } from "@/lib/errors";

export async function fetchAPI(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new AppError(data.error || "Request failed", response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Network error");
  }
}
