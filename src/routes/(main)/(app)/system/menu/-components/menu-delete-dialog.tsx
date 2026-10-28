import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { deleteMenu, menuKeys, type MenuResp } from '@/lib/api/menu'
import { reportError } from '@/lib/http'

interface MenuDeleteDialogProps {
  readonly menu: MenuResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function MenuDeleteDialog({ menu, open, onClose }: MenuDeleteDialogProps) {
  const queryClient = useQueryClient()

  const childCount = menu?.children?.length ?? 0
  const hasChildren = childCount > 0

  const mutation = useMutation({
    mutationFn: (target: MenuResp) => deleteMenu(target.id),
    onSuccess: (_result, target) => {
      toast.add({ title: `菜单「${target.title}」已删除`, type: 'success' })
      void queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
      onClose()
    },
    onError: error => reportError(error, '删除失败，请重试')
  })

  const handleDelete = () => {
    if (menu) mutation.mutate(menu)
  }

  return (
    <AlertDialog open={open} onOpenChange={val => !val && !mutation.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>删除菜单</AlertDialogTitle>
          <AlertDialogDescription>
            {hasChildren ? (
              <span className="block space-y-1">
                <span className="font-medium text-destructive">
                  菜单「{menu?.title}」下包含 {childCount} 个子菜单或按钮，无法直接删除。
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
                  <Spinner />
                  删除中
                </>
              ) : (
                '删除'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
