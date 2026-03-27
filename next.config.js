/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Vercel
  output: undefined, // Let Vercel handle this
  
  // Configure webpack for PDF.js worker
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

module.exports = nextConfig;
