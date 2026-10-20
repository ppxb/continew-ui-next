import { Link } from '@tanstack/react-router'

import { CircleUser, LogOut } from 'lucide-react'

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/hooks/use-logout'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth/auth-provider'

/** Fallback avatar when the user does not have an avatar set. */
const AVATAR_URL = 'https://github.com/shadcn.png'

/** Current user menu: identity, department, roles and logout. */
export function UserMenu() {
  const user = useAuthStore(state => state.user)
  const logout = useLogout()

  const name = user?.nickname || user?.username || ''
  const email = user?.email ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger nativeButton={false} render={<Avatar className="hover:cursor-pointer" />}>
        <AvatarImage src={user?.avatar || AVATAR_URL} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
        <AvatarBadge className="bg-green-600 dark:bg-green-800" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <Avatar className="size-9 rounded-lg">
            <AvatarImage src={user?.avatar || AVATAR_URL} alt={name} />
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut />
          登出系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
