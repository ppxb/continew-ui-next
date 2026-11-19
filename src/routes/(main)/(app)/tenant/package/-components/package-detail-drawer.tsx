import { FolderTree } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { QueryState } from '@/components/query-state'
import { ProDescriptions } from '@/components/pro'
import { Skeleton } from '@/components/ui/skeleton'
import { Tree } from '@/components/ui/tree'
import { useLastRecord } from '@/hooks/use-last-record'

import { packageColumns, type PackageRecord } from './package-columns'
import { toMenuTreeNodes, usePackageMenuTree } from './use-package-menu-tree'
import { usePackageDetail } from './use-package-detail'

function PackageDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <ProDescriptions columns={packageColumns} loading title="基础信息" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

interface PackageDetailDrawerProps {
  /** The package to show, or `null` before the first one is picked. */
  readonly packageId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Read-only detail panel for one package, with its menu grants shown as a checked tree. */
export function PackageDetailDrawer({ packageId, open, onClose }: PackageDetailDrawerProps) {
  const detail = usePackageDetail(packageId, { enabled: open })
  const menuTree = usePackageMenuTree(open)

  const treeNodes = toMenuTreeNodes(menuTree.data ?? [])
  // Keep the last package during the close animation, when the id is already null and the
  // query has collapsed to a pending state that would otherwise flash the skeleton.
  const lastPkg = useLastRecord(detail.data ?? null)
  const pkg = detail.data ?? (open ? null : lastPkg)
  const isLoading = (detail.isPending || menuTree.isPending) && !pkg

  return (
    <EntityDrawer open={open} onClose={onClose} title="套餐详情" icon={<FolderTree className="size-4" />} width={40}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {isLoading ? (
          <PackageDetailSkeleton />
        ) : detail.isError || !pkg ? (
          <QueryState state="error" onRetry={() => void detail.refetch()} />
        ) : (
          <div className="flex flex-col gap-6">
            <ProDescriptions<PackageRecord> columns={packageColumns} dataSource={pkg} title="基础信息" />

            <section>
              <h3 className="mb-3 text-sm font-medium text-foreground">关联菜单</h3>
              <div className="max-h-96 overflow-auto overscroll-contain rounded-md border bg-background/50 p-1.5">
                <Tree
                  data={treeNodes}
                  checkable
                  checkedKeys={(pkg.menuIds ?? []).map(String)}
                  defaultExpandAll
                  emptyText="该套餐尚未关联菜单"
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </EntityDrawer>
  )
}
