import * as Sentry from "@sentry/nextjs";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";

export function markSpanError(span, error) {
  const exception = error instanceof Error ? error : new Error(String(error));
  span.recordException(exception);
  span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message });
}

export async function inSentrySpan(name, operation, options = {}) {
  const parent = options.parent ?? Sentry.getActiveSpan?.();
  const parentContext = parent
    ? trace.setSpan(context.active(), parent)
    : context.active();

  return trace.getTracer("exchange-lens").startActiveSpan(name, {}, parentContext, async (span) => {
    for (const [key, value] of Object.entries(options.attributes ?? {})) {
      if (value !== undefined) span.setAttribute(key, value);
    }
    try {
      return await operation(span);
    } catch (error) {
      markSpanError(span, error);
      throw error;
    } finally {
      span.end();
    }
  });
}
