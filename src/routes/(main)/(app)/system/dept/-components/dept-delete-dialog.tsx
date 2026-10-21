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
import { deleteDept, deptKeys, type DeptResp } from '@/lib/api/dept'
import { reportError } from '@/lib/http'

interface DeptDeleteDialogProps {
  readonly dept: DeptResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onSuccess?: () => void
}

export function DeptDeleteDialog({ dept, open, onClose, onSuccess }: DeptDeleteDialogProps) {
  const queryClient = useQueryClient()

  const hasChildren = Boolean(dept?.children && dept.children.length > 0)
  const isSystem = Boolean(dept?.isSystem)

  const mutation = useMutation({
    mutationFn: (id: string | number) => deleteDept(id),
    onSuccess: () => {
      toast.add({ title: `部门「${dept?.name ?? ''}」已删除`, type: 'success' })
      void queryClient.invalidateQueries({ queryKey: deptKeys.all })
      onSuccess?.()
      onClose()
    },
    onError: error => reportError(error, '删除失败，请重试')
  })

  const handleDelete = () => {
    if (!dept?.id || hasChildren || isSystem) return
    mutation.mutate(dept.id)
  }

  const cannotDelete = hasChildren || isSystem

  return (
    <AlertDialog open={open} onOpenChange={val => !val && !mutation.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除部门</AlertDialogTitle>
          <AlertDialogDescription>
            {isSystem ? (
              <span className="block space-y-1">
                <span className="font-medium text-destructive">部门「{dept?.name}」是系统内置部门，无法删除。</span>
                <span className="block text-xs text-muted-foreground">内置组织机构用于保障系统基础业务逻辑运转。</span>
              </span>
            ) : hasChildren ? (
              <span className="block space-y-1">
                <span className="font-medium text-destructive">
                  部门「{dept?.name}」下包含 {dept?.children?.length} 个下级部门，无法直接删除。
                </span>
                <span className="block text-xs text-muted-foreground">
                  请先删除或转移其所有下级部门节点后，再执行删除操作。
                </span>
              </span>
            ) : (
              `确定要删除部门「${dept?.name ?? ''}」吗？删除后该部门将从组织架构中移除，此操作不可撤回。`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>取消</AlertDialogCancel>
          {!cannotDelete && (
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
