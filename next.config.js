/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
    NEXT_PUBLIC_TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
    NEXT_PUBLIC_FRED_API_KEY: process.env.FRED_API_KEY,
  }
}

module.exports = nextConfig
