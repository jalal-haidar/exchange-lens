import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: isProd ? 0.1 : 1.0,
  enableLogs: true,
  sendDefaultPii: !isProd,
  ignoreTransactions: ["/api/health"],
});
