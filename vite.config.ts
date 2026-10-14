import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

import { buildThemeBootScript } from './src/scripts/theme-boot-script'

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
      port: 5173,
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
