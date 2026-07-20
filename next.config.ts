import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
