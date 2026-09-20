import type { NextConfig } from "next";
import { EventEmitter } from "node:events";

// Prevent MaxListenersExceededWarning when multiple streams / drain listeners attach in dev
EventEmitter.defaultMaxListeners = 30;

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self' https://soumyasingh.site/ https://*.vercel.app http://localhost:*",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
    ],
  },
  turbopack: {},
  serverExternalPackages: [
    "@langchain/langgraph",
    "@modelcontextprotocol/sdk",
    "@prisma/client",
    "prisma",
    "pyodide",
  ],
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client bundle
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      // Mark node: modules as external for client builds
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          "node:vm": "commonjs node:vm",
          "node:child_process": "commonjs node:child_process",
          "node:util": "commonjs node:util",
        });
      }
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
