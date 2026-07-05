import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Host: 127.0.0.1:8082. Docker compose: http://api:8080 (service name trên mạng meup-api).
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8082'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 8082,
    strictPort: true,
    watch: {
      // Volume mount trên Docker Desktop (Windows/macOS) cần polling để HMR hoạt động.
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
