import { useEffect, type CSSProperties, type ReactNode } from 'react'

import { useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'

import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import type { ShellPreferences } from '@/lib/shell-preferences'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'
import { useShellStore } from '@/stores/shell'
import { setTabsPersistence } from '@/stores/tabs'

import { BreadcrumbView, useBreadcrumbTrail } from './app-breadcrumb'
import { FullscreenToggle } from './header/fullscreen-toggle'
import { GithubHelp } from './header/github-help'
import { LayoutControls } from './header/layout-controls'
import { NotificationButton } from './header/notification-button'
import { SearchDialog } from './header/search-dialog'
import { ThemeSwitcher } from './header/theme-switcher'
import { UserMenu } from './header/user-menu'
import { DocumentTitle, UpdateChecker, Watermark } from './page-effects'
import { AppSidebar } from './sidebar/app-sidebar'
import { Tabbar } from './tabbar/tabbar'
import { LockScreenOverlay, LockScreenSetupDialog, useLockScreen } from './workspace-overlays'

/** Application shell shared by every authenticated section. */
export function AppShell({ defaultOpen, variant, collapsible, children }: ShellPreferences & { children: ReactNode }) {
  const tabbarEnable = usePreferencesStore(state => state.values.tabbar_enable)
  const tabbarPersist = usePreferencesStore(state => state.values.tabbar_persist)
  const { locked, lock, unlock, clear } = useLockScreen()

  useEffect(() => {
    setTabsPersistence(tabbarPersist)
  }, [tabbarPersist])

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 68)'
        } as CSSProperties
      }
    >
      <div inert={locked} className="contents">
        <AppSidebar variant={variant} collapsible={collapsible} />
        <SidebarInset
          className={cn(
            '[html[data-content-layout=centered]_&>*]:mx-auto [html[data-content-layout=centered]_&>*]:w-full [html[data-content-layout=centered]_&>*]:max-w-screen-2xl',
            'peer-data-[variant=inset]:border',
            '[--dashboard-header-height:--spacing(12)]',
            'min-w-0 overflow-x-clip'
          )}
        >
          <header
            className={cn(
              'flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear',
              // Sticky navbar styling; keeps the glass/border consistent across sidebar variants.
              '[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md'
            )}
          >
            <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
              <div className="flex shrink-0 items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mx-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center lg:mx-2"
                />
                <SearchDialog />
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <LayoutControls />
                <NotificationButton />
                <div className="hidden md:contents">
                  <GithubHelp />
                </div>
                <ThemeSwitcher />
                <div className="hidden md:contents">
                  <FullscreenToggle />
                </div>
                <UserMenu />
              </div>
            </div>
          </header>
          {tabbarEnable && <Tabbar />}
          {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
          <ShellContent>{children}</ShellContent>
        </SidebarInset>
      </div>
      <DocumentTitle />
      <Watermark />
      <UpdateChecker />
      <LockScreenSetupDialog onLock={lock} />
      {locked && <LockScreenOverlay onUnlock={unlock} onClear={clear} onForget={clear} />}
    </SidebarProvider>
  )
}

/**
 * The page body's entrance animation, isolated so only this subtree re-renders when the pathname
 * or refresh counter changes; the sidebar, header and tabbar above it stay put.
 */
function PageFrame({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const refreshKey = useShellStore(state => state.refreshKey)

  return (
    <div
      key={`${pathname}:${refreshKey}`}
      className="motion-safe:animate-in motion-safe:duration-150 motion-safe:fade-in motion-safe:slide-in-from-bottom-1"
    >
      {children}
    </div>
  )
}

/**
 * Breadcrumb plus the padded content area. Owns the breadcrumb pathname subscription so `AppShell`
 * itself takes no router state and does not re-render on navigation.
 */
function ShellContent({ children }: { children: ReactNode }) {
  const breadcrumbItems = useBreadcrumbTrail()
  const hasBreadcrumb = breadcrumbItems.length > 0

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <BreadcrumbView items={breadcrumbItems} />
      <div
        className={cn(
          'min-h-0 min-w-0 flex-1 p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0',
          hasBreadcrumb ? 'pt-1.5 md:pt-2' : undefined
        )}
      >
        <PageFrame>{children}</PageFrame>
      </div>
    </div>
  )
}
