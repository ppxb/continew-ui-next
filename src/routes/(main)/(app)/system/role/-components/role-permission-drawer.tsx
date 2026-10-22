import * as React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { KeyRound } from 'lucide-react'

import { type CheckableTreeNode, CheckableTree } from '@/components/checkable-tree'
import { EntityDrawer } from '@/components/entity-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
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
    const typeLabel = isDir ? '目录' : isMenu ? '菜单' : isBtn ? '按钮' : null

    return {
      id: String(node.id),
      parentId: node.parentId ? String(node.parentId) : null,
      label: node.title,
      searchTerms: node.permission ?? '',
      tag: typeLabel ? (
        <Badge variant="secondary" className="font-normal">
          {typeLabel}
        </Badge>
      ) : null,
      subtitle: node.permission ? (
        <Badge variant="secondary" className="text-[11px] font-normal">
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

  const detail = useRoleDetail(roleId, { enabled: open, refreshOnOpen: true })

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

  const isLoading = detail.isPending || detail.fetchStatus !== 'idle' || permTree.isPending
  const isLoadError = !isLoading && (detail.isError || permTree.isError)

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title="分配功能权限"
      icon={<KeyRound className="size-4" />}
      width={36}
      closeDisabled={isSubmitting}
      canClose={() => !isSubmitting}
    >

        {isLoading ? (
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isLoadError ? (
          <p className="p-4 text-sm text-foreground">加载失败，请稍后重试</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              {/* Strictly check setting */}
              <div className="shrink-0 rounded-md border bg-muted/30 p-3">
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
              <CheckableTree
                data={treeNodes}
                checkedKeys={selectedMenuIds}
                onCheckedChange={setSelectedMenuIds}
                checkStrictly={menuCheckStrictly}
                searchPlaceholder="搜索菜单或权限名"
                fillHeight
              />
            </div>

            <DrawerFooter className="shrink-0 flex-row justify-end gap-2 border-t p-4">
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
    </EntityDrawer>
  )
}
