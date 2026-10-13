import { Link } from '@tanstack/react-router'

import { Command } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { APP_CONFIG } from '@/config/app-config'
import { useMenuGroups } from '@/hooks/use-menu'
import { useAuthStore } from '@/stores/auth/auth-provider'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'

import { NavMain } from './nav-main'
import { NavUser } from './nav-user'
import { SupportCard } from './support-card'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow(s => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced
    }))
  )
  const user = useAuthStore(s => s.user)
  const { groups } = useMenuGroups()

  const variant = isSynced ? sidebarVariant : props.variant
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/dashboard/default" />}>
              <Command />
              <span className="text-base font-semibold">{APP_CONFIG.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="scroll-fade-y">
        <NavMain items={groups} />
      </SidebarContent>
      <SidebarFooter>
        <SupportCard />
        <NavUser
          user={{
            name: user?.nickname || user?.username || '',
            email: user?.email ?? '',
            avatar: user?.avatar ?? ''
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
