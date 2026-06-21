import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html
        .replace(/crossorigin\s*=\s*["']?["']?/g, '')
        .replace(/\s+crossorigin/g, '')
    },
  }
}

function moveScriptToBody() {
  return {
    name: 'move-script-to-body',
    transformIndexHtml(html) {
      const scriptMatch = html.match(/<script type="module"[^>]*><\/script>/);
      if (!scriptMatch) return html;
      const script = scriptMatch[0];
      return html.replace(script, '').replace('</body>', `    ${script}\n  </body>`);
    },
  };
}

export default defineConfig({
  // Standalone Inno installer serves over http://127.0.0.1:3001/ — use absolute /assets paths.
  // electron-builder file:// builds set VITE_BASE=./ in BUILD-ELECTRON.bat.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), removeCrossorigin(), moveScriptToBody()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
