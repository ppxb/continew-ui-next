import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'

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
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import { listOption, type OptionResp, resetOptionValue, updateOption } from '@/lib/api/option'
import { optionKeys } from '@/lib/query-keys'

interface LoginFormState {
  LOGIN_CAPTCHA_ENABLED: number
}

const DEFAULT_FORM: LoginFormState = {
  LOGIN_CAPTCHA_ENABLED: 1
}

export function ConfigLogin() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:loginConfig:update')

  const [isEdit, setIsEdit] = React.useState(false)
  const [form, setForm] = React.useState<LoginFormState>(DEFAULT_FORM)
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false)

  const { data: options = [], isLoading } = useQuery({
    queryKey: optionKeys.list('LOGIN'),
    queryFn: () => listOption({ category: 'LOGIN' })
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
        LOGIN_CAPTCHA_ENABLED: Number.parseInt(optionMap.LOGIN_CAPTCHA_ENABLED?.value || '1', 10)
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
      queryClient.invalidateQueries({ queryKey: optionKeys.list('LOGIN') })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '保存失败', type: 'error' })
    }
  })

  const resetMutation = useMutation({
    mutationFn: () => resetOptionValue({ category: 'LOGIN' }),
    onSuccess: () => {
      toast.add({ title: '恢复成功', type: 'success' })
      setResetDialogOpen(false)
      setIsEdit(false)
      queryClient.invalidateQueries({ queryKey: optionKeys.list('LOGIN') })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '恢复失败', type: 'error' })
    }
  })

  const handleResetForm = () => {
    setForm({
      LOGIN_CAPTCHA_ENABLED: Number.parseInt(optionMap.LOGIN_CAPTCHA_ENABLED?.value || '1', 10)
    })
  }

  const handleCancel = () => {
    handleResetForm()
    setIsEdit(false)
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
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">登录策略配置</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">配置用户认证、图形验证码与登录行为策略</p>
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
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
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

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <label className="cursor-pointer text-sm leading-none font-medium">
              {optionMap.LOGIN_CAPTCHA_ENABLED?.name || '是否启用验证码'}
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              {optionMap.LOGIN_CAPTCHA_ENABLED?.description ||
                '开启后，用户在后台登录时需要输入图形验证码以防止暴力破解'}
            </p>
          </div>
          <Switch
            checked={form.LOGIN_CAPTCHA_ENABLED === 1}
            onCheckedChange={checked => setForm(prev => ({ ...prev, LOGIN_CAPTCHA_ENABLED: checked ? 1 : 0 }))}
            disabled={!isEdit}
          />
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复登录配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
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
