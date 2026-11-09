import type { NextConfig } from "next";

/** Ảnh bìa tool nằm trên R2 (domain public lấy từ R2_PUBLIC_URL lúc build) → next/image phải cho phép host đó. */
const r2Host = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
      ...(r2Host ? [{ protocol: "https" as const, hostname: r2Host, pathname: "/**" }] : []),
    ],
  },
};

export default nextConfig;
