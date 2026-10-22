import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cloud, HardDrive, RefreshCw, Search } from 'lucide-react'

import { ListPageCard } from '@/components/list-page-card'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import {
  listStorage,
  setDefaultStorage,
  type StorageResp,
  type StorageStatus,
  type StorageType,
  updateStorageStatus
} from '@/lib/api/storage'
import { storageKeys } from '@/lib/query-keys'

import {
  createLocalStorageColumns,
  createOssStorageColumns,
  LOCAL_TABLE_MIN_WIDTH,
  OSS_TABLE_MIN_WIDTH,
  type StorageAction,
  type StorageColumnOptions
} from './columns'
import { StorageDeleteDialog } from './delete-dialog'
import { StorageFormDrawer } from './form-drawer'
import { StorageGroupPanel } from './group-panel'
import { StorageToolbar } from './toolbar'

/** The list endpoint is unpaged, so the backend orders it by the storage's own 排序 column. */
const DEFAULT_SORT = ['sort,asc']

/** Stable empty array, so a failed query does not rebuild the group rows on every render. */
const EMPTY_STORAGES: StorageResp[] = []

const TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '本地存储' },
  { value: '2', label: '对象存储' }
]

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '启用' },
  { value: '2', label: '禁用' }
]

export function ConfigStorage() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()

  const canCreate = hasPermission('system:storage:create')
  const canUpdate = hasPermission('system:storage:update')
  const canDelete = hasPermission('system:storage:delete')
  const canSetDefault = hasPermission('system:storage:setDefault')
  const canUpdateStatus = hasPermission('system:storage:updateStatus')

  const [searchInput, setSearchInput] = React.useState('')
  const keyword = useDebouncedValue(searchInput).trim()
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')

  // The form drawer covers both 新增 and 修改, so a null id means "create" rather than "nothing
  // picked yet"; the open flag is what says whether the drawer is showing at all.
  const [formType, setFormType] = React.useState<StorageType>(1)
  const [formStorageId, setFormStorageId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [deletingStorage, setDeletingStorage] = React.useState<StorageResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const fullscreen = useFullscreenTransition()

  const type = typeFilter === 'all' ? undefined : (Number(typeFilter) as StorageType)
  const status = statusFilter === 'all' ? undefined : (Number(statusFilter) as StorageStatus)

  const query = useQuery({
    queryKey: storageKeys.list({ description: keyword || undefined, type, status, sort: DEFAULT_SORT }),
    queryFn: () => listStorage({ description: keyword || undefined, type, status, sort: DEFAULT_SORT }),
    // Keep the current rows on screen while the next filter loads.
    placeholderData: previous => previous
  })

  const storages = query.data ?? EMPTY_STORAGES
  const localStorages = React.useMemo(() => storages.filter(storage => storage.type === 1), [storages])
  const ossStorages = React.useMemo(() => storages.filter(storage => storage.type === 2), [storages])

  const setDefaultMutation = useMutation({
    mutationFn: (id: string | number) => setDefaultStorage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storageKeys.all })
      toast.add({ title: '设置默认存储成功', type: 'success' })
    }
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string | number; nextStatus: StorageStatus }) =>
      updateStorageStatus(id, nextStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storageKeys.all })
      toast.add({ title: '状态更新成功', type: 'success' })
    }
  })

  const handleRowAction = React.useCallback(
    (action: StorageAction, storage: StorageResp) => {
      if (action === 'edit') {
        setFormStorageId(storage.id)
        setIsFormOpen(true)
        return
      }

      if (action === 'setDefault') {
        setDefaultMutation.mutate(storage.id)
        return
      }

      if (action === 'toggleStatus') {
        statusMutation.mutate({ id: storage.id, nextStatus: storage.status === 1 ? 2 : 1 })
        return
      }

      if (action === 'delete') {
        setDeletingStorage(storage)
        setIsDeleteOpen(true)
      }
    },
    [setDefaultMutation, statusMutation]
  )

  const columnOptions: StorageColumnOptions = React.useMemo(
    () => ({ onAction: handleRowAction, canUpdate, canDelete, canSetDefault, canUpdateStatus }),
    [handleRowAction, canUpdate, canDelete, canSetDefault, canUpdateStatus]
  )

  const localColumns = React.useMemo(() => createLocalStorageColumns(columnOptions), [columnOptions])
  const ossColumns = React.useMemo(() => createOssStorageColumns(columnOptions), [columnOptions])

  const hasActiveFilters = keyword !== '' || typeFilter !== 'all' || statusFilter !== 'all'

  const handleResetFilters = () => {
    setSearchInput('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  const handleCreate = (nextType: StorageType) => {
    setFormType(nextType)
    setFormStorageId(null)
    setIsFormOpen(true)
  }

  const filters = (
    <>
      <InputGroup className="w-full md:w-64">
        <InputGroupAddon align="inline-start">
          <Search className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          className="text-sm"
          placeholder="搜索名称、编码、描述"
          value={searchInput}
          onChange={event => setSearchInput(event.target.value)}
        />
      </InputGroup>
      <div className="w-full sm:w-32">
        <Select items={TYPE_OPTIONS} value={typeFilter} onValueChange={value => setTypeFilter(value ?? 'all')}>
          <SelectTrigger className="w-full">
            <span className="text-muted-foreground">类型</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {TYPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-32">
        <Select items={STATUS_OPTIONS} value={statusFilter} onValueChange={value => setStatusFilter(value ?? 'all')}>
          <SelectTrigger className="w-full">
            <span className="text-muted-foreground">状态</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={handleResetFilters}>
          <RefreshCw />
          重置
        </Button>
      ) : null}
    </>
  )

  const actions = (
    <StorageToolbar
      canCreate={canCreate}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onCreate={handleCreate}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
    />
  )

  return (
    <>
      <ListPageCard
        title="存储配置"
        description="维护本地与对象存储，文件上传与下载都经由默认存储"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <div className="flex flex-col gap-4 px-4">
          {typeFilter !== '2' ? (
            <StorageGroupPanel
              title="本地存储"
              icon={<HardDrive className="size-4 text-muted-foreground" />}
              minWidth={LOCAL_TABLE_MIN_WIDTH}
              items={localStorages}
              columns={localColumns}
              isLoading={query.isPending}
            />
          ) : null}

          {typeFilter !== '1' ? (
            <StorageGroupPanel
              title="对象存储"
              icon={<Cloud className="size-4 text-muted-foreground" />}
              minWidth={OSS_TABLE_MIN_WIDTH}
              items={ossStorages}
              columns={ossColumns}
              isLoading={query.isPending}
            />
          ) : null}
        </div>
      </ListPageCard>

      <StorageFormDrawer
        storageId={formStorageId}
        storageType={formType}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <StorageDeleteDialog storage={deletingStorage} open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
    </>
  )
}
