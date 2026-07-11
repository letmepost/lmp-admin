import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — there's an unrelated lockfile higher up the tree
  // that Next would otherwise infer as the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
