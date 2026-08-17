import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { trace } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { inSentrySpan } from "../../lib/observability/server-tracing.js";

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});
trace.setGlobalTracerProvider(provider);
beforeEach(() => exporter.reset());
after(() => provider.shutdown());

test("exchange operation spans honor an explicit parent", async () => {
  const parent = trace.getTracer("test").startSpan("api.dashboard.stats");
  await inSentrySpan("api.dashboard.stats.auth", () => undefined, { parent });
  parent.end();

  const spans = exporter.getFinishedSpans();
  const root = spans.find((span) => span.name === "api.dashboard.stats");
  const child = spans.find((span) => span.name === "api.dashboard.stats.auth");
  assert.equal(child.parentSpanContext.spanId, root.spanContext().spanId);
});

test("exchange operation spans record thrown errors", async () => {
  await assert.rejects(
    inSentrySpan("api.dashboard.stats.query", () => { throw new Error("query failed"); }),
    /query failed/,
  );
  const [span] = exporter.getFinishedSpans();
  assert.equal(span.status.code, 2);
  assert.equal(span.events[0]?.name, "exception");
});
