/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // sql.js usa fs en Node pero solo lo necesitamos en el browser
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false }
    }
    return config
  },
}

module.exports = nextConfig
