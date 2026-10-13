import { createRootRoute, Outlet } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PREFERENCE_DEFAULTS } from '@/lib/preferences/preferences-config'
import { PreferencesStoreProvider } from '@/stores/preferences/preferences-provider'

import { NotFound } from './-components/not-found'
import { RootError } from './-components/root-error'

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootError,
  notFoundComponent: NotFound
})

function RootComponent() {
  return (
    <TooltipProvider>
      <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
        <Outlet />
        <Toaster />
      </PreferencesStoreProvider>
    </TooltipProvider>
  )
}
