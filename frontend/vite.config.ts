import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['cdn.familymink5.kr'],
    port: 8080
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
