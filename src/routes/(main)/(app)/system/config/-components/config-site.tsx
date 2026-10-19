import * as React from 'react'

import { useStore } from '@tanstack/react-form'

import { Check, Globe, LayoutDashboard, Lock, LogIn, Pencil, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'
import { z } from 'zod'

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
import { Spinner } from '@/components/ui/spinner'
import { usePermission } from '@/hooks/use-permission'
import { cn } from 'cn'

import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { ImageUploadField } from './image-upload-field'
import { TextField } from './text-field'
import { type OptionMap, useOptionForm } from './use-option-form'

const nonBlank = (message: string) => z.string().trim().min(1, message)

const schema = z.object({
  SITE_LOGO: z.string(),
  SITE_FAVICON: z.string(),
  SITE_TITLE: nonBlank('请输入系统名称').max(18, '系统名称最多 18 个字符'),
  SITE_DESCRIPTION: nonBlank('请输入系统描述'),
  SITE_COPYRIGHT: nonBlank('请输入版权声明'),
  SITE_BEIAN: z.string().max(30, '备案号最多 30 个字符')
})

type SiteFormState = z.infer<typeof schema>

function toForm(optionMap: OptionMap): SiteFormState {
  return {
    SITE_LOGO: optionMap.SITE_LOGO?.value || '',
    SITE_FAVICON: optionMap.SITE_FAVICON?.value || '',
    SITE_TITLE: optionMap.SITE_TITLE?.value || '',
    SITE_DESCRIPTION: optionMap.SITE_DESCRIPTION?.value || '',
    SITE_COPYRIGHT: optionMap.SITE_COPYRIGHT?.value || '',
    SITE_BEIAN: optionMap.SITE_BEIAN?.value || ''
  }
}

const isRequired = (field: keyof SiteFormState) => !schema.shape[field].safeParse('').success

export function ConfigSite() {
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:siteConfig:update')

  const [previewMode, setPreviewMode] = React.useState<'admin' | 'login'>('admin')

  const {
    form,
    optionMap,
    isLoading,
    isError,
    refetch,
    isEdit,
    setIsEdit,
    cancelEdit,
    resetForm,
    submit,
    resetToDefault,
    isResetting,
    resetDialogOpen,
    setResetDialogOpen
  } = useOptionForm({ category: 'SITE', toForm, schema })

  const values = useStore(form.store, state => state.values)

  if (isLoading) {
    return <ConfigPanelSkeleton variant="card" />
  }

  if (isError) {
    return <ConfigPanelError onRetry={() => void refetch()} />
  }

  return (
    <>
      <form
        noValidate
        className="grid grid-cols-1 gap-5 xl:grid-cols-2"
        onSubmit={event => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">网站基础配置</h2>
              <p className="text-muted-foreground">设置系统的名称、Logo、图标与版权等基础信息</p>
            </div>
            <div className="flex items-center gap-2">
              {!isEdit ? (
                <>
                  {canUpdate && (
                    <Button size="sm" onClick={() => setIsEdit(true)}>
                      <Pencil />
                      修改
                    </Button>
                  )}
                  {canUpdate && (
                    <Button size="sm" variant="outline" onClick={() => setResetDialogOpen(true)}>
                      <RotateCcw />
                      恢复默认
                    </Button>
                  )}
                </>
              ) : (
                <form.Subscribe selector={state => state.isSubmitting}>
                  {isSubmitting => (
                    <>
                      <Button type="submit" size="sm" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner /> : <Check />}
                        保存
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                        <RefreshCw />
                        重置
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={isSubmitting}>
                        <Undo2 />
                        取消
                      </Button>
                    </>
                  )}
                </form.Subscribe>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Field name="SITE_LOGO" validators={{ onSubmit: schema.shape.SITE_LOGO }}>
                {field => (
                  <ImageUploadField
                    label={optionMap.SITE_LOGO?.name}
                    description={optionMap.SITE_LOGO?.description}
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={!isEdit}
                  />
                )}
              </form.Field>

              <form.Field name="SITE_FAVICON" validators={{ onSubmit: schema.shape.SITE_FAVICON }}>
                {field => (
                  <ImageUploadField
                    label={optionMap.SITE_FAVICON?.name}
                    description={optionMap.SITE_FAVICON?.description}
                    accept="image/*,.ico"
                    previewClassName="size-7 object-contain"
                    invalidFileMessage="请选择有效的图标文件"
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={!isEdit}
                  />
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <form.Field name="SITE_TITLE" validators={{ onSubmit: schema.shape.SITE_TITLE }}>
                {field => (
                  <TextField
                    field={field}
                    label={optionMap.SITE_TITLE?.name}
                    description={optionMap.SITE_TITLE?.description}
                    placeholder="请输入系统名称"
                    maxLength={18}
                    required={isRequired('SITE_TITLE')}
                    disabled={!isEdit}
                  />
                )}
              </form.Field>

              <form.Field name="SITE_BEIAN" validators={{ onSubmit: schema.shape.SITE_BEIAN }}>
                {field => (
                  <TextField
                    field={field}
                    label={optionMap.SITE_BEIAN?.name}
                    description={optionMap.SITE_BEIAN?.description}
                    placeholder="请输入备案号"
                    maxLength={30}
                    required={isRequired('SITE_BEIAN')}
                    disabled={!isEdit}
                  />
                )}
              </form.Field>
            </div>

            <form.Field name="SITE_COPYRIGHT" validators={{ onSubmit: schema.shape.SITE_COPYRIGHT }}>
              {field => (
                <TextField
                  field={field}
                  label={optionMap.SITE_COPYRIGHT?.name}
                  description={optionMap.SITE_COPYRIGHT?.description}
                  placeholder="请输入版权声明"
                  required={isRequired('SITE_COPYRIGHT')}
                  disabled={!isEdit}
                />
              )}
            </form.Field>

            <form.Field name="SITE_DESCRIPTION" validators={{ onSubmit: schema.shape.SITE_DESCRIPTION }}>
              {field => (
                <TextField
                  field={field}
                  label={optionMap.SITE_DESCRIPTION?.name}
                  description={optionMap.SITE_DESCRIPTION?.description}
                  placeholder="请输入系统描述"
                  multiline
                  rows={2}
                  required={isRequired('SITE_DESCRIPTION')}
                  disabled={!isEdit}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="hidden flex-col overflow-hidden rounded-xl border bg-card xl:flex">
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

          <div className="relative flex flex-1 flex-col bg-muted/30 p-3.5 sm:p-4">
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-background">
              <div className="flex items-center gap-2.5 border-b bg-muted/50 px-3 py-2 text-xs">
                <div className="flex shrink-0 items-center gap-1.5 pr-1">
                  <span className="size-2.5 rounded-full bg-red-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-400/80" />
                  <span className="size-2.5 rounded-full bg-emerald-400/80" />
                </div>

                <div className="flex max-w-[150px] items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-0.5 font-sans text-xs font-medium text-foreground">
                  {values.SITE_FAVICON ? (
                    <img src={values.SITE_FAVICON} alt="Favicon" className="size-3.5 shrink-0 object-contain" />
                  ) : (
                    <Globe className="size-3.5 shrink-0 text-primary" />
                  )}
                  <span className="truncate">{values.SITE_TITLE || '系统名称'}</span>
                </div>

                <div className="hidden flex-1 items-center justify-center sm:flex">
                  <div className="flex w-full max-w-[270px] items-center justify-center rounded-full border border-border/60 bg-background/90 px-3.5 py-0.5 font-sans text-xs text-muted-foreground">
                    <Lock className="mr-1 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">https://</span>
                    <span className="truncate text-foreground/80">admin.continew.top</span>
                  </div>
                </div>
              </div>

              {previewMode === 'admin' ? (
                <div className="flex flex-1 flex-col overflow-hidden text-xs">
                  <div className="flex flex-1">
                    <div className="flex w-28 shrink-0 flex-col border-r bg-muted/20 p-2.5 sm:w-36">
                      <div className="flex items-center gap-2 border-b pb-2">
                        {values.SITE_LOGO ? (
                          <img src={values.SITE_LOGO} className="size-5 shrink-0 object-contain" />
                        ) : (
                          <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                            {values.SITE_TITLE.charAt(0)}
                          </div>
                        )}
                        <span className="truncate text-xs font-semibold text-foreground">{values.SITE_TITLE}</span>
                      </div>

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

                    <div className="flex flex-1 flex-col justify-between overflow-hidden p-3">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <div className="h-2 w-16 rounded bg-muted/60" />
                          <div className="size-4.5 rounded-full bg-muted/60" />
                        </div>

                        <div className="rounded-lg border bg-gradient-to-br from-primary/5 via-card to-background p-2.5">
                          <h3 className="truncate font-semibold">{values.SITE_TITLE}</h3>
                          <p className="line-clamp-2 leading-relaxed text-muted-foreground">
                            {values.SITE_DESCRIPTION}
                          </p>
                        </div>

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

                      <div className="mt-2.5 space-y-0.5 border-t pt-2 text-center text-[10px] text-muted-foreground">
                        <div className="truncate">{values.SITE_COPYRIGHT}</div>
                        {values.SITE_BEIAN && (
                          <div className="cursor-pointer truncate text-primary/80 hover:underline">
                            {values.SITE_BEIAN}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="w-full max-w-[220px] space-y-3 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {values.SITE_LOGO ? (
                          <img src={values.SITE_LOGO} alt="Logo" className="size-9 object-contain" />
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                            {values.SITE_TITLE.charAt(0)}
                          </div>
                        )}
                        <h3 className="font-semibold tracking-tight text-foreground">{values.SITE_TITLE}</h3>
                        <p className="line-clamp-2 text-[10px] text-muted-foreground">{values.SITE_DESCRIPTION}</p>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="h-6.5 w-full rounded-md border bg-muted/20" />
                        <div className="h-6.5 w-full rounded-md border bg-muted/20" />
                        <div className="h-6.5 w-full rounded-md bg-muted/70" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5 pt-2 text-center text-[10px] text-muted-foreground">
                    <div className="truncate">{values.SITE_COPYRIGHT}</div>
                    {values.SITE_BEIAN && (
                      <div className="cursor-pointer truncate text-primary/80 hover:underline">{values.SITE_BEIAN}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复基础配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={resetToDefault} disabled={isResetting}>
              {isResetting ? <Spinner className="size-4" /> : null}
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
