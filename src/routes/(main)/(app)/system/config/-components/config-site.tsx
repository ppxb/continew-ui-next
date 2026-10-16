import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Globe,
  ImagePlus,
  LayoutDashboard,
  Lock,
  LogIn,
  Pencil,
  RefreshCw,
  RotateCcw,
  Undo2,
  Upload
} from 'lucide-react'

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
  const [previewMode, setPreviewMode] = React.useState<'admin' | 'login'>('admin')
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
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between border-b pb-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <Skeleton className="h-16 w-16 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="hidden flex-col rounded-xl border bg-card p-5 xl:flex">
          <Skeleton className="mb-3 h-6 w-28" />
          <Skeleton className="w-full flex-1 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Left Column: Configuration Form */}
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">网站基础配置</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">设置系统的名称、Logo、图标与版权等基础信息</p>
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

          {/* Form Fields with description */}
          <div className="flex flex-col gap-3.5">
            {/* Logo & Favicon row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Logo */}
              <Field className="gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel className="text-left font-medium">{optionMap.SITE_LOGO?.name || '系统 LOGO'}</FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {optionMap.SITE_LOGO?.description || '显示在登录界面和系统导航栏'}
                  </FieldDescription>
                </div>
                <div className="flex items-center">
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
                      'group relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/20 transition-all',
                      isEdit &&
                        'cursor-pointer hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    )}
                    title={isEdit ? '点击上传系统 LOGO' : undefined}
                  >
                    {form.SITE_LOGO ? (
                      <img src={form.SITE_LOGO} alt="Site Logo" className="size-full object-contain p-1.5" />
                    ) : (
                      <ImagePlus className="size-5 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                    )}
                    {isEdit && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <Upload className="size-3.5" />
                        <span className="mt-0.5 text-[9px] font-medium">点击上传</span>
                      </div>
                    )}
                  </div>
                </div>
              </Field>

              {/* Favicon */}
              <Field className="gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel className="text-left font-medium">
                    {optionMap.SITE_FAVICON?.name || '系统图标'}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {optionMap.SITE_FAVICON?.description || '浏览器标签页显示的网站图标'}
                  </FieldDescription>
                </div>
                <div className="flex items-center">
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
                      'group relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/20 transition-all',
                      isEdit &&
                        'cursor-pointer hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    )}
                    title={isEdit ? '点击上传系统图标' : undefined}
                  >
                    {form.SITE_FAVICON ? (
                      <img src={form.SITE_FAVICON} alt="Site Favicon" className="size-7 object-contain" />
                    ) : (
                      <ImagePlus className="size-5 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                    )}
                    {isEdit && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <Upload className="size-3.5" />
                        <span className="mt-0.5 text-[9px] font-medium">点击上传</span>
                      </div>
                    )}
                  </div>
                </div>
              </Field>
            </div>

            {/* Row 1: System Title & Beian */}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <Field className="gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel className="text-left font-medium">
                    {optionMap.SITE_TITLE?.name || '系统名称'}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {optionMap.SITE_TITLE?.description || '显示在浏览器标题栏和登录界面'}
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

              <Field className="gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel className="text-left font-medium">{optionMap.SITE_BEIAN?.name || '备案号'}</FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {optionMap.SITE_BEIAN?.description || '工信部 ICP 备案编号'}
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
            <Field className="gap-1.5">
              <div className="flex flex-col gap-0.5">
                <FieldLabel className="text-left font-medium">
                  {optionMap.SITE_COPYRIGHT?.name || '版权声明'}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldDescription className="text-xs text-muted-foreground">
                  {optionMap.SITE_COPYRIGHT?.description || '显示在登录界面和管理页脚'}
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

            {/* Row 3: System Description */}
            <Field className="gap-1.5">
              <div className="flex flex-col gap-0.5">
                <FieldLabel className="text-left font-medium">
                  {optionMap.SITE_DESCRIPTION?.name || '系统描述'}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldDescription className="text-xs text-muted-foreground">
                  {optionMap.SITE_DESCRIPTION?.description || '用于 SEO 的网站元描述'}
                </FieldDescription>
              </div>
              <Textarea
                value={form.SITE_DESCRIPTION}
                onChange={e => setForm(prev => ({ ...prev, SITE_DESCRIPTION: e.target.value }))}
                placeholder="请输入系统描述"
                rows={2}
                disabled={!isEdit}
                className="resize-none transition-none disabled:bg-transparent dark:disabled:bg-transparent"
              />
            </Field>
          </div>
        </div>

        {/* Right Column: Live Preview Panel (hidden on mobile, visible on xl+) */}
        <div className="hidden flex-col overflow-hidden rounded-xl border bg-card xl:flex">
          {/* Preview Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5 sm:px-5">
            <h2 className="text-base font-semibold">效果预览</h2>
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('admin')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  previewMode === 'admin'
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutDashboard className="size-3.5" />
                工作台视图
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('login')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  previewMode === 'login'
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LogIn className="size-3.5" />
                登录页视图
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="relative flex flex-1 flex-col bg-muted/30 p-3.5 sm:p-4">
            {/* Simulated Browser Window Mockup */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-background">
              {/* Browser Navigation / Tab Bar */}
              <div className="flex items-center gap-2.5 border-b bg-muted/50 px-3 py-2 text-xs">
                {/* Traffic light window controls */}
                <div className="flex shrink-0 items-center gap-1.5 pr-1">
                  <span className="size-2.5 rounded-full bg-red-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-400/80" />
                  <span className="size-2.5 rounded-full bg-emerald-400/80" />
                </div>

                {/* Tab: Favicon + Title */}
                <div className="flex max-w-[150px] items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-0.5 font-sans text-xs font-medium text-foreground">
                  {form.SITE_FAVICON ? (
                    <img src={form.SITE_FAVICON} alt="Favicon" className="size-3.5 shrink-0 object-contain" />
                  ) : (
                    <Globe className="size-3.5 shrink-0 text-primary" />
                  )}
                  <span className="truncate">{form.SITE_TITLE || '系统名称'}</span>
                </div>

                {/* URL Bar: rounded-full wrapper with green lock identifying https */}
                <div className="hidden flex-1 items-center justify-center sm:flex">
                  <div className="flex w-full max-w-[270px] items-center justify-center rounded-full border border-border/60 bg-background/90 px-3.5 py-0.5 font-sans text-xs text-muted-foreground">
                    <Lock className="mr-1 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">https://</span>
                    <span className="truncate text-foreground/80">admin.continew.top</span>
                  </div>
                </div>
              </div>

              {/* Viewport Content */}
              {previewMode === 'admin' ? (
                /* Admin Dashboard View: Only configured text shown, other parts use skeleton placeholders */
                <div className="flex flex-1 flex-col overflow-hidden text-xs">
                  <div className="flex flex-1">
                    {/* Mockup Sidebar */}
                    <div className="flex w-28 shrink-0 flex-col border-r bg-muted/20 p-2.5 sm:w-36">
                      {/* Brand: Configured Logo & Title */}
                      <div className="flex items-center gap-2 border-b pb-2">
                        {form.SITE_LOGO ? (
                          <img src={form.SITE_LOGO} alt="Logo" className="size-5 shrink-0 object-contain" />
                        ) : (
                          <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                            {(form.SITE_TITLE || 'C').charAt(0)}
                          </div>
                        )}
                        <span className="truncate text-xs font-semibold text-foreground">
                          {form.SITE_TITLE || '系统名称'}
                        </span>
                      </div>

                      {/* Menu items: Pure skeleton placeholders */}
                      <div className="mt-2.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 rounded-md bg-muted/70 p-1.5">
                          <div className="size-3 rounded-xs bg-muted-foreground/20" />
                          <div className="h-2 w-12 rounded bg-muted-foreground/25" />
                        </div>
                        <div className="flex items-center gap-2 rounded-md p-1.5">
                          <div className="size-3 rounded-xs bg-muted/70" />
                          <div className="h-2 w-14 rounded bg-muted/70" />
                        </div>
                        <div className="flex items-center gap-2 rounded-md p-1.5">
                          <div className="size-3 rounded-xs bg-muted/70" />
                          <div className="h-2 w-10 rounded bg-muted/70" />
                        </div>
                      </div>
                    </div>

                    {/* Mockup Main View */}
                    <div className="flex flex-1 flex-col justify-between overflow-hidden p-3">
                      <div className="space-y-2.5">
                        {/* Top bar header: Skeleton breadcrumb & avatar */}
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <div className="h-2 w-16 rounded bg-muted/60" />
                          <div className="size-4.5 rounded-full bg-muted/60" />
                        </div>

                        {/* Title & Description Banner: Configured items */}
                        <div className="rounded-lg border bg-gradient-to-br from-primary/5 via-card to-background p-2.5">
                          <h3 className="truncate text-xs font-semibold text-foreground">
                            {form.SITE_TITLE || '系统名称'}
                          </h3>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {form.SITE_DESCRIPTION || '系统描述信息'}
                          </p>
                        </div>

                        {/* Mockup widgets: Pure skeleton placeholders */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5 rounded-md border bg-card p-2">
                            <div className="h-2 w-10 rounded bg-muted/60" />
                            <div className="h-3 w-16 rounded bg-muted/80" />
                          </div>
                          <div className="space-y-1.5 rounded-md border bg-card p-2">
                            <div className="h-2 w-10 rounded bg-muted/60" />
                            <div className="h-3 w-16 rounded bg-muted/80" />
                          </div>
                        </div>

                        <div className="space-y-1.5 rounded-md border bg-card p-2">
                          <div className="h-2 w-20 rounded bg-muted/60" />
                          <div className="h-1.5 w-full rounded bg-muted/40" />
                          <div className="h-1.5 w-3/4 rounded bg-muted/40" />
                        </div>
                      </div>

                      {/* Footer: Configured Copyright and Beian */}
                      <div className="mt-2.5 space-y-0.5 border-t pt-2 text-center text-[10px] text-muted-foreground">
                        <div className="truncate">{form.SITE_COPYRIGHT || '版权声明'}</div>
                        {form.SITE_BEIAN && (
                          <div className="cursor-pointer truncate text-primary/80 hover:underline">
                            {form.SITE_BEIAN}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Login Page View: Only configured text shown, other parts use skeleton placeholders */
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="w-full max-w-[220px] space-y-3 text-center">
                      {/* Logo, Title & Description: Configured items */}
                      <div className="flex flex-col items-center gap-1.5">
                        {form.SITE_LOGO ? (
                          <img src={form.SITE_LOGO} alt="Logo" className="size-9 object-contain" />
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                            {(form.SITE_TITLE || 'C').charAt(0)}
                          </div>
                        )}
                        <h3 className="text-xs font-semibold tracking-tight text-foreground">
                          {form.SITE_TITLE || '系统名称'}
                        </h3>
                        <p className="line-clamp-2 text-[10px] text-muted-foreground">
                          {form.SITE_DESCRIPTION || '系统描述信息'}
                        </p>
                      </div>

                      {/* Login Form: Pure skeleton placeholders */}
                      <div className="space-y-1.5 pt-1">
                        <div className="h-6.5 w-full rounded-md border bg-muted/20" />
                        <div className="h-6.5 w-full rounded-md border bg-muted/20" />
                        <div className="h-6.5 w-full rounded-md bg-muted/70" />
                      </div>
                    </div>
                  </div>

                  {/* Footer: Configured Copyright and Beian */}
                  <div className="space-y-0.5 pt-2 text-center text-[10px] text-muted-foreground">
                    <div className="truncate">{form.SITE_COPYRIGHT || '版权声明'}</div>
                    {form.SITE_BEIAN && (
                      <div className="cursor-pointer truncate text-primary/80 hover:underline">{form.SITE_BEIAN}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
    </>
  )
}
