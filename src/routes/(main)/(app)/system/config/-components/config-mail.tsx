import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, EyeOff, Pencil, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'

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
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import { listOption, type OptionResp, resetOptionValue, updateOption } from '@/lib/api/option'
import { optionKeys } from '@/lib/query-keys'

interface MailFormState {
  MAIL_PROTOCOL: string
  MAIL_HOST: string
  MAIL_PORT: number
  MAIL_USERNAME: string
  MAIL_PASSWORD: string
  MAIL_SSL_ENABLED: number
  MAIL_SSL_PORT: number
}

const DEFAULT_FORM: MailFormState = {
  MAIL_PROTOCOL: 'smtp',
  MAIL_HOST: '',
  MAIL_PORT: 465,
  MAIL_USERNAME: '',
  MAIL_PASSWORD: '',
  MAIL_SSL_ENABLED: 1,
  MAIL_SSL_PORT: 465
}

export function ConfigMail() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:mailConfig:update')

  const [isEdit, setIsEdit] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [form, setForm] = React.useState<MailFormState>(DEFAULT_FORM)
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false)

  const { data: options = [], isLoading } = useQuery({
    queryKey: optionKeys.list('MAIL'),
    queryFn: () => listOption({ category: 'MAIL' })
  })

  const optionMap = React.useMemo(() => {
    const map: Record<string, OptionResp> = {}
    for (const opt of options) {
      map[opt.code] = opt
    }
    return map
  }, [options])

  React.useEffect(() => {
    if (!isEdit && options.length > 0) {
      setForm({
        MAIL_PROTOCOL: optionMap.MAIL_PROTOCOL?.value || 'smtp',
        MAIL_HOST: optionMap.MAIL_HOST?.value || '',
        MAIL_PORT: Number.parseInt(optionMap.MAIL_PORT?.value || '465', 10),
        MAIL_USERNAME: optionMap.MAIL_USERNAME?.value || '',
        MAIL_PASSWORD: optionMap.MAIL_PASSWORD?.value || '',
        MAIL_SSL_ENABLED: Number.parseInt(optionMap.MAIL_SSL_ENABLED?.value || '1', 10),
        MAIL_SSL_PORT: Number.parseInt(optionMap.MAIL_SSL_PORT?.value || '465', 10)
      })
    }
  }, [options, optionMap, isEdit])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(form).map(([code, value]) => {
        const item = optionMap[code]
        return {
          id: item?.id ?? 0,
          code,
          value: String(value)
        }
      })
      await updateOption(payload)
    },
    onSuccess: () => {
      toast.add({ title: '保存成功', type: 'success' })
      setIsEdit(false)
      queryClient.invalidateQueries({ queryKey: optionKeys.list('MAIL') })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '保存失败', type: 'error' })
    }
  })

  const resetMutation = useMutation({
    mutationFn: () => resetOptionValue({ category: 'MAIL' }),
    onSuccess: () => {
      toast.add({ title: '恢复成功', type: 'success' })
      setResetDialogOpen(false)
      setIsEdit(false)
      queryClient.invalidateQueries({ queryKey: optionKeys.list('MAIL') })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '恢复失败', type: 'error' })
    }
  })

  const handleResetForm = () => {
    setForm({
      MAIL_PROTOCOL: optionMap.MAIL_PROTOCOL?.value || 'smtp',
      MAIL_HOST: optionMap.MAIL_HOST?.value || '',
      MAIL_PORT: Number.parseInt(optionMap.MAIL_PORT?.value || '465', 10),
      MAIL_USERNAME: optionMap.MAIL_USERNAME?.value || '',
      MAIL_PASSWORD: optionMap.MAIL_PASSWORD?.value || '',
      MAIL_SSL_ENABLED: Number.parseInt(optionMap.MAIL_SSL_ENABLED?.value || '1', 10),
      MAIL_SSL_PORT: Number.parseInt(optionMap.MAIL_SSL_PORT?.value || '465', 10)
    })
  }

  const handleCancel = () => {
    handleResetForm()
    setIsEdit(false)
  }

  const handleSave = () => {
    if (!form.MAIL_HOST.trim()) {
      toast.add({ title: '请输入邮件服务器地址', type: 'error' })
      return
    }
    if (!form.MAIL_USERNAME.trim()) {
      toast.add({ title: '请输入发件人邮箱地址', type: 'error' })
      return
    }
    if (!form.MAIL_PASSWORD.trim()) {
      toast.add({ title: '请输入邮箱服务密码或授权码', type: 'error' })
      return
    }
    saveMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">邮件服务配置</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">配置系统用于发送通知、验证码及报警邮件的 SMTP 邮箱服务</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEdit ? (
            <>
              {canUpdate && (
                <Button size="sm" onClick={() => setIsEdit(true)}>
                  <Pencil className="size-4" />
                  修改
                </Button>
              )}
              {canUpdate && (
                <Button size="sm" variant="outline" onClick={() => setResetDialogOpen(true)}>
                  <RotateCcw className="size-4" />
                  恢复默认
                </Button>
              )}
            </>
          ) : (
            <>
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Spinner className="size-4" /> : <Check className="size-4" />}
                保存
              </Button>
              <Button size="sm" variant="outline" onClick={handleResetForm} disabled={saveMutation.isPending}>
                <RefreshCw className="size-4" />
                重置
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saveMutation.isPending}>
                <Undo2 className="size-4" />
                取消
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Protocol */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.MAIL_PROTOCOL?.name || '邮件协议'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>{optionMap.MAIL_PROTOCOL?.description || '邮件发送协议类型'}</FieldDescription>
            </FieldContent>
            <Input value={form.MAIL_PROTOCOL.toUpperCase()} disabled />
          </Field>

          {/* Host */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.MAIL_HOST?.name || '服务器地址'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>{optionMap.MAIL_HOST?.description || 'SMTP 邮件服务器地址'}</FieldDescription>
            </FieldContent>
            <Input
              value={form.MAIL_HOST}
              onChange={e => setForm(prev => ({ ...prev, MAIL_HOST: e.target.value }))}
              placeholder="例如：smtp.126.com"
              disabled={!isEdit}
            />
          </Field>

          {/* Port */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.MAIL_PORT?.name || '服务器端口'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>{optionMap.MAIL_PORT?.description || '邮件服务器连接端口'}</FieldDescription>
            </FieldContent>
            <Input
              type="number"
              min={0}
              value={form.MAIL_PORT}
              onChange={e => setForm(prev => ({ ...prev, MAIL_PORT: Number.parseInt(e.target.value, 10) || 0 }))}
              placeholder="465"
              disabled={!isEdit}
            />
          </Field>

          {/* Username */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.MAIL_USERNAME?.name || '发件人邮箱'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>{optionMap.MAIL_USERNAME?.description || '系统发信人邮箱地址'}</FieldDescription>
            </FieldContent>
            <Input
              value={form.MAIL_USERNAME}
              onChange={e => setForm(prev => ({ ...prev, MAIL_USERNAME: e.target.value }))}
              placeholder="例如：charles7c@126.com"
              disabled={!isEdit}
            />
          </Field>

          {/* Password */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.MAIL_PASSWORD?.name || '邮箱密码/授权码'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.MAIL_PASSWORD?.description || '邮箱客户端专用密码或 SMTP 授权码'}
              </FieldDescription>
            </FieldContent>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.MAIL_PASSWORD}
                onChange={e => setForm(prev => ({ ...prev, MAIL_PASSWORD: e.target.value }))}
                placeholder="请输入邮箱授权码"
                disabled={!isEdit}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 size-9 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </Field>

          {/* SSL Port */}
          {form.MAIL_SSL_ENABLED === 1 && (
            <Field>
              <FieldContent>
                <FieldLabel className="text-left">
                  {optionMap.MAIL_SSL_PORT?.name || 'SSL端口号'}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldDescription>
                  {optionMap.MAIL_SSL_PORT?.description || 'SSL加密连接的专用端口（通常为 465 或 994）'}
                </FieldDescription>
              </FieldContent>
              <Input
                type="number"
                min={0}
                value={form.MAIL_SSL_PORT}
                onChange={e => setForm(prev => ({ ...prev, MAIL_SSL_PORT: Number.parseInt(e.target.value, 10) || 0 }))}
                placeholder="465"
                disabled={!isEdit}
              />
            </Field>
          )}
        </div>

        {/* SSL Enabled */}
        <Field orientation="horizontal" className="items-center justify-between">
          <FieldContent>
            <FieldLabel className="text-left font-medium">
              {optionMap.MAIL_SSL_ENABLED?.name || '启用SSL加密'}
            </FieldLabel>
            <FieldDescription>
              {optionMap.MAIL_SSL_ENABLED?.description || '是否启用 SSL/TLS 安全加密连接'}
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={form.MAIL_SSL_ENABLED === 1}
            onCheckedChange={checked => setForm(prev => ({ ...prev, MAIL_SSL_ENABLED: checked ? 1 : 0 }))}
            disabled={!isEdit}
          />
        </Field>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复邮件配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              {resetMutation.isPending ? <Spinner className="size-4" /> : null}
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
