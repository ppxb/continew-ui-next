import { http } from '@/lib/http'

/**
 * A node of `GET /system/dept/tree`.
 *
 * The backend serializes Hutool's `Tree`, so departments arrive nested under `children`.
 * Ids follow the same big-number rule as everywhere else, which is why they stay untyped
 * as `string | number` instead of being narrowed.
 */
export interface DeptTreeNode {
  id: string | number
  parentId: string | number | null
  name: string
  children?: DeptTreeNode[]
}

/** One flattened department, tagged with its depth for indented display. */
export interface DeptOption {
  id: string | number
  name: string
  depth: number
}

/** The whole department tree. There is no flat list endpoint for departments. */
export function getDeptTree() {
  return http.get<DeptTreeNode[]>('/system/dept/tree')
}

/** Flattens the tree in display order, parents before their children. */
export function flattenDepts(nodes: DeptTreeNode[], depth = 0): DeptOption[] {
  return nodes.flatMap(node => [
    { id: node.id, name: node.name, depth },
    ...flattenDepts(node.children ?? [], depth + 1)
  ])
}

export { deptKeys } from '@/lib/query-keys'
