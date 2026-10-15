import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

/**
 * Vite's `base` only rewrites asset URLs, so a deployment under a subpath also has to tell the
 * router where it is mounted. `import.meta.env.BASE_URL` is Vite's `base` and always ends with a
 * slash, while the router expects a path without a trailing slash.
 */
const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    basepath,
    scrollRestoration: true,
    defaultPreload: false
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
