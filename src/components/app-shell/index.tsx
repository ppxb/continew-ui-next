import type { CSSProperties, ReactNode } from 'react'

import { useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'

import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import type { ShellPreferences } from '@/lib/shell-preferences'

import { FullscreenToggle } from './header/fullscreen-toggle'
import { GithubHelp } from './header/github-help'
import { HeaderTabs } from './header/header-tabs'
import { LayoutControls } from './header/layout-controls'
import { SearchDialog } from './header/search-dialog'
import { ThemeSwitcher } from './header/theme-switcher'
import { UserMenu } from './header/user-menu'
import { AppSidebar } from './sidebar/app-sidebar'
import { BreadcrumbView, useBreadcrumbTrail } from './app-breadcrumb'

/** Application shell shared by every authenticated section. */
export function AppShell({ defaultOpen, variant, collapsible, children }: ShellPreferences & { children: ReactNode }) {
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
              <GithubHelp />
              <ThemeSwitcher />
              <FullscreenToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
        <ShellContent>{children}</ShellContent>
      </SidebarInset>
    </SidebarProvider>
  )
}

/**
 * The page body's entrance animation, isolated so only this subtree re-renders when the pathname
 * changes; the sidebar and header above it stay put.
 */
function PageFrame({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname })

  return (
    <div
      key={pathname}
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
