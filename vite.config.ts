import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    themeBootPlugin(),
    devtools({
      injectSource: {
        enabled: true,
        ignore: {
          components: ['FullCalendar']
        }
      }
    }),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss()
  ]
})
