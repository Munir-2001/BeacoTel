import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables the forbidden() / unauthorized() functions and the
    // forbidden.tsx / unauthorized.tsx file conventions.
    authInterrupts: true,
  },
};

export default nextConfig;
