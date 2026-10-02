import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pas d'en-tête "X-Powered-By" : application interne, on limite les informations exposées.
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
