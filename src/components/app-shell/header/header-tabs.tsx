import * as React from 'react'

import { Link, useRouter, useRouterState, type RegisteredRouter } from '@tanstack/react-router'
import { cn } from 'cn'
import { Ban, Layers, RotateCw, X } from 'lucide-react'
import { motion } from 'motion/react'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { useMenuRoutes } from '@/hooks/use-menu'
import { resolveMenuIcon } from '@/navigation/menu-icons'
import { findMenuByPath } from '@/navigation/menu'
import { type TabItem, useTabsStore } from '@/stores/tabs'

const STATIC_ROUTE_TITLES: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/dashboard/profile': '个人中心',
  '/dashboard/analytics': '分析中心',
  '/dashboard/ecommerce': '电子商务',
  '/dashboard/crm': '客户关系',
  '/dashboard/finance': '财务管理',
  '/dashboard/logistics': '物流看板',
  '/dashboard/kanban': '任务看板',
  '/dashboard/calendar': '日程日历',
  '/dashboard/file-manager': '文件管理',
  '/dashboard/mail': '邮件中心',
  '/dashboard/chat': '消息沟通',
  '/dashboard/tasks': '任务清单',
  '/dashboard/users': '用户管理',
  '/dashboard/roles': '角色管理',
  '/dashboard/infrastructure': '基础设施',
  '/dashboard/invoice': '发票管理',
  '/dashboard/productivity': '生产力看板',
  '/dashboard/patient-monitoring': '健康监测',
  '/dashboard/academy': '培训学院',
  '/dashboard/coming-soon': '即将推出'
}

const STATIC_ROUTE_ICONS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/dashboard/profile': 'user',
  '/dashboard/analytics': 'chart',
  '/dashboard/ecommerce': 'box',
  '/dashboard/crm': 'user-group',
  '/dashboard/finance': 'database',
  '/dashboard/logistics': 'project',
  '/dashboard/kanban': 'list',
  '/dashboard/calendar': 'schedule',
  '/dashboard/file-manager': 'file',
  '/dashboard/mail': 'email',
  '/dashboard/chat': 'message',
  '/dashboard/tasks': 'list',
  '/dashboard/users': 'user-management',
  '/dashboard/roles': 'safe',
  '/dashboard/infrastructure': 'computer',
  '/dashboard/invoice': 'file-text',
  '/dashboard/productivity': 'chart',
  '/dashboard/patient-monitoring': 'safe',
  '/dashboard/academy': 'bookmark',
  '/dashboard/coming-soon': 'clock'
}

function resolveRouteInfo(pathname: string, menuRoutes: Parameters<typeof findMenuByPath>[0], isRealRoute: boolean) {
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return { title: '仪表盘', icon: 'dashboard' }
  }

  if (STATIC_ROUTE_TITLES[pathname]) {
    return {
      title: STATIC_ROUTE_TITLES[pathname],
      icon: STATIC_ROUTE_ICONS[pathname] ?? 'common'
    }
  }

  const entry = findMenuByPath(menuRoutes, pathname)
  if (entry?.title) {
    return {
      title: entry.title,
      icon: entry.icon ?? 'common'
    }
  }

  // Only routes that exist fall back to a generated title; splat/404 paths stay out of the tabs.
  if (!isRealRoute) {
    return null
  }

  const segment = pathname.split('/').filter(Boolean).pop()
  const title = segment
    ? segment
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '新标签页'

  return { title, icon: 'common' }
}

function isKnownPath(path: string, menuRoutes: Parameters<typeof findMenuByPath>[0], router: RegisteredRouter) {
  return resolveRouteInfo(path, menuRoutes, path in router.routesByPath) !== null
}

type TabIndicatorRect = {
  x: number
  y: number
  width: number
  height: number
}

