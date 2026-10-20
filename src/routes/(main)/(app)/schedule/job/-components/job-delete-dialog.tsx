import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { Trash2 } from 'lucide-react'

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
import { deleteJob, jobKeys, type JobResp } from '@/lib/api/job'

interface JobDeleteDialogProps {
  /** The job being deleted, or `null` before one is picked. */
  readonly job: JobResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Confirms deleting one job. */
export function JobDeleteDialog({ job, open, onClose }: JobDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [lastJob, setLastJob] = React.useState<JobResp | null>(null)

  React.useEffect(() => {
    if (job) {
      setLastJob(job)
    }
  }, [job])

  const shownJob = job ?? lastJob

  const handleDelete = async () => {
    if (job === null) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteJob(job.id)

      onClose()
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
      toast.add({ title: '删除成功', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-delete would leave the request in flight with no way to report it.
        if (!nextOpen && !isDeleting) {
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>删除任务</AlertDialogTitle>
          <AlertDialogDescription>
            {shownJob
              ? `是否确定删除任务「${shownJob.jobName}」？删除后不可恢复`
              : '是否确定删除该任务？删除后不可恢复'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={() => void handleDelete()}>
            {isDeleting ? (
              <>
                <Spinner />
                删除中
              </>
            ) : (
              '删除'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
