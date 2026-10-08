import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Also allow whatever host NEXT_PUBLIC_API_BASE_URL points at, so a changed API
// domain doesn't silently break next/image again.
const apiPattern = (() => {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
    return [
      {
        protocol: u.protocol.replace(":", "") as "http" | "https",
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
      },
    ];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // The backend API host serves product/category/brand images via
    // /api/v1/storage/{type}/{file} — without a matching remote pattern here,
    // next/image rejects those URLs, which is why every product image in the
    // codebase falls back to a plain <img> today. Add the production API host too
    // once NEXT_PUBLIC_API_BASE_URL is set to it in that environment's .env.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      { protocol: "https", hostname: "auto-diag-api.salonflow.cloud" },
      ...apiPattern,
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default withNextIntl(nextConfig);
