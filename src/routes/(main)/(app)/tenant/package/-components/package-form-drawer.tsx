import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FolderTree } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { buildTreeIndex } from '@/components/ui/tree'
import { createPackage, getPackage, packageKeys, updatePackage, type PackageReq } from '@/lib/api/package'
import { tenantKeys } from '@/lib/api/tenant'

import { packageColumns, PackageMenuContext, type PackageRecord } from './package-columns'
import { completePackageMenuIds } from './package-menu-values'
import { toMenuTreeNodes, usePackageMenuTree } from './use-package-menu-tree'

interface PackageFormDrawerProps {
  readonly packageId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function PackageFormDrawer({ packageId, open, onClose }: PackageFormDrawerProps) {
  const queryClient = useQueryClient()
  const menuTree = usePackageMenuTree(open)
  const treeIndex = React.useMemo(() => buildTreeIndex(toMenuTreeNodes(menuTree.data ?? [])), [menuTree.data])
  return (
    <PackageMenuContext value={{ data: menuTree.data ?? [], loading: menuTree.isPending }}>
      <BetaSchemaForm<PackageRecord, typeof packageColumns>
        layoutType="DrawerForm"
        title={packageId === null ? '新增套餐' : '修改套餐'}
        width={36}
        drawerProps={{ icon: <FolderTree className="size-4" /> }}
        open={open}
        onOpenChange={next => {
          if (!next) onClose()
        }}
        columns={packageColumns}
        queryKey={packageKeys.detail(packageId)}
        request={packageId === null ? undefined : (_params, signal) => getPackage(packageId, signal)}
        onFinish={async values => {
          const body: PackageReq = {
            ...values,
            menuIds: completePackageMenuIds(values.menuIds, treeIndex.ancestorsMap, menuTree.data ?? [])
          }
          if (packageId === null) await createPackage(body)
          else await updatePackage(packageId, body)
          void queryClient.invalidateQueries({ queryKey: packageKeys.all })
          // The tenant list displays the package name.
          void queryClient.invalidateQueries({ queryKey: tenantKeys.all })
          toast.add({ title: packageId === null ? '新增成功' : '修改成功', type: 'success' })
          return true
        }}
      />
    </PackageMenuContext>
  )
}
