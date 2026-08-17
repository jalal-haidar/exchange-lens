import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@heroicons/react", "@headlessui/react"],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "bytecraft-hj",
  project: process.env.SENTRY_PROJECT || "lifelens-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
