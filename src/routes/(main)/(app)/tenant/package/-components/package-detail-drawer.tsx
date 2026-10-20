import type { ReactNode } from 'react'

import { useQuery } from '@tanstack/react-query'

import { cn } from 'cn'
import { FolderTree, X } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { StatusCell } from '@/components/status-cell'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { type TreeNodeData, Tree } from '@/components/ui/tree'
import { getPackageMenuTree, packageKeys, type PackageMenuNode } from '@/lib/api/package'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { usePackageDetail } from './use-package-detail'

/** Menus barely change, so they stay cached between openings. */
const LOOKUP_STALE_MS = 5 * 60_000

function DetailField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm wrap-break-word text-foreground">{children}</dd>
    </div>
  )
}

function toTreeNodes(nodes: PackageMenuNode[]): TreeNodeData[] {
  return nodes.map(node => ({
    id: String(node.id),
    parentId: node.parentId === null || node.parentId === undefined ? null : String(node.parentId),
    label: node.title,
    children: node.children?.length ? toTreeNodes(node.children) : undefined
  }))
}

function PackageDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
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
  const menuTree = useQuery({
    queryKey: packageKeys.menus(),
    queryFn: getPackageMenuTree,
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const treeNodes = toTreeNodes(menuTree.data ?? [])
  const pkg = detail.data
  const isLoading = detail.isPending || menuTree.isPending

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:40rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <FolderTree className="size-4" />
            <DrawerTitle>套餐详情</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {isLoading ? (
            <PackageDetailSkeleton />
          ) : detail.isError || !pkg ? (
            <p className="text-sm text-foreground">加载失败，请稍后重试</p>
          ) : (
            <div className="flex flex-col gap-6">
              <section>
                <h3 className="mb-3 text-sm font-medium text-foreground">基础信息</h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <DetailField label="ID" className="sm:col-span-2">
                    <CopyableText value={String(pkg.id)} />
                  </DetailField>
                  <DetailField label="名称">{pkg.name || EMPTY_PLACEHOLDER}</DetailField>
                  <DetailField label="排序">{pkg.sort ?? EMPTY_PLACEHOLDER}</DetailField>
                  <DetailField label="状态">
                    <StatusCell status={pkg.status} />
                  </DetailField>
                  <div />
                  <DetailField label="创建人">{pkg.createUserString || EMPTY_PLACEHOLDER}</DetailField>
                  <DetailField label="创建时间">{pkg.createTime || EMPTY_PLACEHOLDER}</DetailField>
                  <DetailField label="修改人">{pkg.updateUserString || EMPTY_PLACEHOLDER}</DetailField>
                  <DetailField label="修改时间">{pkg.updateTime || EMPTY_PLACEHOLDER}</DetailField>
                  <DetailField label="描述" className="sm:col-span-2">
                    {pkg.description || EMPTY_PLACEHOLDER}
                  </DetailField>
                </dl>
              </section>

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
      </DrawerContent>
    </Drawer>
  )
}
