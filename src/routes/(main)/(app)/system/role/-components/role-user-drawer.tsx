import * as React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef, type PaginationState, type RowSelectionState, useTable } from '@tanstack/react-table'

import { Plus, Search, Trash2, Users, UserX, X } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { listRoleUsers, roleKeys, type RoleResp, type RoleUserResp, unassignRoleFromUsers } from '@/lib/api/role'
import { dataTableFeatures, type DataTableFeatures } from '@/lib/data-table-features'
import { getInitials } from '@/lib/utils'

import { RoleUserAddDialog } from './role-user-add-dialog'

const EMPTY_MEMBERS: RoleUserResp[] = []

interface RoleUserDrawerProps {
  readonly role: RoleResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function RoleUserDrawer({ role, open, onClose }: RoleUserDrawerProps) {
  const queryClient = useQueryClient()
  const roleId = role?.id ?? null

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [searchInput, setSearchInput] = React.useState('')
  const [keyword, setKeyword] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isUnassigning, setIsUnassigning] = React.useState(false)

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim())
      setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset pagination & selection on open
  React.useEffect(() => {
    if (open) {
      setPagination({ pageIndex: 0, pageSize: 10 })
      setRowSelection({})
      setSearchInput('')
      setKeyword('')
    }
  }, [open, roleId])

  const query = useQuery({
    queryKey: roleKeys.users(roleId, {
      page: pagination.pageIndex + 1,
      size: pagination.pageSize,
      description: keyword || undefined
    }),
    queryFn: () => {
      if (!roleId) return Promise.resolve({ list: [], total: 0 })
      return listRoleUsers(roleId, {
        page: pagination.pageIndex + 1,
        size: pagination.pageSize,
        description: keyword || undefined
      })
    },
    enabled: open && roleId !== null
  })

  const total = query.data?.total ?? 0
  const pageCount = Math.max(Math.ceil(total / pagination.pageSize), 1)

  const handleUnassignSingle = React.useCallback(
    async (member: RoleUserResp) => {
      setIsUnassigning(true)
      try {
        await unassignRoleFromUsers([member.id])
        toast.add({ title: '已取消成员角色授权', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: roleKeys.users(roleId) })
        void queryClient.invalidateQueries({ queryKey: roleKeys.userIds(roleId) })
      } catch {
        // Handled by HTTP layer
      } finally {
        setIsUnassigning(false)
      }
    },
    [queryClient, roleId]
  )

  const handleUnassignBatch = async () => {
    const selectedIds = Object.keys(rowSelection)
    if (selectedIds.length === 0) return

    setIsUnassigning(true)
    try {
      await unassignRoleFromUsers(selectedIds)
      toast.add({ title: `已批量取消 ${selectedIds.length} 名成员授权`, type: 'success' })
      setRowSelection({})
      void queryClient.invalidateQueries({ queryKey: roleKeys.users(roleId) })
      void queryClient.invalidateQueries({ queryKey: roleKeys.userIds(roleId) })
    } catch {
      // Handled by HTTP layer
    } finally {
      setIsUnassigning(false)
    }
  }

  const columns = React.useMemo<ColumnDef<DataTableFeatures, RoleUserResp>[]>(() => {
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
                aria-label="全选"
                className="size-3.5"
              />
            </div>
          )
        },
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={value => row.toggleSelected(Boolean(value))}
              aria-label="选择"
              className="size-3.5"
            />
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
            <div className="flex items-center gap-2.5">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium text-foreground">{name}</span>
                <span className="text-[11px] text-muted-foreground">{user.username}</span>
              </div>
            </div>
          )
        }
      },
      {
        accessorKey: 'deptName',
        header: '所属部门',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.deptName || '-'}</span>
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => {
          const isActive = row.original.status === 1
          return (
            <Badge
              variant={isActive ? 'outline' : 'secondary'}
              className={`px-1.5 py-0 text-[10px] font-normal ${
                isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              {isActive ? '启用' : '禁用'}
            </Badge>
          )
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-center">操作</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isUnassigning}
              onClick={() => handleUnassignSingle(row.original)}
            >
              <UserX className="mr-1 size-3" />
              取消授权
            </Button>
          </div>
        )
      }
    ]
  }, [handleUnassignSingle, isUnassigning])

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
      <Drawer
        open={open}
        onOpenChange={nextOpen => {
          if (!nextOpen) onClose()
        }}
        swipeDirection="right"
      >
        <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:40rem]">
          <DrawerHeader className="flex-row items-start justify-between gap-2 border-b p-4 md:gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <DrawerTitle>角色成员管理</DrawerTitle>
                {role && (
                  <Badge variant="outline" className="font-normal">
                    {role.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">查看、搜索属于该角色的用户成员，并支持批量添加或取消授权</p>
            </div>
            <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
              <X className="size-4" />
              <span className="sr-only">关闭</span>
            </DrawerClose>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="w-56">
                <InputGroup>
                  <InputGroupAddon>
                    <Search className="size-3.5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="搜索成员姓名或用户名..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                  />
                </InputGroup>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                  <Plus className="size-3.5" />
                  添加成员
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selectedCount === 0 || isUnassigning}
                  onClick={handleUnassignBatch}
                >
                  <Trash2 className="size-3.5" />
                  批量取消授权
                  {selectedCount > 0 && <span className="ml-1 text-xs">({selectedCount})</span>}
                </Button>
              </div>
            </div>

            {/* Member Table */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id} className="py-2.5 text-xs">
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
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="py-3">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                        暂无成员数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            {total > 0 && (
              <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                <span>共 {total} 名成员</span>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        text="上一页"
                        className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : undefined}
                        onClick={e => {
                          e.preventDefault()
                          table.previousPage()
                        }}
                      />
                    </PaginationItem>
                    <span className="px-2 text-xs tabular-nums">
                      {pagination.pageIndex + 1} / {pageCount}
                    </span>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        text="下一页"
                        className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : undefined}
                        onClick={e => {
                          e.preventDefault()
                          table.nextPage()
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>

          <DrawerFooter className="flex-row justify-end border-t p-4">
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <RoleUserAddDialog
        role={role}
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: roleKeys.users(roleId) })
          void queryClient.invalidateQueries({ queryKey: roleKeys.userIds(roleId) })
        }}
      />
    </>
  )
}
