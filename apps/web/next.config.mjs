/** @type {import('next').NextConfig} */

const BACKEND = {
  collab: process.env.COLLAB_CORE_URL ?? 'http://localhost:3001',
  ai: process.env.AI_GATEWAY_URL ?? 'http://localhost:3002',
  rag: process.env.RAG_SERVICE_URL ?? 'http://localhost:3003',
  meeting: process.env.MEETING_SUMMARY_URL ?? 'http://localhost:3004',
  code: process.env.CODE_TASK_ASSISTANT_URL ?? 'http://localhost:3005',
};

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // 浏览器请求经同源代理转发到各微服务，规避跨域且不引入额外依赖
  async rewrites() {
    return [
      { source: '/api/collab/:path*', destination: `${BACKEND.collab}/api/v1/:path*` },
      { source: '/api/ai/:path*', destination: `${BACKEND.ai}/api/v1/:path*` },
      { source: '/api/rag/:path*', destination: `${BACKEND.rag}/api/v1/:path*` },
      { source: '/api/meeting/:path*', destination: `${BACKEND.meeting}/api/v1/:path*` },
      { source: '/api/code/:path*', destination: `${BACKEND.code}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
