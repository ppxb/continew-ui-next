import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MoreHorizontal, Plus, RefreshCw, Trash2 } from 'lucide-react'

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
import { Checkbox } from '@/components/ui/checkbox'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import {
  createClient,
  deleteClients,
  getClient,
  listClient,
  type ClientReq,
  type ClientResp,
  updateClient
} from '@/lib/api/client'
import { listDict } from '@/lib/api/common'
import { clientKeys, dictKeys } from '@/lib/query-keys'

const CLIENT_TYPE_PRESETS = [
  { label: 'PC网页端', value: 'PC' },
  { label: '移动App端', value: 'APP' },
  { label: '微信小程序', value: 'MINI' },
  { label: '三方Web服务', value: 'WEB' }
]

const AUTH_TYPE_OPTIONS = [
  { label: '账号密码', value: 'ACCOUNT' },
  { label: '短信验证码', value: 'SMS' },
  { label: '邮箱验证码', value: 'EMAIL' },
  { label: '三方授权', value: 'SOCIAL' }
]

export function ConfigClient() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()

  const canCreate = hasPermission('system:client:create')
  const canUpdate = hasPermission('system:client:update')
  const canDelete = hasPermission('system:client:delete')
  const canGet = hasPermission('system:client:get')

  const [filterType, setFilterType] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState('')

  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | number | null>(null)
  const [detailData, setDetailData] = React.useState<ClientResp | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ClientResp | null>(null)

  const [form, setForm] = React.useState<ClientReq>({
    clientType: 'PC',
    clientKey: '',
    authType: ['ACCOUNT'],
    activeTimeout: 1800,
    timeout: 86400,
    refreshTokenTimeout: 2592000,
    isConcurrent: true,
    status: 1
  })

  // Dict query
  const { data: dictClientTypes = [] } = useQuery({
    queryKey: dictKeys.code('client_type'),
    queryFn: () => listDict('client_type').catch(() => [])
  })

  const clientTypeOptions = dictClientTypes.length > 0 ? dictClientTypes : CLIENT_TYPE_PRESETS

  const clientTypeMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of clientTypeOptions) {
      map[item.value] = item.label
    }
    return map
  }, [clientTypeOptions])

  // Clients query
  const { data: pageData, isLoading } = useQuery({
    queryKey: clientKeys.list({
      clientType: filterType && filterType !== 'ALL' ? filterType : undefined,
      status: filterStatus && filterStatus !== 'ALL' ? Number.parseInt(filterStatus, 10) : undefined
    }),
    queryFn: () =>
      listClient({
        clientType: filterType && filterType !== 'ALL' ? filterType : undefined,
        status: filterStatus && filterStatus !== 'ALL' ? Number.parseInt(filterStatus, 10) : undefined
      })
  })

  const records = pageData?.list || []

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteClients([id]),
    onSuccess: () => {
      toast.add({ title: '删除成功', type: 'success' })
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '删除失败', type: 'error' })
    }
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await updateClient(editingId, form)
      } else {
        await createClient(form)
      }
    },
    onSuccess: () => {
      toast.add({ title: editingId ? '修改成功' : '新增成功', type: 'success' })
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '保存失败', type: 'error' })
    }
  })

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({
      clientType: 'PC',
      clientKey: '',
      authType: ['ACCOUNT'],
      activeTimeout: 1800,
      timeout: 86400,
      refreshTokenTimeout: 2592000,
      isConcurrent: true,
      status: 1
    })
    setDrawerOpen(true)
  }

  const handleOpenEdit = async (record: ClientResp) => {
    setEditingId(record.id)
    try {
      const detail = await getClient(record.id)
      setForm({
        clientType: detail.clientType,
        clientKey: detail.clientKey || '',
        authType: detail.authType || ['ACCOUNT'],
        activeTimeout: detail.activeTimeout ?? 1800,
        timeout: detail.timeout ?? 86400,
        refreshTokenTimeout: detail.refreshTokenTimeout ?? 2592000,
        isConcurrent: detail.isConcurrent ?? true,
        status: detail.status ?? 1
      })
    } catch {
      setForm({
        clientType: record.clientType,
        clientKey: record.clientKey || '',
        authType: record.authType || ['ACCOUNT'],
        activeTimeout: record.activeTimeout ?? 1800,
        timeout: record.timeout ?? 86400,
        refreshTokenTimeout: record.refreshTokenTimeout ?? 2592000,
        isConcurrent: record.isConcurrent ?? true,
        status: record.status ?? 1
      })
    }
    setDrawerOpen(true)
  }

  const handleOpenDetail = async (record: ClientResp) => {
    try {
      const detail = await getClient(record.id)
      setDetailData(detail)
    } catch {
      setDetailData(record)
    }
    setDetailOpen(true)
  }

  const handleToggleAuthType = (code: string) => {
    setForm(prev => {
      const exists = prev.authType.includes(code)
      if (exists) {
        if (prev.authType.length <= 1) {
          toast.add({ title: '至少保留一种认证类型', type: 'error' })
          return prev
        }
        return { ...prev, authType: prev.authType.filter(c => c !== code) }
      }
      return { ...prev, authType: [...prev.authType, code] }
    })
  }

  const handleSave = () => {
    if (!form.clientType) {
      toast.add({ title: '请选择客户端类型', type: 'error' })
      return
    }
    if (!form.authType || form.authType.length === 0) {
      toast.add({ title: '请选择至少一种认证方式', type: 'error' })
      return
    }
    saveMutation.mutate()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.add({ title: '已复制到剪贴板', type: 'success' })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterType} onValueChange={(val: string | null) => setFilterType(val || '')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部客户端类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部客户端类型</SelectItem>
              {clientTypeOptions.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(val: string | null) => setFilterStatus(val || '')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部状态</SelectItem>
              <SelectItem value="1">启用</SelectItem>
              <SelectItem value="2">禁用</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterType('')
              setFilterStatus('')
            }}
          >
            <RefreshCw className="size-4" />
            重置
          </Button>
        </div>

        {canCreate && (
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            新增客户端
          </Button>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="text-left">客户端 ID</TableHead>
                <TableHead className="text-left">客户端类型</TableHead>
                <TableHead className="text-left">认证类型</TableHead>
                <TableHead className="text-left">活跃限制</TableHead>
                <TableHead className="text-left">Token有效期</TableHead>
                <TableHead className="text-center">多地登录</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Spinner className="inline-block size-6" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    暂无客户端配置
                  </TableCell>
                </TableRow>
              ) : (
                records.map((row: ClientResp, idx: number) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="max-w-[140px] truncate">{row.clientId}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.clientId)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <Badge variant="outline">{clientTypeMap[row.clientType] || row.clientType}</Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex flex-wrap gap-1">
                        {row.authType?.map(at => {
                          const found = AUTH_TYPE_OPTIONS.find(o => o.value === at)
                          return (
                            <Badge key={at} variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {found ? found.label : at}
                            </Badge>
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-left font-mono text-xs">{row.activeTimeout} 秒</TableCell>
                    <TableCell className="text-left font-mono text-xs">{row.timeout} 秒</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.isConcurrent ? 'default' : 'secondary'} className="text-[10px]">
                        {row.isConcurrent ? '允许' : '互斥'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.status === 1 ? 'default' : 'secondary'}>
                        {row.status === 1 ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canGet && (
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDetail(row)}>
                            详情
                          </Button>
                        )}
                        {canUpdate && (
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)}>
                            修改
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button size="icon" variant="ghost" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(row)}
                              >
                                <Trash2 className="size-4" />
                                删除
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="sm:max-w-xl">
          <DrawerHeader>
            <DrawerTitle>{editingId ? '修改客户端' : '新增客户端'}</DrawerTitle>
            <DrawerDescription>配置客户端认证机制、Token 有效期及并发登录策略</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[75vh] overflow-y-auto px-4 py-2">
            <FieldGroup className="gap-4">
              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">
                    客户端类型<span className="text-destructive">*</span>
                  </FieldLabel>
                </FieldContent>
                <Select
                  value={form.clientType}
                  onValueChange={(v: string | null) => {
                    if (v) setForm(prev => ({ ...prev, clientType: v }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择客户端类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientTypeOptions.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">Client Key</FieldLabel>
                  <FieldDescription>指定专有客户端密钥，留空系统将自动生成</FieldDescription>
                </FieldContent>
                <Input
                  value={form.clientKey}
                  onChange={e => setForm(prev => ({ ...prev, clientKey: e.target.value }))}
                  placeholder="留空自动生成"
                  className="font-mono text-xs"
                />
              </Field>

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">
                    支持的认证类型<span className="text-destructive">*</span>
                  </FieldLabel>
                  <FieldDescription>允许当前客户端通过哪些凭证认证方式登录</FieldDescription>
                </FieldContent>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {AUTH_TYPE_OPTIONS.map(opt => {
                    const checked = form.authType.includes(opt.value)
                    return (
                      <div
                        key={opt.value}
                        onClick={() => handleToggleAuthType(opt.value)}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                          checked ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => handleToggleAuthType(opt.value)} />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                    )
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">
                      Token 最低活跃频率<span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldDescription>秒（-1 为不限制）</FieldDescription>
                  </FieldContent>
                  <Input
                    type="number"
                    value={form.activeTimeout}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        activeTimeout: Number.parseInt(e.target.value, 10) || 0
                      }))
                    }
                    className="font-mono"
                  />
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">
                      Token 有效期<span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldDescription>秒（-1 永不过期）</FieldDescription>
                  </FieldContent>
                  <Input
                    type="number"
                    value={form.timeout}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        timeout: Number.parseInt(e.target.value, 10) || 0
                      }))
                    }
                    className="font-mono"
                  />
                </Field>
              </div>

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">Refresh Token 有效期（秒）</FieldLabel>
                </FieldContent>
                <Input
                  type="number"
                  value={form.refreshTokenTimeout}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      refreshTokenTimeout: Number.parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="font-mono"
                />
              </Field>

              <Field orientation="horizontal" className="items-center justify-between py-1">
                <FieldContent>
                  <FieldLabel className="cursor-pointer text-left">多地同时在线</FieldLabel>
                  <FieldDescription>允许同一账号在多个设备或位置同时登录</FieldDescription>
                </FieldContent>
                <Switch
                  checked={form.isConcurrent}
                  onCheckedChange={checked => setForm(prev => ({ ...prev, isConcurrent: checked }))}
                />
              </Field>

              <Field orientation="horizontal" className="items-center justify-between py-1">
                <FieldContent>
                  <FieldLabel className="cursor-pointer text-left">客户端状态</FieldLabel>
                  <FieldDescription>启用或禁用该客户端</FieldDescription>
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

      {/* Detail Drawer */}
      <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>客户端详情</DrawerTitle>
            <DrawerDescription>查看客户端 ID、密钥与认证安全参数</DrawerDescription>
          </DrawerHeader>
          {detailData && (
            <div className="space-y-4 px-4 py-2 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">客户端 ID</span>
                <span className="font-mono text-xs">{detailData.clientId}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">客户端类型</span>
                <span>{clientTypeMap[detailData.clientType] || detailData.clientType}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">认证类型</span>
                <div className="flex gap-1">
                  {detailData.authType?.map(at => {
                    const found = AUTH_TYPE_OPTIONS.find(o => o.value === at)
                    return (
                      <Badge key={at} variant="secondary" className="text-[10px]">
                        {found ? found.label : at}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">活跃频率限制</span>
                <span className="font-mono text-xs">{detailData.activeTimeout} 秒</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Token 有效期</span>
                <span className="font-mono text-xs">{detailData.timeout} 秒</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">多端同时登录</span>
                <span>{detailData.isConcurrent ? '允许' : '互斥挤下线'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">状态</span>
                <Badge variant={detailData.status === 1 ? 'default' : 'secondary'}>
                  {detailData.status === 1 ? '启用' : '禁用'}
                </Badge>
              </div>
              {detailData.createTime && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">创建时间</span>
                  <span className="font-mono text-xs">{detailData.createTime}</span>
                </div>
              )}
            </div>
          )}
          <DrawerFooter className="flex flex-row justify-end pt-4">
            <DrawerClose
              render={
                <Button variant="outline" size="sm">
                  关闭
                </Button>
              }
            />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除客户端</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除客户端「{deleteTarget?.clientId}」吗？删除后该客户端将无法再换取 Token 或调用系统接口。
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
