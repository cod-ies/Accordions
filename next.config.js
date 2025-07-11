/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    }
    return config
  },
}

module.exports = nextConfig
