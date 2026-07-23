import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "105mb",
    },
    proxyClientMaxBodySize: "200mb",
  },
  images: {
    remotePatterns: [
      new URL("https://d15j1ksm9qghj4.cloudfront.net/**"),
      new URL("https://www.anantaraconcorsoroma.com/**"),
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
