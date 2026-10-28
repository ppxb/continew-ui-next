import * as React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef, type PaginationState, type RowSelectionState, useTable } from '@tanstack/react-table'

import { Plus, Trash2, Users } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { PaginationArrow } from '@/components/pagination-arrow'
import { QueryState } from '@/components/query-state'
import { StatusCell } from '@/components/status-cell'
import { TableSearch } from '@/components/table-search'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DrawerFooter } from '@/components/ui/drawer'
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useLastRecord } from '@/hooks/use-last-record'
import { listRoleUsers, roleKeys, type RoleResp, type RoleUserResp, unassignRoleFromUsers } from '@/lib/api/role'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import { dataTableFeatures, type DataTableFeatures } from '@/lib/data-table-features'

import { RoleUserAddDialog } from './role-user-add-dialog'

const EMPTY_MEMBERS: RoleUserResp[] = []

interface RoleUserDrawerProps {
  readonly role: RoleResp | null
  readonly open: boolean
  readonly onClose: () => void
}

interface MemberColumnOptions {
  readonly isUnassigning: boolean
  readonly onUnassign: (member: RoleUserResp) => void
}

function createMemberColumns({
  isUnassigning,
  onUnassign
}: MemberColumnOptions): ColumnDef<DataTableFeatures, RoleUserResp>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => {
        const isAll = table.getIsAllPageRowsSelected()
        const isSome = table.getIsSomePageRowsSelected()

        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={isAll}
              indeterminate={!isAll && isSome}
              onCheckedChange={value => table.toggleAllPageRowsSelected(Boolean(value))}
            />
          </div>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(Boolean(value))} />
        </div>
      ),
      enableSorting: false,
      size: 36
    },
    {
      accessorKey: 'nickname',
      header: '用户',
      cell: ({ row }) => {
        const user = row.original
        const name = user.nickname || user.username

        return (
          <div className="flex flex-col leading-tight">
            <span>{name}</span>
            <span>{user.username}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'deptName',
      header: '所属部门',
      cell: ({ row }) => <span>{row.original.deptName || EMPTY_PLACEHOLDER}</span>
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusCell status={row.original.status} />
    },
    {
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Button variant="destructive" size="sm" disabled={isUnassigning} onClick={() => onUnassign(row.original)}>
            取消授权
          </Button>
        </div>
      )
    }
  ]
}

export function RoleUserDrawer({ role, open, onClose }: RoleUserDrawerProps) {
  const queryClient = useQueryClient()
  const shownRole = useLastRecord(role)
  const roleId = shownRole?.id ?? null

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [keyword, setKeyword] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isUnassigning, setIsUnassigning] = React.useState(false)

  // Reset on close, so reopening never starts from a stale keyword, page or selection.
  React.useEffect(() => {
    if (open) return

    setPagination({ pageIndex: 0, pageSize: 10 })
    setRowSelection({})
    setKeyword('')
  }, [open])

  const memberParams = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    description: keyword || undefined
  }

  const query = useQuery({
    queryKey: roleKeys.users(roleId, memberParams),
    queryFn: ({ signal }) => {
      if (!roleId) return Promise.resolve({ list: [], total: 0 })
      return listRoleUsers(roleId, memberParams, signal)
    },
    enabled: open && roleId !== null
  })

  const total = query.data?.total ?? 0
  const pageCount = Math.max(Math.ceil(total / pagination.pageSize), 1)

  /** One refresh covers the member list, the cached ids and the "already in the role" marks. */
  const refreshMembers = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: roleKeys.usersRoot(roleId) })
    void queryClient.invalidateQueries({ queryKey: roleKeys.userIds(roleId) })
  }, [queryClient, roleId])

  const handleUnassignSingle = React.useCallback(
    async (member: RoleUserResp) => {
      setIsUnassigning(true)
      try {
        await unassignRoleFromUsers([member.id])
        toast.add({ title: '已取消成员角色授权', type: 'success' })
        refreshMembers()
      } catch {
        // The HTTP layer already reported the failure.
      } finally {
        setIsUnassigning(false)
      }
    },
    [refreshMembers]
  )

  const handleUnassignBatch = async () => {
    const selectedIds = Object.keys(rowSelection)
    if (selectedIds.length === 0) return

    setIsUnassigning(true)
    try {
      await unassignRoleFromUsers(selectedIds)
      toast.add({ title: `已批量取消 ${selectedIds.length} 名成员授权`, type: 'success' })
      setRowSelection({})
      refreshMembers()
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsUnassigning(false)
    }
  }

  const handleSearch = (next: string) => {
    setKeyword(next)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }

  const columns = React.useMemo(
    () => createMemberColumns({ isUnassigning, onUnassign: handleUnassignSingle }),
    [isUnassigning, handleUnassignSingle]
  )

  const table = useTable({
    features: dataTableFeatures,
    data: query.data?.list ?? EMPTY_MEMBERS,
    columns,
    state: { pagination, rowSelection },
    manualPagination: true,
    rowCount: total,
    pageCount,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getRowId: row => String(row.id)
  })

  const selectedCount = Object.keys(rowSelection).length

  return (
    <>
      <EntityDrawer
        open={open}
        onClose={onClose}
        title="角色成员管理"
        icon={<Users className="size-4" />}
        badge={shownRole ? <Badge variant="secondary">{shownRole.name}</Badge> : undefined}
        width={40}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-56">
              <TableSearch className="h-8 md:w-full" placeholder="搜索用户名" onSearch={handleSearch} />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus />
                添加成员
              </Button>
              <Button
                variant="destructive"
                disabled={selectedCount === 0 || isUnassigning}
                onClick={handleUnassignBatch}
              >
                <Trash2 />
                批量取消授权
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} className={row.getIsSelected() ? 'bg-muted/30' : undefined}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="py-2.5 text-xs">
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : query.isPending ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={columns.length} className="py-3">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : query.isError ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32">
                      <QueryState state="error" onRetry={() => void query.refetch()} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32">
                      <QueryState state="empty" title="暂无成员数据" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span>共 {total} 名成员</span>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationArrow
                      direction="previous"
                      text="上一页"
                      disabled={!table.getCanPreviousPage()}
                      onClick={() => table.previousPage()}
                    />
                  </PaginationItem>
                  <span className="tabular-nums">
                    {pagination.pageIndex + 1} / {pageCount}
                  </span>
                  <PaginationItem>
                    <PaginationArrow
                      direction="next"
                      text="下一页"
                      disabled={!table.getCanNextPage()}
                      onClick={() => table.nextPage()}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        <DrawerFooter className="flex-row justify-end border-t p-4">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DrawerFooter>
      </EntityDrawer>

      <RoleUserAddDialog role={role} open={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={refreshMembers} />
    </>
  )
}
