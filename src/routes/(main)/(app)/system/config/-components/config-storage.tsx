import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Cloud, HardDrive, MoreHorizontal, Pencil, Plus, Star, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import {
  createStorage,
  deleteStorages,
  getStorage,
  listStorage,
  setDefaultStorage,
  type StorageReq,
  type StorageResp,
  updateStorage,
  updateStorageStatus
} from '@/lib/api/storage'
import { storageKeys } from '@/lib/query-keys'

export function ConfigStorage() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()

  const canCreate = hasPermission('system:storage:create')
  const canUpdate = hasPermission('system:storage:update')
  const canDelete = hasPermission('system:storage:delete')
  const canSetDefault = hasPermission('system:storage:setDefault')
  const canUpdateStatus = hasPermission('system:storage:updateStatus')

  const [activeTypeTab, setActiveTypeTab] = React.useState<'all' | '1' | '2'>('all')
  const [keyword, setKeyword] = React.useState('')
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | number | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<StorageResp | null>(null)

  const [form, setForm] = React.useState<StorageReq>({
    name: '',
    code: '',
    type: 1,
    accessKey: '',
    secretKey: '',
    endpoint: '',
    bucketName: '',
    domain: '',
    recycleBinEnabled: true,
    recycleBinPath: '.RECYCLE.BIN/',
    sort: 1,
    description: '',
    status: 1
  })

  const { data: storages = [], isLoading } = useQuery({
    queryKey: storageKeys.list({
      description: keyword || undefined,
      type: activeTypeTab === 'all' ? undefined : (Number.parseInt(activeTypeTab, 10) as 1 | 2)
    }),
    queryFn: () =>
      listStorage({
        description: keyword || undefined,
        type: activeTypeTab === 'all' ? undefined : (Number.parseInt(activeTypeTab, 10) as 1 | 2)
      })
  })

  // Filter client side in case search description applies to name/code
  const filteredStorages = React.useMemo(() => {
    let list = storages
    if (activeTypeTab !== 'all') {
      const typeNum = Number.parseInt(activeTypeTab, 10)
      list = list.filter(item => item.type === typeNum)
    }
    if (keyword.trim()) {
      const q = keyword.toLowerCase().trim()
      list = list.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      )
    }
    return list
  }, [storages, activeTypeTab, keyword])

  const localStorages = React.useMemo(() => filteredStorages.filter(s => s.type === 1), [filteredStorages])
  const ossStorages = React.useMemo(() => filteredStorages.filter(s => s.type === 2), [filteredStorages])

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: 1 | 2 }) => updateStorageStatus(id, status),
    onSuccess: () => {
      toast.add({ title: '状态更新成功', type: 'success' })
      queryClient.invalidateQueries({ queryKey: storageKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '更新状态失败', type: 'error' })
    }
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: string | number) => setDefaultStorage(id),
    onSuccess: () => {
      toast.add({ title: '设置默认存储成功', type: 'success' })
      queryClient.invalidateQueries({ queryKey: storageKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '设置默认失败', type: 'error' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteStorages([id]),
    onSuccess: () => {
      toast.add({ title: '删除成功', type: 'success' })
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: storageKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '删除失败', type: 'error' })
    }
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await updateStorage(editingId, form)
      } else {
        await createStorage(form)
      }
    },
    onSuccess: () => {
      toast.add({ title: editingId ? '修改成功' : '新增成功', type: 'success' })
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: storageKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '保存失败', type: 'error' })
    }
  })

  const handleOpenAdd = (type: 1 | 2 = 1) => {
    setEditingId(null)
    setForm({
      name: '',
      code: '',
      type,
      accessKey: '',
      secretKey: '',
      endpoint: '',
      bucketName: type === 1 ? '/data/upload/' : '',
      domain: type === 1 ? 'http://localhost:8000/file' : '',
      recycleBinEnabled: true,
      recycleBinPath: '.RECYCLE.BIN/',
      sort: 1,
      description: '',
      status: 1
    })
    setDrawerOpen(true)
  }

  const handleOpenEdit = async (item: StorageResp) => {
    setEditingId(item.id)
    try {
      const detail = await getStorage(item.id)
      setForm({
        name: detail.name,
        code: detail.code,
        type: detail.type,
        accessKey: detail.accessKey || '',
        secretKey: '',
        endpoint: detail.endpoint || '',
        bucketName: detail.bucketName,
        domain: detail.domain,
        recycleBinEnabled: detail.recycleBinEnabled ?? true,
        recycleBinPath: detail.recycleBinPath || '.RECYCLE.BIN/',
        sort: detail.sort || 1,
        description: detail.description || '',
        status: detail.status || 1
      })
    } catch {
      setForm({
        name: item.name,
        code: item.code,
        type: item.type,
        accessKey: item.accessKey || '',
        secretKey: '',
        endpoint: item.endpoint || '',
        bucketName: item.bucketName,
        domain: item.domain,
        recycleBinEnabled: item.recycleBinEnabled ?? true,
        recycleBinPath: item.recycleBinPath || '.RECYCLE.BIN/',
        sort: item.sort || 1,
        description: item.description || '',
        status: item.status || 1
      })
    }
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.add({ title: '请输入存储名称', type: 'error' })
      return
    }
    if (!form.code.trim()) {
      toast.add({ title: '请输入存储编码', type: 'error' })
      return
    }
    if (!form.bucketName.trim()) {
      toast.add({ title: form.type === 1 ? '请输入存储路径' : '请输入 Bucket 名称', type: 'error' })
      return
    }
    if (!form.domain.trim()) {
      toast.add({ title: '请输入访问路径/域名', type: 'error' })
      return
    }
    if (form.type === 2) {
      if (!form.accessKey?.trim()) {
        toast.add({ title: '请输入 Access Key', type: 'error' })
        return
      }
      if (!editingId && !form.secretKey?.trim()) {
        toast.add({ title: '请输入 Secret Key', type: 'error' })
        return
      }
      if (!form.endpoint?.trim()) {
        toast.add({ title: '请输入 Endpoint', type: 'error' })
        return
      }
    }
    saveMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Tabs
            value={activeTypeTab}
            onValueChange={val => setActiveTypeTab(val as 'all' | '1' | '2')}
            className="w-auto"
          >
            <TabsList variant="default" className="h-9">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="1">本地存储</TabsTrigger>
              <TabsTrigger value="2">对象存储</TabsTrigger>
            </TabsList>
          </Tabs>

          <Input
            placeholder="搜索名称 / 编码"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="w-48 text-sm"
          />
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => handleOpenAdd(1)}>
              <Plus className="size-4" />
              新增本地存储
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleOpenAdd(2)}>
              <Cloud className="size-4" />
              新增对象存储
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="p-4">
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="mb-4 h-4 w-48" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Local storage section */}
          {(activeTypeTab === 'all' || activeTypeTab === '1') && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <HardDrive className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">本地存储</h3>
                <span className="text-xs text-muted-foreground">({localStorages.length})</span>
              </div>
              {localStorages.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  暂无本地存储配置
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {localStorages.map(item => (
                    <StorageCard
                      key={item.id}
                      item={item}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      canSetDefault={canSetDefault}
                      canUpdateStatus={canUpdateStatus}
                      onEdit={() => handleOpenEdit(item)}
                      onDelete={() => setDeleteTarget(item)}
                      onSetDefault={() => setDefaultMutation.mutate(item.id)}
                      onToggleStatus={status => statusMutation.mutate({ id: item.id, status })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OSS section */}
          {(activeTypeTab === 'all' || activeTypeTab === '2') && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Cloud className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">对象存储 (OSS)</h3>
                <span className="text-xs text-muted-foreground">({ossStorages.length})</span>
              </div>
              {ossStorages.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  暂无对象存储配置
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {ossStorages.map(item => (
                    <StorageCard
                      key={item.id}
                      item={item}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      canSetDefault={canSetDefault}
                      canUpdateStatus={canUpdateStatus}
                      onEdit={() => handleOpenEdit(item)}
                      onDelete={() => setDeleteTarget(item)}
                      onSetDefault={() => setDefaultMutation.mutate(item.id)}
                      onToggleStatus={status => statusMutation.mutate({ id: item.id, status })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="sm:max-w-xl">
          <DrawerHeader>
            <DrawerTitle>{editingId ? '修改存储配置' : '新增存储配置'}</DrawerTitle>
            <DrawerDescription>配置本地或云端存储桶路径及公开访问域名</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[75vh] overflow-y-auto px-4 py-2">
            <FieldGroup className="gap-4">
              {!editingId && (
                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">存储类型</FieldLabel>
                  </FieldContent>
                  <RadioGroup
                    value={String(form.type)}
                    onValueChange={v => setForm(prev => ({ ...prev, type: Number(v) as 1 | 2 }))}
                    className="flex gap-4 pt-1"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="1" id="type-1" />
                      <label htmlFor="type-1" className="cursor-pointer text-sm">
                        本地存储
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="2" id="type-2" />
                      <label htmlFor="type-2" className="cursor-pointer text-sm">
                        对象存储
                      </label>
                    </div>
                  </RadioGroup>
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">
                      存储名称<span className="text-destructive">*</span>
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：本地文件存储"
                    maxLength={100}
                  />
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">
                      存储编码<span className="text-destructive">*</span>
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    value={form.code}
                    onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="例如：local_storage"
                    maxLength={30}
                    disabled={!!editingId}
                    className="font-mono text-xs"
                  />
                </Field>
              </div>

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">
                    {form.type === 1 ? '存储路径' : 'Bucket 名称'}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                </FieldContent>
                <Input
                  value={form.bucketName}
                  onChange={e => setForm(prev => ({ ...prev, bucketName: e.target.value }))}
                  placeholder={form.type === 1 ? '例如：/data/upload/' : '例如：continew-bucket'}
                  className="font-mono text-xs"
                />
              </Field>

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">
                    {form.type === 1 ? '访问路径' : '域名 / 访问 URL'}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                </FieldContent>
                <Input
                  value={form.domain}
                  onChange={e => setForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder={form.type === 1 ? '例如：http://localhost:8000/file' : '例如：https://oss.example.com'}
                  className="font-mono text-xs"
                />
              </Field>

              {form.type === 2 && (
                <>
                  <Field>
                    <FieldContent>
                      <FieldLabel className="text-left">
                        Endpoint<span className="text-destructive">*</span>
                      </FieldLabel>
                    </FieldContent>
                    <Input
                      value={form.endpoint}
                      onChange={e => setForm(prev => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="例如：http://oss-cn-shanghai.aliyuncs.com"
                      className="font-mono text-xs"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldContent>
                        <FieldLabel className="text-left">
                          Access Key<span className="text-destructive">*</span>
                        </FieldLabel>
                      </FieldContent>
                      <Input
                        value={form.accessKey}
                        onChange={e => setForm(prev => ({ ...prev, accessKey: e.target.value }))}
                        placeholder="请输入 Access Key"
                        className="font-mono text-xs"
                      />
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel className="text-left">
                          Secret Key{!editingId && <span className="text-destructive">*</span>}
                        </FieldLabel>
                      </FieldContent>
                      <Input
                        type="password"
                        value={form.secretKey}
                        onChange={e => setForm(prev => ({ ...prev, secretKey: e.target.value }))}
                        placeholder={editingId ? '留空表示不修改' : '请输入 Secret Key'}
                        className="font-mono text-xs"
                      />
                    </Field>
                  </div>
                </>
              )}

              {form.type === 1 && (
                <>
                  <Field orientation="horizontal" className="items-center justify-between py-1">
                    <FieldContent>
                      <FieldLabel className="cursor-pointer text-left">启用回收站</FieldLabel>
                      <FieldDescription>删除文件时移动至回收站目录</FieldDescription>
                    </FieldContent>
                    <Switch
                      checked={form.recycleBinEnabled}
                      onCheckedChange={checked => setForm(prev => ({ ...prev, recycleBinEnabled: checked }))}
                    />
                  </Field>

                  {form.recycleBinEnabled && (
                    <Field>
                      <FieldContent>
                        <FieldLabel className="text-left">回收站目录路径</FieldLabel>
                      </FieldContent>
                      <Input
                        value={form.recycleBinPath}
                        onChange={e => setForm(prev => ({ ...prev, recycleBinPath: e.target.value }))}
                        placeholder=".RECYCLE.BIN/"
                        className="font-mono text-xs"
                      />
                    </Field>
                  )}
                </>
              )}

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">描述</FieldLabel>
                </FieldContent>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请输入存储描述信息"
                  rows={2}
                />
              </Field>

              <Field orientation="horizontal" className="items-center justify-between py-1">
                <FieldContent>
                  <FieldLabel className="cursor-pointer text-left">状态</FieldLabel>
                  <FieldDescription>启用或禁用该存储配置</FieldDescription>
                </FieldContent>
                <Switch
                  checked={form.status === 1}
                  onCheckedChange={checked => setForm(prev => ({ ...prev, status: checked ? 1 : 2 }))}
                />
              </Field>
            </FieldGroup>
          </div>
          <DrawerFooter className="flex flex-row justify-end gap-2 pt-4">
            <DrawerClose
              render={
                <Button variant="outline" size="sm">
                  取消
                </Button>
              }
            />
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Spinner className="size-4" /> : <Check className="size-4" />}
              保存
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除存储</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除存储配置「{deleteTarget?.name}」吗？已上传至该存储的文件可能无法正常访问。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Spinner className="size-4" /> : null}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface StorageCardProps {
  item: StorageResp
  canUpdate: boolean
  canDelete: boolean
  canSetDefault: boolean
  canUpdateStatus: boolean
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
  onToggleStatus: (status: 1 | 2) => void
}

function StorageCard({
  item,
  canUpdate,
  canDelete,
  canSetDefault,
  canUpdateStatus,
  onEdit,
  onDelete,
  onSetDefault,
  onToggleStatus
}: StorageCardProps) {
  return (
    <Card className="flex flex-col justify-between transition-all hover:shadow-sm">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {item.type === 1 ? <HardDrive className="size-4" /> : <Cloud className="size-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">{item.name}</CardTitle>
                {item.isDefault && (
                  <Badge variant="default" className="bg-primary/20 px-1.5 py-0 text-[10px] text-primary">
                    默认
                  </Badge>
                )}
              </div>
              <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {canUpdateStatus && !item.isDefault && (
              <Switch
                checked={item.status === 1}
                onCheckedChange={checked => onToggleStatus(checked ? 1 : 2)}
                className="scale-75"
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="icon" variant="ghost" className="size-7">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {canSetDefault && !item.isDefault && (
                  <DropdownMenuItem onClick={onSetDefault} disabled={item.status === 2}>
                    <Star className="size-4" />
                    设为默认
                  </DropdownMenuItem>
                )}
                {canUpdate && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="size-4" />
                    修改
                  </DropdownMenuItem>
                )}
                {canDelete && !item.isDefault && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                    <Trash2 className="size-4" />
                    删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5 p-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{item.type === 1 ? '存储路径' : 'Bucket'}</span>
          <span className="max-w-[180px] truncate font-mono text-foreground">{item.bucketName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>访问路径</span>
          <span className="max-w-[180px] truncate font-mono text-foreground">{item.domain}</span>
        </div>
        {item.type === 2 && item.endpoint && (
          <div className="flex items-center justify-between">
            <span>Endpoint</span>
            <span className="max-w-[180px] truncate font-mono text-foreground">{item.endpoint}</span>
          </div>
        )}
        {item.type === 1 && (
          <div className="flex items-center justify-between">
            <span>回收站</span>
            <span className="text-foreground">{item.recycleBinEnabled ? '已启用' : '已禁用'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
