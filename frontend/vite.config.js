import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3001',
      '/admin': 'http://localhost:3001',
      '/api': { target: 'http://localhost:3001', configure: (proxy) => { proxy.on('error', () => {}); } },
      '/webhooks': 'http://localhost:3001',
    },
  },
})
