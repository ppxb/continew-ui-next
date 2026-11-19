import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { useLastRecord } from '@/hooks/use-last-record'
import { MENU_QUERY_KEY } from '@/hooks/use-menu'
import { deleteMenu, menuKeys, type MenuResp } from '@/lib/api/menu'

interface MenuDeleteDialogProps {
  readonly menu: MenuResp | null
  /** The full (unfiltered) menu tree used to count real children; falls back to `menu` itself. */
  readonly allMenus?: MenuResp[]
  readonly open: boolean
  readonly onClose: () => void
}

/** Returns the node with the matching id inside `tree`, or `null`. */
function findMenu(nodes: MenuResp[], id: MenuResp['id']): MenuResp | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const hit = node.children?.length ? findMenu(node.children, id) : null
    if (hit) return hit
  }
  return null
}

export function MenuDeleteDialog({ menu, allMenus, open, onClose }: MenuDeleteDialogProps) {
  const shownMenu = useLastRecord(menu)

  // The filtered row keeps only matching children; count children on the unfiltered
  // tree so a search that hides child nodes can't make the delete look safe.
  const shownInFullTree = shownMenu && allMenus ? (findMenu(allMenus, shownMenu.id) ?? shownMenu) : shownMenu
  const childCount = shownInFullTree?.children?.length ?? 0
  const hasChildren = childCount > 0

  const description = hasChildren ? (
    <span className="block space-y-1">
      <span className="font-medium text-destructive">
        菜单「{shownMenu?.title}」下包含 {childCount} 个子菜单或按钮，无法直接删除。
      </span>
      <span className="block text-xs text-muted-foreground">
        请先删除或转移其所有下级菜单和按钮节点后，再执行删除操作。
      </span>
    </span>
  ) : (
    `确定要删除菜单「${shownMenu?.title ?? ''}」吗？删除后配置将立即失效，此操作不可撤回。`
  )

  return (
    <DeleteConfirmDialog
      open={open}
      onClose={onClose}
      title="删除菜单"
      description={description}
      disabled={!menu}
      showConfirm={!hasChildren}
      action={async () => {
        if (menu && !hasChildren) await deleteMenu(menu.id)
      }}
      invalidateKeys={[menuKeys.trees(), MENU_QUERY_KEY]}
      errorMessage="删除失败，请重试"
      successMessage={menu ? `菜单「${menu.title}」已删除` : null}
    />
  )
}
