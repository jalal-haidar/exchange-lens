/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@heroicons/react", "@headlessui/react"],
  },
};

export default nextConfig;
