import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf(pdf.js)는 서버에서 번들링하지 않고 그대로 불러온다.
  serverExternalPackages: ["unpdf"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
