import type { NextConfig } from "next";

const apiOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
})();

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.r2.dev",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin} https://*.r2.dev`,
  "media-src 'self' https://*.r2.dev blob:",
]
  .join("; ")
  .replace(/\s+/g, " ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
