/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/kelsus-scorer",
  assetPrefix: "/kelsus-scorer/",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
