import { useQuery } from '@tanstack/react-query'

import type { TreeNodeData } from '@/components/ui/tree'
import { getPackageMenuTree, packageKeys, type PackageMenuNode } from '@/lib/api/package'

/** Menus barely change, so they stay cached between openings. */
const LOOKUP_STALE_MS = 5 * 60_000

export function usePackageMenuTree(enabled: boolean) {
  return useQuery({
    queryKey: packageKeys.menus(),
    queryFn: ({ signal }) => getPackageMenuTree(signal),
    staleTime: LOOKUP_STALE_MS,
    enabled
  })
}

/** Maps the backend's simple tree onto the tree component's node shape. */
export function toMenuTreeNodes(nodes: PackageMenuNode[]): TreeNodeData[] {
  return nodes.map(node => ({
    id: String(node.key),
    parentId: node.parentId === null || node.parentId === undefined ? null : String(node.parentId),
    label: node.title,
    children: node.children?.length ? toMenuTreeNodes(node.children) : undefined
  }))
}
