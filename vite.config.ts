import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// API proxy: host 127.0.0.1:8082; Docker compose: http://api:8080 (VITE_API_PROXY_TARGET).
// Web port: `npm run dev` → 8086; Docker CMD → 8082 (override CLI).
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
