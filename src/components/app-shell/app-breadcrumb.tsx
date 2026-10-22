import * as React from 'react'

import { Link, useRouterState, type RegisteredRouter } from '@tanstack/react-router'
import { cn } from 'cn'
import { Home } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useMenuRoutes } from '@/hooks/use-menu'
import { findMenuTrail, toPathname } from '@/navigation/menu'

export interface BreadcrumbItemData {
  id: string
  title: string
  url?: string
}

/** Predefined titles for static app and dashboard routes. */
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

function formatSegmentTitle(segment: string) {
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function useBreadcrumbTrail(): BreadcrumbItemData[] {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { data: menuRoutes } = useMenuRoutes()

  return React.useMemo(() => {
    const homeItem: BreadcrumbItemData = {
      id: 'app-home',
      title: '首页',
      url: '/dashboard'
    }

    // Dashboard root: no breadcrumb needed on the home overview
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return []
    }

    // Dynamic backend menu matching
    const menuTrail = findMenuTrail(menuRoutes ?? [], pathname)
    if (menuTrail.length > 0) {
      const trailItems: BreadcrumbItemData[] = menuTrail.map((node, index) => {
        const isLast = index === menuTrail.length - 1
        const url = isLast
          ? undefined
          : node.redirect
            ? toPathname(node.redirect)
            : node.type === 2
              ? toPathname(node.path)
              : undefined

        return {
          id: `menu-${node.id}`,
          title: node.title,
          url
        }
      })

      return [homeItem, ...trailItems]
    }

    // Static route matching
    if (STATIC_ROUTE_TITLES[pathname]) {
      return [
        homeItem,
        {
          id: `static-${pathname}`,
          title: STATIC_ROUTE_TITLES[pathname]
        }
      ]
    }

    // General fallback: split pathname segments
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) {
      return []
    }

    const dynamicItems: BreadcrumbItemData[] = segments.map((segment, index) => {
      const isLast = index === segments.length - 1
      const currentPath = `/${segments.slice(0, index + 1).join('/')}`
      return {
        id: `segment-${segment}-${index}`,
        title: STATIC_ROUTE_TITLES[currentPath] ?? formatSegmentTitle(segment),
        url: isLast ? undefined : currentPath
      }
    })

    return [homeItem, ...dynamicItems]
  }, [pathname, menuRoutes])
}

export function AppBreadcrumb({ className }: { className?: string }) {
  const items = useBreadcrumbTrail()

  if (items.length === 0) {
    return null
  }

  // Single item fallback (if any other single-level route exists)
  if (items.length === 1) {
    return (
      <div className={cn('px-4 pt-3.5 pb-2 md:px-6 md:pt-4', className)}>
        <Breadcrumb className="select-none">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
                <Home className="size-3.5" />
                <span>{items[0].title}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    )
  }

  const firstItem = items[0]
  const middleItems = items.slice(1, -1)
  const lastItem = items[items.length - 1]

  return (
    <div className={cn('px-4 pt-3.5 pb-2 md:px-6 md:pt-4', className)}>
      <Breadcrumb className="select-none">
        <BreadcrumbList>
          {/* First item: Home */}
          <BreadcrumbItem>
            {firstItem.url ? (
              <BreadcrumbLink
                render={
                  <Link<RegisteredRouter, string, string>
                    href={firstItem.url}
                    className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                  />
                }
              >
                <Home className="size-3.5" />
                <span>{firstItem.title}</span>
              </BreadcrumbLink>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Home className="size-3.5" />
                <span>{firstItem.title}</span>
              </span>
            )}
          </BreadcrumbItem>

          {/* When there are middle items */}
          {middleItems.length > 0 && (
            <>
              {/* Desktop: Render all intermediate items */}
              {middleItems.map(item => (
                <React.Fragment key={item.id}>
                  <BreadcrumbSeparator className="hidden md:inline-flex" />
                  <BreadcrumbItem className="hidden md:inline-flex">
                    {item.url ? (
                      <BreadcrumbLink
                        render={
                          <Link<RegisteredRouter, string, string>
                            href={item.url}
                            className="transition-colors hover:text-foreground"
                          />
                        }
                      >
                        {item.title}
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-muted-foreground">{item.title}</span>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}

              {/* Mobile: Collapse intermediate items into BreadcrumbEllipsis with DropdownMenu */}
              <BreadcrumbSeparator className="md:hidden" />
              <BreadcrumbItem className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label="展开路径"
                        className="flex size-5 items-center justify-center rounded-xs transition-colors hover:bg-muted"
                      />
                    }
                  >
                    <BreadcrumbEllipsis />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-32">
                    {middleItems.map(item => (
                      <DropdownMenuItem
                        key={item.id}
                        render={
                          item.url ? (
                            <Link<RegisteredRouter, string, string>
                              href={item.url}
                              className="flex w-full items-center gap-2"
                            />
                          ) : undefined
                        }
                      >
                        <span>{item.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
            </>
          )}

          {/* Last item: Current page with active highlight */}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-foreground">{lastItem.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
