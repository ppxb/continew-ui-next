import type { LucideIcon } from 'lucide-react'

import type { RouteResp } from '@/lib/api/types'

import { resolveMenuIcon } from './menu-icons'

export interface MenuItem {
  id: string
  title: string
  /** Backend path, used verbatim as the URL. */
  url: string
  icon?: LucideIcon
  /** External links open in a new tab instead of going through the router. */
  external?: boolean
  subItems?: MenuItem[]
}

export interface MenuGroup {
  id: string
  label?: string
  items: MenuItem[]
}

/** Backend menu type: 1 directory, 2 menu, 3 button. */
const TYPE_MENU = 2

/** The backend stores paths with an optional query string, for example `?tab=site`. */
export function toPathname(path: string) {
  const queryIndex = path.indexOf('?')
  return queryIndex === -1 ? path : path.slice(0, queryIndex)
}

/** Buttons carry a permission code instead of a page, and hidden nodes are details. */
function isVisible(node: RouteResp) {
  return node.type !== 3 && !node.isHidden
}

function toMenuItem(node: RouteResp): MenuItem {
  return {
    id: String(node.id),
    title: node.title,
    url: node.path,
    icon: resolveMenuIcon(node.icon),
    external: Boolean(node.isExternal)
  }
}

/** Nested directories are flattened: the sidebar renders a single sub-item level. */
function toMenuSubItems(nodes: readonly RouteResp[]): MenuItem[] {
  return nodes.filter(isVisible).flatMap(node => {
    if (node.type !== TYPE_MENU && node.children?.length) {
      return toMenuSubItems(node.children)
    }

    return [toMenuItem(node)]
  })
}

/**
 * Menu entries the app owns instead of the backend.
 *
 * `/dashboard` is a static route: it exists for every signed-in user, so it must not
 * depend on a `sys_menu` record or on the current user's permissions.
 */
export const STATIC_MENU_ITEMS: readonly MenuItem[] = [
  {
    id: 'app-dashboard',
    title: '仪表盘',
    url: '/dashboard',
    icon: resolveMenuIcon('dashboard')
  }
]

/**
 * Converts the backend menu tree into sidebar groups.
 *
 * A top-level directory becomes a labelled group, a menu becomes a link item, and a
 * directory nested inside a group becomes a collapsible parent item. Menus that sit
 * at the top level are collected into an unlabelled group in front of the rest, and
 * `staticItems` are merged into that same group so app-owned routes stay on top.
 */
export function toMenuGroups(nodes: readonly RouteResp[], staticItems: readonly MenuItem[] = []): MenuGroup[] {
  const groups: MenuGroup[] = []
  const looseItems: MenuItem[] = [...staticItems]

  for (const node of nodes.filter(isVisible)) {
    if (node.type === TYPE_MENU || !node.children?.length) {
      looseItems.push(toMenuItem(node))
      continue
    }

    const items = node.children
      .filter(isVisible)
      .map(child =>
        child.type !== TYPE_MENU && child.children?.length
          ? { ...toMenuItem(child), subItems: toMenuSubItems(child.children) }
          : toMenuItem(child)
      )

    groups.push({ id: String(node.id), label: node.title, items })
  }

  if (looseItems.length > 0) {
    groups.unshift({ id: 'root', items: looseItems })
  }

  return groups
}

/** Finds the menu entry behind a pathname, so placeholders can show its title. */
export function findMenuByPath(nodes: readonly RouteResp[], pathname: string): RouteResp | undefined {
  for (const node of nodes) {
    if (toPathname(node.path) === pathname) {
      return node
    }

    const match = node.children ? findMenuByPath(node.children, pathname) : undefined
    if (match) {
      return match
    }
  }

  return undefined
}