export function HeaderTabs() {
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { data: menuRoutes } = useMenuRoutes()

  const tabs = useTabsStore(s => s.tabs)
  const addTab = useTabsStore(s => s.addTab)
  const closeTab = useTabsStore(s => s.closeTab)
  const closeOtherTabs = useTabsStore(s => s.closeOtherTabs)
  const closeAllTabs = useTabsStore(s => s.closeAllTabs)
  const pruneTabs = useTabsStore(s => s.pruneTabs)

  const visibleTabs = React.useMemo(
    () => tabs.filter(tab => isKnownPath(tab.path, menuRoutes ?? [], router)),
    [tabs, menuRoutes, router]
  )
  const navRef = React.useRef<HTMLElement | null>(null)
  const tabRefs = React.useRef(new Map<string, HTMLDivElement>())
  const [indicator, setIndicator] = React.useState<TabIndicatorRect | null>(null)

  React.useLayoutEffect(() => {
    const nav = navRef.current
    const tab = tabRefs.current.get(pathname)

    if (!nav) {
      setIndicator(null)
      return
    }

    // The tab store may add the active route after this render; keep the current
    // indicator so the next measurement can animate from it.
    if (!tab) {
      return
    }

    const measure = () => {
      const navRect = nav.getBoundingClientRect()
      const tabRect = tab.getBoundingClientRect()
      const next = {
        x: tabRect.left - navRect.left - nav.clientLeft + nav.scrollLeft,
        y: tabRect.top - navRect.top - nav.clientTop,
        width: tabRect.width,
        height: tabRect.height
      }

      setIndicator(current =>
        current &&
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next
      )
    }

    measure()

    // Resize callbacks can fire more than once per frame; measure once per frame instead.
    let frame = 0
    const observer = new ResizeObserver(() => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    })
    observer.observe(nav)
    observer.observe(tab)

    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pathname, tabs])

  // Synchronize router location with tabs. A layout effect keeps the new tab in the same
  // frame as the page it belongs to, instead of one paint later.
  React.useLayoutEffect(() => {
    if (!pathname || pathname.startsWith('/auth') || pathname === '/unauthorized') {
      return
    }

    const info = resolveRouteInfo(pathname, menuRoutes ?? [], pathname in router.routesByPath)
    if (!info) {
      return
    }

    addTab({
      path: pathname,
      title: info.title,
      icon: info.icon,
      closable: pathname !== '/dashboard'
    })
  }, [pathname, menuRoutes, addTab, router])

  // Drop tabs persisted from pages that no longer exist.
  React.useEffect(() => {
    if (menuRoutes) {
      pruneTabs(path => isKnownPath(path, menuRoutes, router))
    }
  }, [menuRoutes, pruneTabs, router])

  const handleCloseTab = (tab: TabItem) => {
    const fallbackPath = closeTab(tab.path)
    if (tab.path === pathname && fallbackPath) {
      void router.navigate({ href: fallbackPath })
    }
  }

  const handleRefresh = (tabPath: string) => {
    if (tabPath === pathname) {
      void router.invalidate()
    } else {
      void router.navigate({ href: tabPath }).then(() => {
        void router.invalidate()
      })
    }
  }

  const handleCloseOthers = (tab: TabItem) => {
    closeOtherTabs(tab.path)
    if (tab.path !== pathname) {
      void router.navigate({ href: tab.path })
    }
  }

  const handleCloseAll = () => {
    closeAllTabs()
    if (pathname !== '/dashboard') {
      void router.navigate({ href: '/dashboard' })
    }
  }

  return (
    <nav
      ref={navRef}
      data-slot="header-tabs"
      className="relative inline-flex h-8 max-w-full scrollbar-none items-center gap-1 overflow-x-auto rounded-lg border border-border/70 p-0.5 select-none"
    >
      {indicator && (
        <motion.span
          className="pointer-events-none absolute top-0 left-0 z-0 rounded-md border border-border/80 bg-accent"
          initial={false}
          animate={{
            x: indicator.x,
            y: indicator.y,
            width: indicator.width,
            height: indicator.height
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}

      {visibleTabs.map(tab => {
        const isActive = tab.path === pathname
        const isPinned = !tab.closable
        const Icon = resolveMenuIcon(tab.icon)

        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger render={<div className="min-w-0 shrink" />}>
              <div
                ref={node => {
                  if (node) {
                    tabRefs.current.set(tab.path, node)
                  } else {
                    tabRefs.current.delete(tab.path)
                  }
                }}
                className={cn(
                  'group relative flex h-7 max-w-[130px] min-w-0 shrink items-center rounded-md border border-transparent text-xs transition-colors duration-150',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-accent-foreground/5 hover:text-foreground'
                )}
              >
                <Link<RegisteredRouter, string, string>
                  href={tab.path}
                  className={cn(
                    'relative z-10 flex h-full min-w-0 flex-1 items-center gap-1.5 pl-2.5',
                    isPinned && 'pr-2.5'
                  )}
                >
                  {/* Menu Lucide Icon */}
                  <Icon
                    className={cn(
                      'size-3.5 shrink-0 transition-colors',
                      isActive ? 'text-foreground' : 'text-muted-foreground/80 group-hover:text-foreground'
                    )}
                  />

                  <span className="truncate">{tab.title}</span>
                </Link>

                {/* The close button is a sibling of the link: a button inside an anchor is invalid. */}
                {!isPinned && (
                  <button
                    type="button"
                    onClick={() => handleCloseTab(tab)}
                    className={cn(
                      'relative z-10 mr-1 ml-1.5 flex size-3.5 shrink-0 items-center justify-center rounded-xs transition-all hover:bg-muted-foreground/15 hover:text-foreground',
                      isActive
                        ? 'opacity-50 hover:opacity-100'
                        : 'opacity-0 group-hover:opacity-50 group-hover:hover:opacity-100'
                    )}
                  >
                    <X className="size-2.5" />
                    <span className="sr-only">关闭 {tab.title}</span>
                  </button>
                )}
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="min-w-36 text-xs">
              <ContextMenuItem onClick={() => handleRefresh(tab.path)} className="text-xs">
                <RotateCw className="mr-2 size-3.5" />
                重新加载
              </ContextMenuItem>
              {!isPinned && (
                <ContextMenuItem onClick={() => handleCloseTab(tab)} className="text-xs">
                  <X className="mr-2 size-3.5" />
                  关闭当前标签
                </ContextMenuItem>
              )}
              {visibleTabs.length > 1 && (
                <ContextMenuItem onClick={() => handleCloseOthers(tab)} className="text-xs">
                  <Layers className="mr-2 size-3.5" />
                  关闭其他标签
                </ContextMenuItem>
              )}
              {visibleTabs.length > 1 && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={handleCloseAll} className="text-xs text-muted-foreground">
                    <Ban className="mr-2 size-3.5" />
                    关闭所有标签
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
    </nav>
  )
}
