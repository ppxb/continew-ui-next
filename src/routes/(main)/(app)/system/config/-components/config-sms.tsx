import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MoreHorizontal, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import { listDict } from '@/lib/api/common'
import {
  createSmsConfig,
  deleteSmsConfigs,
  getSmsConfig,
  listSmsConfig,
  setDefaultSmsConfig,
  type SmsConfigReq,
  type SmsConfigResp,
  updateSmsConfig
} from '@/lib/api/sms'
import { dictKeys, smsKeys } from '@/lib/query-keys'

const SUPPLIER_PRESETS = [
  { label: '阿里云', value: 'aliyun' },
  { label: '腾讯云', value: 'tencent' },
  { label: '华为云', value: 'huawei' },
  { label: '容联云', value: 'cloopen' },
  { label: '网易云信', value: 'netease' },
  { label: '亿美软通', value: 'emay' },
  { label: '助通科技', value: 'zhutong' },
  { label: '鼎佑科技', value: 'dingyou' },
  { label: '联麓信息', value: 'lianlu' },
  { label: '螺丝帽', value: 'luosimao' }
]

export function ConfigSms() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()

  const canCreate = hasPermission('system:smsConfig:create')
  const canUpdate = hasPermission('system:smsConfig:update')
  const canDelete = hasPermission('system:smsConfig:delete')
  const canSetDefault = hasPermission('system:smsConfig:setDefault')

  // Search states
  const [filterName, setFilterName] = React.useState('')
  const [filterSupplier, setFilterSupplier] = React.useState('')
  const [filterAccessKey, setFilterAccessKey] = React.useState('')

  // Drawer & dialog states
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | number | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<SmsConfigResp | null>(null)

  // Form state
  const [form, setForm] = React.useState<SmsConfigReq>({
    name: '',
    supplier: 'aliyun',
    accessKey: '',
    secretKey: '',
    signature: '',
    templateId: '',
    weight: 1,
    retryInterval: 5,
    maxRetries: 0,
    maximum: 100,
    supplierConfig: '',
    status: 1
  })

  // Dict query
  const { data: dictSuppliers = [] } = useQuery({
    queryKey: dictKeys.code('sms_supplier'),
    queryFn: () => listDict('sms_supplier').catch(() => [])
  })

  const supplierOptions = dictSuppliers.length > 0 ? dictSuppliers : SUPPLIER_PRESETS

  const supplierMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of supplierOptions) {
      map[item.value] = item.label
    }
    return map
  }, [supplierOptions])

  // List query
  const { data: pageData, isLoading } = useQuery({
    queryKey: smsKeys.list({
      name: filterName || undefined,
      supplier: filterSupplier || undefined,
      accessKey: filterAccessKey || undefined
    }),
    queryFn: () =>
      listSmsConfig({
        name: filterName || undefined,
        supplier: filterSupplier || undefined,
        accessKey: filterAccessKey || undefined
      })
  })

  const records = pageData?.list || []

  // Mutations
  const setDefaultMutation = useMutation({
    mutationFn: (id: string | number) => setDefaultSmsConfig(id),
    onSuccess: () => {
      toast.add({ title: '设置默认成功', type: 'success' })
      queryClient.invalidateQueries({ queryKey: smsKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '设置失败', type: 'error' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteSmsConfigs([id]),
    onSuccess: () => {
      toast.add({ title: '删除成功', type: 'success' })
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: smsKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '删除失败', type: 'error' })
    }
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await updateSmsConfig(editingId, form)
      } else {
        await createSmsConfig(form)
      }
    },
    onSuccess: () => {
      toast.add({ title: editingId ? '修改成功' : '新增成功', type: 'success' })
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: smsKeys.all })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '保存失败', type: 'error' })
    }
  })

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({
      name: '',
      supplier: 'aliyun',
      accessKey: '',
      secretKey: '',
      signature: '',
      templateId: '',
      weight: 1,
      retryInterval: 5,
      maxRetries: 0,
      maximum: 100,
      supplierConfig: '',
      status: 1
    })
    setDrawerOpen(true)
  }

  const handleOpenEdit = async (record: SmsConfigResp) => {
    setEditingId(record.id)
    try {
      const detail = await getSmsConfig(record.id)
      setForm({
        name: detail.name,
        supplier: detail.supplier,
        accessKey: detail.accessKey,
        secretKey: detail.secretKey || '',
        signature: detail.signature || '',
        templateId: detail.templateId,
        weight: detail.weight || 1,
        retryInterval: detail.retryInterval || 5,
        maxRetries: detail.maxRetries || 0,
        maximum: detail.maximum || 100,
        supplierConfig: detail.supplierConfig || '',
        status: detail.status || 1
      })
    } catch {
      setForm({
        name: record.name,
        supplier: record.supplier,
        accessKey: record.accessKey,
        secretKey: '',
        signature: record.signature || '',
        templateId: record.templateId,
        weight: record.weight || 1,
        retryInterval: record.retryInterval || 5,
        maxRetries: record.maxRetries || 0,
        maximum: record.maximum || 100,
        supplierConfig: record.supplierConfig || '',
        status: record.status || 1
      })
    }
    setDrawerOpen(true)
  }

  const handleSupplierChange = (val: string | null) => {
    if (!val) return
    setForm(prev => ({
      ...prev,
      supplier: val,
      supplierConfig: val === 'tencent' ? '{"sdkAppId":""}' : prev.supplierConfig
    }))
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.add({ title: '请输入名称', type: 'error' })
      return
    }
    if (!form.accessKey.trim()) {
      toast.add({ title: '请输入 Access Key', type: 'error' })
      return
    }
    if (!editingId && !form.secretKey.trim()) {
      toast.add({ title: '请输入 Secret Key', type: 'error' })
      return
    }
    if (!form.templateId.trim()) {
      toast.add({ title: '请输入模板 ID', type: 'error' })
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
          <Input
            placeholder="搜索名称"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            className="w-40"
          />
          <Input
            placeholder="搜索 Access Key"
            value={filterAccessKey}
            onChange={e => setFilterAccessKey(e.target.value)}
            className="w-44 font-mono text-xs"
          />
          <Select value={filterSupplier} onValueChange={(val: string | null) => setFilterSupplier(val || '')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部厂商" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部厂商</SelectItem>
              {supplierOptions.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterName('')
              setFilterSupplier('')
              setFilterAccessKey('')
            }}
          >
            <RefreshCw className="size-4" />
            重置
          </Button>
        </div>
        {canCreate && (
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            新增配置
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
                <TableHead className="text-left">配置名称</TableHead>
                <TableHead className="text-left">厂商</TableHead>
                <TableHead className="text-left">Access Key</TableHead>
                <TableHead className="text-left">短信签名</TableHead>
                <TableHead className="text-left">模板 ID</TableHead>
                <TableHead className="text-center">权重</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-center">默认</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <Spinner className="inline-block size-6" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    暂无短信配置
                  </TableCell>
                </TableRow>
              ) : (
                records.map((row: SmsConfigResp, idx: number) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-left font-medium">{row.name}</TableCell>
                    <TableCell className="text-left">
                      <Badge variant="outline">{supplierMap[row.supplier] || row.supplier}</Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="max-w-[140px] truncate">{row.accessKey}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.accessKey)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-left text-sm">{row.signature || '-'}</TableCell>
                    <TableCell className="text-left font-mono text-xs">{row.templateId}</TableCell>
                    <TableCell className="text-center text-xs">{row.weight ?? 1}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.status === 1 ? 'default' : 'secondary'}>
                        {row.status === 1 ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.isDefault ? (
                        <Badge variant="default" className="bg-primary/20 text-primary">
                          默认
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">否</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                            {canSetDefault && !row.isDefault && (
                              <DropdownMenuItem
                                onClick={() => setDefaultMutation.mutate(row.id)}
                                disabled={row.status === 2}
                              >
                                <Star className="size-4" />
                                设为默认
                              </DropdownMenuItem>
                            )}
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

      {/* Add/Edit Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="sm:max-w-xl">
          <DrawerHeader>
            <DrawerTitle>{editingId ? '修改短信配置' : '新增短信配置'}</DrawerTitle>
            <DrawerDescription>配置服务厂商、密钥信息及发送规则</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[75vh] overflow-y-auto px-4 py-2">
            <FieldGroup className="gap-4">
              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">
                    配置名称<span className="text-destructive">*</span>
                  </FieldLabel>
                </FieldContent>
                <Input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：阿里云短信主通道"
                  maxLength={100}
                />
              </Field>

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">
                    服务厂商<span className="text-destructive">*</span>
                  </FieldLabel>
                </FieldContent>
                <Select value={form.supplier} onValueChange={handleSupplierChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择厂商" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

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
                  className="font-mono"
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
                  className="font-mono"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">短信签名</FieldLabel>
                  </FieldContent>
                  <Input
                    value={form.signature}
                    onChange={e => setForm(prev => ({ ...prev, signature: e.target.value }))}
                    placeholder="例如：ContiNew"
                    maxLength={100}
                  />
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">
                      模板 ID<span className="text-destructive">*</span>
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    value={form.templateId}
                    onChange={e => setForm(prev => ({ ...prev, templateId: e.target.value }))}
                    placeholder="例如：SMS_12345678"
                    maxLength={50}
                    className="font-mono"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">负载均衡权重</FieldLabel>
                  </FieldContent>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.weight ?? 1}
                    onChange={e => setForm(prev => ({ ...prev, weight: Number.parseInt(e.target.value, 10) || 1 }))}
                  />
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">重试间隔（秒）</FieldLabel>
                  </FieldContent>
                  <Input
                    type="number"
                    min={1}
                    value={form.retryInterval ?? 5}
                    onChange={e =>
                      setForm(prev => ({ ...prev, retryInterval: Number.parseInt(e.target.value, 10) || 1 }))
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">重试次数</FieldLabel>
                  </FieldContent>
                  <Input
                    type="number"
                    min={0}
                    value={form.maxRetries ?? 0}
                    onChange={e => setForm(prev => ({ ...prev, maxRetries: Number.parseInt(e.target.value, 10) || 0 }))}
                  />
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel className="text-left">发送上限</FieldLabel>
                  </FieldContent>
                  <Input
                    type="number"
                    min={1}
                    value={form.maximum ?? 100}
                    onChange={e => setForm(prev => ({ ...prev, maximum: Number.parseInt(e.target.value, 10) || 1 }))}
                  />
                </Field>
              </div>

              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">厂商独立扩展配置（JSON 格式）</FieldLabel>
                  <FieldDescription>针对特定供应商（如腾讯云 sdkAppId）的专有扩展参数</FieldDescription>
                </FieldContent>
                <Textarea
                  value={form.supplierConfig}
                  onChange={e => setForm(prev => ({ ...prev, supplierConfig: e.target.value }))}
                  placeholder='例如：{"sdkAppId": "1400000000"}'
                  rows={2}
                  className="font-mono text-xs"
                />
              </Field>

              <Field orientation="horizontal" className="items-center justify-between py-1">
                <FieldContent>
                  <FieldLabel className="cursor-pointer text-left">状态</FieldLabel>
                  <FieldDescription>是否启用该短信服务配置</FieldDescription>
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
            <AlertDialogTitle>确认删除短信配置</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除短信配置「{deleteTarget?.name}」吗？删除后相关短信将无法从此通道发送。
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
