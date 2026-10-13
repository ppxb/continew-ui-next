import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

import { buildThemeBootScript } from './src/scripts/theme-boot-script'

/**
 * Inlines the preference boot script into index.html so theme, font and layout
 * attributes are applied before the first paint. The app is a client-only SPA,
 * so there is no server-rendered head to inject them into.
 */
function themeBootPlugin(): Plugin {
  return {
    name: 'continew:theme-boot',
    transformIndexHtml(html) {
      return html.replace('<!--theme-boot-->', () => `<script>${buildThemeBootScript()}</script>`)
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiPrefix = env.VITE_API_PREFIX || '/api'
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    resolve: {
      tsconfigPaths: true
    },
    server: {
      // The backend validates the Origin of refresh-token requests against
      // `continew-starter.refresh-token.cookie-allowed-origins`, which lists 5173 and
      // 5777 in development. Keep this port whitelisted there, otherwise refreshing the
      // session fails with 403 "请求来源不合法".
      port: 5173,
      // Keeps the browser same-origin so the backend's HttpOnly refresh-token
      // cookie is first-party and no CORS is involved during development.
      proxy: {
        [apiPrefix]: {
          target: apiTarget,
          changeOrigin: true,
          rewrite: path => path.replace(new RegExp(`^${apiPrefix}`), '')
        }
      }
    },
    plugins: [themeBootPlugin(), tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()]
  }
})
