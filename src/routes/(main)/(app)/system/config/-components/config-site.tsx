import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ImagePlus, Pencil, RefreshCw, RotateCcw, Undo2, Upload } from 'lucide-react'

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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import { listOption, type OptionResp, resetOptionValue, updateOption } from '@/lib/api/option'
import { optionKeys } from '@/lib/query-keys'
import { cn } from 'cn'

interface SiteFormState {
  SITE_LOGO: string
  SITE_FAVICON: string
  SITE_TITLE: string
  SITE_DESCRIPTION: string
  SITE_COPYRIGHT: string
  SITE_BEIAN: string
}

const DEFAULT_FORM: SiteFormState = {
  SITE_LOGO: '',
  SITE_FAVICON: '',
  SITE_TITLE: '',
  SITE_DESCRIPTION: '',
  SITE_COPYRIGHT: '',
  SITE_BEIAN: ''
}

export function ConfigSite() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:siteConfig:update')

  const [isEdit, setIsEdit] = React.useState(false)
  const [form, setForm] = React.useState<SiteFormState>(DEFAULT_FORM)
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false)

  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const faviconInputRef = React.useRef<HTMLInputElement>(null)

  const { data: options = [], isLoading } = useQuery({
    queryKey: optionKeys.list('SITE'),
    queryFn: () => listOption({ category: 'SITE' })
  })

  // Map option array to key-value record
  const optionMap = React.useMemo(() => {
    const map: Record<string, OptionResp> = {}
    for (const opt of options) {
      map[opt.code] = opt
    }
    return map
  }, [options])

  // Sync form state when options load or when edit state resets
  React.useEffect(() => {
    if (!isEdit && options.length > 0) {
      setForm({
        SITE_LOGO: optionMap.SITE_LOGO?.value || '',
        SITE_FAVICON: optionMap.SITE_FAVICON?.value || '',
        SITE_TITLE: optionMap.SITE_TITLE?.value || '',
        SITE_DESCRIPTION: optionMap.SITE_DESCRIPTION?.value || '',
        SITE_COPYRIGHT: optionMap.SITE_COPYRIGHT?.value || '',
        SITE_BEIAN: optionMap.SITE_BEIAN?.value || ''
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
          value: value ?? ''
        }
      })
      await updateOption(payload)
    },
    onSuccess: () => {
      toast.add({ title: '保存成功', type: 'success' })
      setIsEdit(false)
      queryClient.invalidateQueries({ queryKey: optionKeys.list('SITE') })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '保存失败', type: 'error' })
    }
  })

  const resetMutation = useMutation({
    mutationFn: () => resetOptionValue({ category: 'SITE' }),
    onSuccess: () => {
      toast.add({ title: '恢复成功', type: 'success' })
      setResetDialogOpen(false)
      setIsEdit(false)
      queryClient.invalidateQueries({ queryKey: optionKeys.list('SITE') })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '恢复失败', type: 'error' })
    }
  })

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.add({ title: '请选择有效的图片文件', type: 'error' })
      return
    }
    const reader = new FileReader()
    reader.onload = evt => {
      setForm(prev => ({ ...prev, SITE_LOGO: String(evt.target?.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.add({ title: '请选择有效的图标文件', type: 'error' })
      return
    }
    const reader = new FileReader()
    reader.onload = evt => {
      setForm(prev => ({ ...prev, SITE_FAVICON: String(evt.target?.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  const handleResetForm = () => {
    setForm({
      SITE_LOGO: optionMap.SITE_LOGO?.value || '',
      SITE_FAVICON: optionMap.SITE_FAVICON?.value || '',
      SITE_TITLE: optionMap.SITE_TITLE?.value || '',
      SITE_DESCRIPTION: optionMap.SITE_DESCRIPTION?.value || '',
      SITE_COPYRIGHT: optionMap.SITE_COPYRIGHT?.value || '',
      SITE_BEIAN: optionMap.SITE_BEIAN?.value || ''
    })
  }

  const handleCancel = () => {
    handleResetForm()
    setIsEdit(false)
  }

  const handleSave = () => {
    if (!form.SITE_TITLE.trim()) {
      toast.add({ title: '请输入系统名称', type: 'error' })
      return
    }
    if (!form.SITE_DESCRIPTION.trim()) {
      toast.add({ title: '请输入系统描述', type: 'error' })
      return
    }
    if (!form.SITE_COPYRIGHT.trim()) {
      toast.add({ title: '请输入版权声明', type: 'error' })
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
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">网站基础配置</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">配置系统的元数据</p>
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
        {/* Logo & Favicon row */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Logo */}
          <Field className="gap-1.5">
            <div className="flex flex-col gap-0.5">
              <FieldLabel>{optionMap.SITE_LOGO?.name || '系统 LOGO'}</FieldLabel>
              <FieldDescription>{optionMap.SITE_LOGO?.description || '显示在登录界面和系统导航栏'}</FieldDescription>
            </div>
            <div className="mt-1 flex items-center">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={!isEdit}
              />
              <div
                role={isEdit ? 'button' : undefined}
                tabIndex={isEdit ? 0 : undefined}
                onClick={() => isEdit && logoInputRef.current?.click()}
                onKeyDown={e => isEdit && (e.key === 'Enter' || e.key === ' ') && logoInputRef.current?.click()}
                className={cn(
                  'group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 transition-all',
                  isEdit &&
                    'cursor-pointer hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                )}
              >
                {form.SITE_LOGO ? (
                  <img src={form.SITE_LOGO} alt="Site Logo" className="size-full object-contain p-2" />
                ) : (
                  <ImagePlus className="size-6 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                )}
                {isEdit && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="size-4" />
                    <span className="mt-0.5 text-[10px] font-medium">点击上传</span>
                  </div>
                )}
              </div>
            </div>
          </Field>

          {/* Favicon */}
          <Field className="gap-1.5">
            <div className="flex flex-col gap-0.5">
              <FieldLabel>{optionMap.SITE_FAVICON?.name || '系统图标'}</FieldLabel>
              <FieldDescription>{optionMap.SITE_FAVICON?.description || '浏览器标签页显示的网站图标'}</FieldDescription>
            </div>
            <div className="mt-1 flex items-center">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*,.ico"
                className="hidden"
                onChange={handleFaviconUpload}
                disabled={!isEdit}
              />
              <div
                role={isEdit ? 'button' : undefined}
                tabIndex={isEdit ? 0 : undefined}
                onClick={() => isEdit && faviconInputRef.current?.click()}
                onKeyDown={e => isEdit && (e.key === 'Enter' || e.key === ' ') && faviconInputRef.current?.click()}
                className={cn(
                  'group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 transition-all',
                  isEdit &&
                    'cursor-pointer hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                )}
                title={isEdit ? '点击上传系统图标' : undefined}
              >
                {form.SITE_FAVICON ? (
                  <img src={form.SITE_FAVICON} alt="Site Favicon" className="size-10 object-contain" />
                ) : (
                  <ImagePlus className="size-6 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                )}
                {isEdit && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="size-4" />
                    <span className="mt-0.5 text-[10px] font-medium">点击上传</span>
                  </div>
                )}
              </div>
            </div>
          </Field>
        </div>

        {/* Row 1: System Title & Beian */}
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
          {/* System Title */}
          <Field className="gap-1.5">
            <div className="flex flex-col gap-0.5">
              <FieldLabel className="text-left">
                {optionMap.SITE_TITLE?.name || '系统名称'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.SITE_TITLE?.description || '显示在浏览器标题栏和登录界面的系统名称'}
              </FieldDescription>
            </div>
            <Input
              value={form.SITE_TITLE}
              onChange={e => setForm(prev => ({ ...prev, SITE_TITLE: e.target.value }))}
              placeholder="请输入系统名称"
              maxLength={18}
              disabled={!isEdit}
              className="transition-none disabled:bg-transparent dark:disabled:bg-transparent"
            />
          </Field>

          {/* Beian */}
          <Field className="gap-1.5">
            <div className="flex flex-col gap-0.5">
              <FieldLabel className="text-left">{optionMap.SITE_BEIAN?.name || '备案号'}</FieldLabel>
              <FieldDescription>
                {optionMap.SITE_BEIAN?.description || '工信部 ICP 备案编号（如：京ICP备12345678号）'}
              </FieldDescription>
            </div>
            <Input
              value={form.SITE_BEIAN}
              onChange={e => setForm(prev => ({ ...prev, SITE_BEIAN: e.target.value }))}
              placeholder="请输入备案号"
              maxLength={30}
              disabled={!isEdit}
              className="transition-none disabled:bg-transparent dark:disabled:bg-transparent"
            />
          </Field>
        </div>

        {/* Row 2: Copyright */}
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
          {/* Copyright */}
          <Field className="gap-1.5">
            <div className="flex flex-col gap-0.5">
              <FieldLabel className="text-left">
                {optionMap.SITE_COPYRIGHT?.name || '版权声明'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.SITE_COPYRIGHT?.description || '显示在登录界面和管理页脚的版权信息'}
              </FieldDescription>
            </div>
            <Input
              value={form.SITE_COPYRIGHT}
              onChange={e => setForm(prev => ({ ...prev, SITE_COPYRIGHT: e.target.value }))}
              placeholder="请输入版权声明"
              disabled={!isEdit}
              className="transition-none disabled:bg-transparent dark:disabled:bg-transparent"
            />
          </Field>
        </div>

        {/* Row 3: System Description */}
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
          {/* System Description */}
          <Field className="gap-1.5 sm:col-span-2">
            <div className="flex flex-col gap-0.5">
              <FieldLabel className="text-left">
                {optionMap.SITE_DESCRIPTION?.name || '系统描述'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>{optionMap.SITE_DESCRIPTION?.description || '用于 SEO 的网站元描述'}</FieldDescription>
            </div>
            <Textarea
              value={form.SITE_DESCRIPTION}
              onChange={e => setForm(prev => ({ ...prev, SITE_DESCRIPTION: e.target.value }))}
              placeholder="请输入系统描述"
              rows={3}
              disabled={!isEdit}
              className="resize-none transition-none disabled:bg-transparent dark:disabled:bg-transparent"
            />
          </Field>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复基础配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
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
