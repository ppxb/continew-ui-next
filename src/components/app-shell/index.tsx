import type { CSSProperties, ReactNode } from 'react'

import { useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'

import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { ensureMenuLoaded } from '@/hooks/use-menu'
import { requireAuth } from '@/lib/auth-guard'
import { getClientCookie } from '@/lib/cookie'
import { parsePreference } from '@/lib/preferences/preferences-config'

import { FullscreenToggle } from './header/fullscreen-toggle'
import { HeaderTabs } from './header/header-tabs'
import { LayoutControls } from './header/layout-controls'
import { SearchDialog } from './header/search-dialog'
import { ThemeSwitcher } from './header/theme-switcher'
import { UserMenu } from './header/user-menu'
import { AppSidebar } from './sidebar/app-sidebar'
import { AppBreadcrumb, useBreadcrumbTrail } from './app-breadcrumb'

export { AppBreadcrumb, useBreadcrumbTrail } from './app-breadcrumb'

/**
 * Sidebar preferences are read from cookies so the shell renders correctly on the
 * first paint, which is also what the boot script relies on.
 */
export function readShellPreferences() {
  return {
    defaultOpen: getClientCookie('sidebar_state') !== 'false',
    variant: parsePreference('sidebar_variant', getClientCookie('sidebar_variant')),
    collapsible: parsePreference('sidebar_collapsible', getClientCookie('sidebar_collapsible'))
  }
}

export type ShellPreferences = ReturnType<typeof readShellPreferences>

type ShellLoaderContext = {
  location: { href: string; pathname: string }
}

/**
 * Route loader for the shell layouts.
 *
 * Waits for the menu so the sidebar's first paint already holds every entry. The auth
 * guard runs before the request, so the session is re-checked afterwards: a session
 * that expired while the menu was loading must not render the shell.
 */
export async function loadAppShell({ location }: ShellLoaderContext): Promise<ShellPreferences> {
  await ensureMenuLoaded()
  requireAuth({ location })

  return readShellPreferences()
}

/** Application shell shared by every authenticated section. */
export function AppShell({ defaultOpen, variant, collapsible, children }: ShellPreferences & { children: ReactNode }) {
  const hasBreadcrumb = useBreadcrumbTrail().length > 0
  const pathname = useRouterState({ select: state => state.location.pathname })

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 68)'
        } as CSSProperties
      }
    >
      <AppSidebar variant={variant} collapsible={collapsible} />
      <SidebarInset
        className={cn(
          '[html[data-content-layout=centered]_&>*]:mx-auto',
          '[html[data-content-layout=centered]_&>*]:w-full',
          '[html[data-content-layout=centered]_&>*]:max-w-screen-2xl',
          'peer-data-[variant=inset]:border',
          '[--dashboard-header-height:--spacing(12)]',
          'min-w-0 overflow-x-clip'
        )}
      >
        <header
          className={cn(
            'flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
            // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
            '[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md'
          )}
        >
          <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
            {/* Left: SidebarTrigger + Separator + SearchDialog */}
            <div className="flex shrink-0 items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center lg:mx-2"
              />
              <SearchDialog />
            </div>

            {/* Center: In-Header Tabs (Flex layout, centered in remaining space) */}
            <div className="hidden min-w-0 flex-1 items-center justify-center px-2 md:flex">
              <HeaderTabs />
            </div>

            {/* Right: Controls */}
            <div className="flex shrink-0 items-center gap-3">
              <LayoutControls />
              <ThemeSwitcher />
              <FullscreenToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
          <AppBreadcrumb />
          <div
            className={cn(
              'min-h-0 min-w-0 flex-1 p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0',
              hasBreadcrumb ? 'pt-1.5 md:pt-2' : 'pt-4 md:pt-6'
            )}
          >
            {/* Content-only entrance, so the sidebar and header keep rendering live. */}
            <div
              key={pathname}
              className="motion-safe:animate-in motion-safe:duration-150 motion-safe:blur-in-4 motion-safe:fade-in motion-safe:slide-in-from-bottom-1"
            >
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
