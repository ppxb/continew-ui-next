import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { getRouter } from './router'
import { hydrateSession } from './lib/auth-session'
import '@/styles/globals.css'

const queryClient = new QueryClient()
const router = getRouter()

// Route guards read the session synchronously, so it must be loaded before the
// router renders for the first time.
hydrateSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
