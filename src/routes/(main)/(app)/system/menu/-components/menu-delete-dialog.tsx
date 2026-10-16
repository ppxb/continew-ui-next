import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { deleteMenu, menuKeys, type MenuResp } from '@/lib/api/menu'

interface MenuDeleteDialogProps {
  readonly menu: MenuResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onSuccess?: () => void
}

export function MenuDeleteDialog({ menu, open, onClose, onSuccess }: MenuDeleteDialogProps) {
  const queryClient = useQueryClient()

  const hasChildren = Boolean(menu?.children && menu.children.length > 0)

  const mutation = useMutation({
    mutationFn: (id: string | number) => deleteMenu(id),
    onSuccess: () => {
      toast.add({ title: `菜单「${menu?.title ?? ''}」已删除`, type: 'success' })
      void queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
      onSuccess?.()
      onClose()
    },
    onError: error => {
      toast.add({
        title: error instanceof Error ? error.message : '删除失败，请重试',
        type: 'error'
      })
    }
  })

  const handleDelete = () => {
    if (!menu?.id) return
    mutation.mutate(menu.id)
  }

  return (
    <AlertDialog open={open} onOpenChange={val => !val && !mutation.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除菜单</AlertDialogTitle>
          <AlertDialogDescription>
            {hasChildren ? (
              <span className="block space-y-1">
                <span className="font-medium text-destructive">
                  菜单「{menu?.title}」下包含 {menu?.children?.length} 个子菜单或按钮，无法直接删除。
                </span>
                <span className="block text-xs text-muted-foreground">
                  请先删除或转移其所有下级菜单和按钮节点后，再执行删除操作。
                </span>
              </span>
            ) : (
              `确定要删除菜单「${menu?.title ?? ''}」吗？删除后配置将立即失效，此操作不可撤回。`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>取消</AlertDialogCancel>
          {!hasChildren && (
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Spinner className="mr-1.5 size-3.5" />
                  删除中…
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
