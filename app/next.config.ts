import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable Turbopack with fallback configuration
  turbopack: {
    resolveAlias: {
      fs: { browser: "./empty-module.js" },
      path: { browser: "./empty-module.js" },
    },
  },
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Exclude node-specific modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
      };
    }

    // Handle WASM files with URL pattern
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Resolve WASM files from node_modules
    config.resolve.alias = {
      ...config.resolve.alias,
      "light_wasm_hasher_bg.wasm": path.resolve(
        __dirname,
        "node_modules/@lightprotocol/hasher.rs/dist/light_wasm_hasher_bg.wasm",
      ),
      "hasher_wasm_simd_bg.wasm": path.resolve(
        __dirname,
        "node_modules/@lightprotocol/hasher.rs/dist/hasher_wasm_simd_bg.wasm",
      ),
    };

    return config;
  },
  // Transpile the problematic packages
  transpilePackages: ["@lightprotocol/hasher.rs"],
  // Output file tracing root
  outputFileTracingRoot: path.join(__dirname, "../"),
};

export default nextConfig;
