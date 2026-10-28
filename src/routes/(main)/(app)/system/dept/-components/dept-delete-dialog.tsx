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
import { useLastRecord } from '@/hooks/use-last-record'
import { deleteDept, deptKeys, type DeptResp } from '@/lib/api/dept'
import { reportError } from '@/lib/http'

interface DeptDeleteDialogProps {
  readonly dept: DeptResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function DeptDeleteDialog({ dept, open, onClose }: DeptDeleteDialogProps) {
  const queryClient = useQueryClient()
  const shownDept = useLastRecord(dept)

  const childCount = shownDept?.children?.length ?? 0
  const hasChildren = childCount > 0
  const isSystem = Boolean(shownDept?.isSystem)
  const cannotDelete = hasChildren || isSystem

  const mutation = useMutation({
    mutationFn: (target: DeptResp) => deleteDept(target.id),
    onSuccess: (_result, target) => {
      toast.add({ title: `部门「${target.name}」已删除`, type: 'success' })
      void queryClient.invalidateQueries({ queryKey: deptKeys.all })
      onClose()
    },
    onError: error => reportError(error, '删除失败，请重试')
  })

  const handleDelete = () => {
    if (dept && !cannotDelete) mutation.mutate(dept)
  }

  return (
    <AlertDialog open={open} onOpenChange={val => !val && !mutation.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>删除部门</AlertDialogTitle>
          <AlertDialogDescription>
            {isSystem ? (
              <span className="block space-y-1">
                <span className="font-medium text-destructive">
                  部门「{shownDept?.name}」是系统内置部门，无法删除。
                </span>
                <span className="block text-xs text-muted-foreground">内置组织机构用于保障系统基础业务逻辑运转。</span>
              </span>
            ) : hasChildren ? (
              <span className="block space-y-1">
                <span className="font-medium text-destructive">
                  部门「{shownDept?.name}」下包含 {childCount} 个下级部门，无法直接删除。
                </span>
                <span className="block text-xs text-muted-foreground">
                  请先删除或转移其所有下级部门节点后，再执行删除操作。
                </span>
              </span>
            ) : (
              `确定要删除部门「${shownDept?.name ?? ''}」吗？删除后该部门将从组织架构中移除，此操作不可撤回。`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>取消</AlertDialogCancel>
          {!cannotDelete && (
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
