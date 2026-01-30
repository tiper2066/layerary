/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Konva는 클라이언트 사이드에서만 사용
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      }
    } else {
      // 서버 사이드에서는 konva를 무시
      config.externals = [...(config.externals || []), 'konva', 'canvas']
    }

    return config
  },
}

module.exports = nextConfig

