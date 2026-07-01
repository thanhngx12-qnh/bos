import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "antd",
    "@ant-design/icons",
    "@ant-design/cssinjs",
    "rc-util",
    "rc-pagination",
    "rc-picker",
    "rc-tree",
    "rc-table"
  ],
};

export default nextConfig;
