import * as React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { KeyRound, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import {
  listRolePermissionTree,
  roleKeys,
  type RolePermissionResp,
  type RoleResp,
  updateRolePermission
} from '@/lib/api/role'

import { type CheckableTreeNode, RoleCheckableTree } from './role-checkable-tree'
import { useRoleDetail } from './use-role-detail'

interface RolePermissionDrawerProps {
  readonly role: RoleResp | null
  readonly open: boolean
  readonly onClose: () => void
}

function toCheckablePermissionNodes(nodes: RolePermissionResp[]): CheckableTreeNode[] {
  return nodes.map(node => {
    const isDir = Number(node.type) === 1
    const isMenu = Number(node.type) === 2
    const isBtn = Number(node.type) === 3

    return {
      id: String(node.id),
      parentId: node.parentId ? String(node.parentId) : null,
      label: node.title,
      searchTerms: node.permission ?? '',
      tag: isDir ? (
        <Badge variant="secondary" className="h-4.5 shrink-0 px-1.5 py-0 text-[10px] font-normal">
          目录
        </Badge>
      ) : isMenu ? (
        <Badge
          variant="outline"
          className="h-4.5 shrink-0 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-normal text-emerald-600 dark:text-emerald-400"
        >
          菜单
        </Badge>
      ) : isBtn ? (
        <Badge
          variant="outline"
          className="h-4.5 shrink-0 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-normal text-primary"
        >
          按钮
        </Badge>
      ) : null,
      subtitle: node.permission ? (
        <Badge
          variant="outline"
          className="h-4.5 max-w-32.5 shrink-0 truncate border-border/60 bg-muted/40 px-1.5 py-0 font-mono text-[10px] font-normal text-muted-foreground sm:max-w-none"
        >
          {node.permission}
        </Badge>
      ) : null,
      children: node.children?.length ? toCheckablePermissionNodes(node.children) : undefined
    }
  })
}

export function RolePermissionDrawer({ role, open, onClose }: RolePermissionDrawerProps) {
  const queryClient = useQueryClient()
  const roleId = role?.id ?? null

  const detail = useRoleDetail(roleId, { enabled: open, alwaysRefetch: true })

  const permTree = useQuery({
    queryKey: roleKeys.permissions(),
    queryFn: listRolePermissionTree,
    staleTime: 5 * 60_000,
    enabled: open
  })

  const [selectedMenuIds, setSelectedMenuIds] = React.useState<Array<string | number>>([])
  const [menuCheckStrictly, setMenuCheckStrictly] = React.useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)

  // Initialize selected menu IDs and checkStrictly mode when detail data arrives
  React.useEffect(() => {
    if (open && detail.data) {
      setSelectedMenuIds((detail.data.menuIds ?? []).map(String))
      setMenuCheckStrictly(Boolean(detail.data.menuCheckStrictly))
    }
  }, [open, detail.data])

  const treeNodes = React.useMemo(() => {
    return toCheckablePermissionNodes(permTree.data ?? [])
  }, [permTree.data])

  const handleSave = async () => {
    if (!roleId) return

    setIsSubmitting(true)
    try {
      await updateRolePermission(roleId, {
        roleId,
        menuIds: selectedMenuIds,
        menuCheckStrictly
      })

      toast.add({ title: '修改功能权限成功', type: 'success' })
      onClose()
      void queryClient.invalidateQueries({ queryKey: roleKeys.all })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = detail.isPending || permTree.isPending

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !isSubmitting) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:36rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4" />
            <DrawerTitle>分配功能权限</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" aria-label="关闭" />}>
            <X className="size-4" />
          </DrawerClose>
        </DrawerHeader>

        {isLoading ? (
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {/* Strictly check setting */}
              <div className="rounded-md border bg-muted/30 p-3">
                <Field orientation="horizontal" className="items-center justify-between">
                  <FieldContent>
                    <FieldLabel className="text-xs">父子联动</FieldLabel>
                    <FieldDescription className="text-[11px]">
                      {menuCheckStrictly ? '已开启独立选择（不联动）' : '勾选上级菜单时自动全选子菜单与操作按钮'}
                    </FieldDescription>
                  </FieldContent>
                  <Switch checked={!menuCheckStrictly} onCheckedChange={checked => setMenuCheckStrictly(!checked)} />
                </Field>
              </div>

              {/* Checkable Tree */}
              <RoleCheckableTree
                data={treeNodes}
                checkedKeys={selectedMenuIds}
                onCheckedChange={setSelectedMenuIds}
                checkStrictly={menuCheckStrictly}
                searchPlaceholder="搜索菜单标题或权限标识..."
                className="flex-1"
              />
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
                取消
              </Button>
              <Button type="button" disabled={isSubmitting} onClick={handleSave}>
                {isSubmitting ? (
                  <>
                    <Spinner />
                    保存中
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
