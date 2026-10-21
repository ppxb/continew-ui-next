import { QueryClient } from '@tanstack/react-query'

/** Default stale time: 1 minute (keeps fast tab/route switching instant). */
export const DEFAULT_STALE_TIME_MS = 60_000

/** Short cache for read-only detail drawers; editors bypass it with refreshOnOpen. */
export const DETAIL_STALE_TIME_MS = 30_000

/**
 * Shared query client and cache with unified default options.
 *
 * It lives in its own module so the router can hand it to route loaders without
 * importing the entry point that mounts the app.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME_MS,
      // Toolbar owns explicit refreshing; switching windows or tabs should not refetch.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      // Max 1 retry on failures to avoid hammering backend endpoints.
      retry: 1
    },
    mutations: {
      // Mutations write data, so they must never retry automatically.
      retry: false
    }
  }
})
