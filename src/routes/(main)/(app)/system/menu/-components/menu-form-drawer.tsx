import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { MENU_QUERY_KEY } from '@/hooks/use-menu'
import { createMenu, getMenu, menuKeys, type MenuResp, updateMenu } from '@/lib/api/menu'

import { menuColumns, toMenuPayload } from './menu-columns'

interface MenuFormDrawerProps {
  readonly menuId: string | number | null
  readonly defaultParentId?: string | number | null
  readonly open: boolean
  readonly onClose: () => void
  readonly menuTree: MenuResp[]
}

export function MenuFormDrawer({ menuId, defaultParentId, open, onClose, menuTree }: MenuFormDrawerProps) {
  const queryClient = useQueryClient()
  const columns = React.useMemo(() => menuColumns({ menuTree, menuId }), [menuTree, menuId])
  return <BetaSchemaForm<MenuResp, typeof columns> layoutType="DrawerForm" title={menuId === null ? '新增菜单' : '修改菜单'}
    width={32} grid open={open} onOpenChange={next => { if (!next) onClose() }} columns={columns}
    initialValues={{ parentId: defaultParentId ?? null }} queryKey={menuKeys.detail(menuId)}
    request={menuId === null ? undefined : (_params, signal) => getMenu(menuId, signal)}
    onFinish={async values => {
      const payload = toMenuPayload(values)
      if (menuId === null) await createMenu(payload)
      else await updateMenu(menuId, payload)
      toast.add({ title: menuId === null ? '新增菜单成功' : '修改菜单成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
      void queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY })
      return true
    }}
  />
}
