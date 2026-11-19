import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Bell, CircleUser, Lock, LogOut, RotateCw, Settings } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLogout } from '@/hooks/use-logout'
import { dashboardKeys, getDashboardNotices } from '@/lib/api/dashboard'
import { getInitials } from '@/lib/utils'
import { NoticeViewDrawer } from '@/routes/(main)/(app)/system/notice/-components/notice-view-drawer'
import { useAuthStore } from '@/stores/auth/auth-provider'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'

import { useShellStore } from '../shell-store'

export function HeaderIconButton({
  label,
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} {...props} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function RefreshButton() {
  const router = useRouter()
  const refresh = useShellStore(state => state.refresh)

  return (
    <HeaderIconButton
      label="刷新页面"
      onClick={() => {
        refresh()
        void router.invalidate()
      }}
    >
      <RotateCw />
    </HeaderIconButton>
  )
}

export function PreferencesButton() {
  const setOpen = useShellStore(state => state.setPreferencesOpen)

  return (
    <HeaderIconButton label="偏好设置" onClick={() => setOpen(true)}>
      <Settings />
    </HeaderIconButton>
  )
}

export function LockScreenButton() {
  const setOpen = useShellStore(state => state.setLockSetupOpen)

  return (
    <HeaderIconButton label="锁定屏幕" onClick={() => setOpen(true)}>
      <Lock />
    </HeaderIconButton>
  )
}

/**
 * Notification bell: the latest published notices from the dashboard endpoint. The request
 * only runs when the popover opens, so the header costs no request on page load.
 */
export function NotificationButton() {
  const [open, setOpen] = React.useState(false)
  const [viewId, setViewId] = React.useState<string | number | null>(null)
  const query = useQuery({
    queryKey: dashboardKeys.notices(),
    queryFn: ({ signal }) => getDashboardNotices(signal),
    enabled: open
  })
  const notices = query.data ?? []

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger
            render={<PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="通知" />} />}
          >
            <Bell />
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            通知
          </TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-medium">最新公告</span>
            <Link
              to="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              查看全部
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {query.isPending ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">加载中…</p>
            ) : notices.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">暂无公告</p>
            ) : (
              notices.map(notice => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setViewId(notice.id)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <Bell className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{notice.title}</span>
                  {notice.isTop && <span className="shrink-0 text-xs text-primary">置顶</span>}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      <NoticeViewDrawer noticeId={viewId} open={viewId !== null} onClose={() => setViewId(null)} />
    </>
  )
}

/** Current user menu: identity, department, roles, lock, preferences and logout. */
export function UserMenu({ showPreferences }: { showPreferences: boolean }) {
  const user = useAuthStore(state => state.user)
  const logout = useLogout()
  const setPreferencesOpen = useShellStore(state => state.setPreferencesOpen)
  const setLockSetupOpen = useShellStore(state => state.setLockSetupOpen)
  const { lockScreen, shortcutLock, shortcutLogout } = usePreferencesStore(
    useShallow(state => ({
      lockScreen: state.values.widget_lock_screen,
      shortcutLock: state.values.shortcut_enable && state.values.shortcut_lock_screen,
      shortcutLogout: state.values.shortcut_enable && state.values.shortcut_logout
    }))
  )

  const name = user?.nickname || user?.username || ''
  const email = user?.email ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger nativeButton={false} render={<Avatar className="hover:cursor-pointer" />}>
        <AvatarImage src={user?.avatar ?? undefined} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
        <AvatarBadge className="bg-green-600 dark:bg-green-800" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <Avatar className="size-9 rounded-lg">
            <AvatarImage src={user?.avatar ?? undefined} alt={name} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
        </div>
        {user?.deptName || user?.roleNames?.length ? (
          <div className="flex flex-wrap items-center gap-1 px-2 pb-1 text-xs text-muted-foreground">
            {user.deptName ? <span className="truncate">{user.deptName}</span> : null}
            {user.roleNames?.map(role => (
              <span key={role} className="rounded-sm border px-1">
                {role}
              </span>
            ))}
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/dashboard/profile" />}>
            <CircleUser />
            个人信息
          </DropdownMenuItem>
          {showPreferences && (
            <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
              <Settings />
              偏好设置
            </DropdownMenuItem>
          )}
          {lockScreen && (
            <DropdownMenuItem onClick={() => setLockSetupOpen(true)}>
              <Lock />
              锁定屏幕
              {shortcutLock && <DropdownMenuShortcut>Alt L</DropdownMenuShortcut>}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut />
          登出系统
          {shortcutLogout && <DropdownMenuShortcut>Alt Q</DropdownMenuShortcut>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
