import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html
        .replace(/crossorigin\s*=\s*["']?["']?/g, '')
        .replace(/\s+crossorigin/g, '');
    },
  }
}

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  build: {
    modulePreload: false,
    cssCodeSplit: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})