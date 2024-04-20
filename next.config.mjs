/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Only apply node-loader on the client-side build
      config.module.rules.push({
        test: /\.node$/,
        loader: 'node-loader',
      });
    }

    return config;
  },
};

export default nextConfig;
