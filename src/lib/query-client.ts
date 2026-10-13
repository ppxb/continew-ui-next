import { QueryClient } from '@tanstack/react-query'

/**
 * Shared query cache.
 *
 * It lives in its own module so the router can hand it to route loaders without
 * importing the entry point that mounts the app.
 */
export const queryClient = new QueryClient()
