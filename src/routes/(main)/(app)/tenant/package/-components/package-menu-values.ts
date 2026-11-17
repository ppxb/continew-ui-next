import { z } from 'zod'

import type { PackageMenuNode } from '@/lib/api/package'

export const packageMenuIdsRule = z.array(z.union([z.string(), z.number()])).min(1, '请选择关联菜单')

/** Preserve the original backend id types while completing the selected menus' ancestors. */
export function completePackageMenuIds(
  checkedKeys: readonly (string | number)[],
  ancestorsMap: ReadonlyMap<string, readonly string[]>,
  nodes: readonly PackageMenuNode[]
): (string | number)[] {
  const rawIds = new Map<string, string | number>()
  const visit = (items: readonly PackageMenuNode[]) => {
    for (const node of items) {
      rawIds.set(String(node.key), node.key)
      if (node.children?.length) visit(node.children)
    }
  }
  visit(nodes)
  const keys = new Set(checkedKeys.map(String))
  for (const key of keys) {
    for (const ancestor of ancestorsMap.get(key) ?? []) keys.add(String(ancestor))
  }
  return [...keys].map(key => rawIds.get(key) ?? key)
}
