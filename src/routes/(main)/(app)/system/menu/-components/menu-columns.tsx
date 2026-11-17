import * as React from 'react'
import { z } from 'zod'
import { Database, ExternalLink, EyeOff, FileText, Folder, MousePointerClick, PenLine, Plus, Trash2 } from 'lucide-react'
import { cn } from 'cn'

import { BooleanCell, TypeBadge, type TypeTone } from '@/components/data-badge'
import { ParentTreeSelect } from '@/components/parent-tree-select'
import { TableDropdown, type ProColumns, type ProFieldColumn, type ProSchemaValueEnumType, type ProValues } from '@/components/pro'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/hooks/use-permission'
import { MENU_TYPE_MAP, type MenuReq, type MenuResp, type MenuType } from '@/lib/api/menu'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import { resolveMenuIcon } from '@/navigation/menu-icons'

import { toMenuNodeData } from './menu-tree'

const IconPicker = React.lazy(() => import('./icon-picker').then(mod => ({ default: mod.IconPicker })))
export type MenuAction = 'edit' | 'add-child' | 'delete'
const MENU_TYPE_TONES: Record<MenuType, TypeTone> = { 1: 'blue', 2: 'teal', 3: 'violet' }
const MENU_TYPE_OPTIONS = [
  { value: 1, label: '目录', icon: Folder, selectedClass: 'has-data-checked:border-sky-500/50 has-data-checked:bg-sky-500/10 has-data-checked:shadow-2xs has-data-checked:text-sky-700 dark:has-data-checked:text-sky-300' },
  { value: 2, label: '菜单', icon: FileText, selectedClass: 'has-data-checked:border-emerald-500/50 has-data-checked:bg-emerald-500/10 has-data-checked:shadow-2xs has-data-checked:text-emerald-700 dark:has-data-checked:text-emerald-300' },
  { value: 3, label: '按钮', icon: MousePointerClick, selectedClass: 'has-data-checked:border-purple-500/50 has-data-checked:bg-purple-500/10 has-data-checked:shadow-2xs has-data-checked:text-purple-700 dark:has-data-checked:text-purple-300' }
] as const

interface MenuColumnOptions {
  menuTree?: MenuResp[]
  menuId?: string | number | null
}

export function menuColumns({ menuTree = [], menuId = null }: MenuColumnOptions = {}) {
  const path: ProFieldColumn<MenuResp> = {
    title: '路由地址', dataIndex: 'path', order: 7,
    fieldProps: form => ({ placeholder: form?.getFieldValue('isExternal') ? 'https://example.com' : '/system/user' }),
    formItemProps: form => ({
      required: form.getFieldValue('type') === 2,
      description: form.getFieldValue('isExternal') ? '外部网页完整链接，以 http:// 或 https:// 开头' : '访问的前端路由路径，以 / 开头',
      rules: z.string().max(255, '路由地址不能超过 255 个字符').refine(value => form.getFieldValue('type') !== 2 || !!value.trim(), '菜单类型必须填写路由地址')
        .refine(value => !form.getFieldValue('isExternal') || !value || /^https?:\/\//i.test(value), '外链地址格式不正确，请以 http:// 或 https:// 开头')
    })
  }
  const name: ProFieldColumn<MenuResp> = { title: '组件名称', dataIndex: 'name', order: 6, fieldProps: { placeholder: '请输入组件名称' }, formItemProps: { rules: z.string().max(50, '组件名称不能超过 50 个字符') } }
  const component: ProFieldColumn<MenuResp> = { title: '组件路径', dataIndex: 'component', order: 6, fieldProps: { placeholder: '请输入组件路径' }, formItemProps: { rules: z.string().max(255, '组件路径不能超过 255 个字符') } }
  const permission: ProFieldColumn<MenuResp> = {
    title: '权限标识', dataIndex: 'permission', order: 5, fieldProps: { placeholder: '请输入权限标识' },
    formItemProps: { rules: z.string().max(100, '权限标识不能超过 100 个字符') },
    render: (_, menu) => menu.permission ? <Badge variant="secondary">{menu.permission}</Badge> : <span>{EMPTY_PLACEHOLDER}</span>
  }
  const redirect: ProFieldColumn<MenuResp> = { title: '重定向地址', dataIndex: 'redirect', order: 5, fieldProps: { placeholder: '请输入重定向地址' }, formItemProps: { rules: z.string().max(255, '重定向地址不能超过 255 个字符') } }
  const isHidden: ProFieldColumn<MenuResp> = {
    title: (_, type) => type === 'form' ? '隐藏菜单' : '隐藏', dataIndex: 'isHidden', valueType: 'switch', order: 3, initialValue: false,
    fieldProps: { checkedValue: true, uncheckedValue: false },
    formItemProps: form => ({ rules: z.boolean(), required: false, className: 'sm:col-span-2', description: form.getFieldValue('isHidden') ? '已隐藏，不会在侧边栏导航中展示' : '正常在侧边栏导航中展示' }),
    render: (_, menu) => <BooleanCell active={menu.isHidden} label="隐藏" icon={<EyeOff />} />
  }
  const isExternal: ProFieldColumn<MenuResp> = {
    title: (_, type) => type === 'form' ? '是否外链' : '外链', dataIndex: 'isExternal', valueType: 'switch', order: 2, initialValue: false,
    fieldProps: { checkedValue: true, uncheckedValue: false },
    formItemProps: form => ({ rules: z.boolean(), required: false, className: 'sm:col-span-2', description: form.getFieldValue('isExternal') ? '开启后点击将通过新标签页打开外部链接' : '内部前端路由页面' }),
    render: (_, menu) => <BooleanCell active={menu.isExternal} label="外链" icon={<ExternalLink />} />
  }
  const isCache: ProFieldColumn<MenuResp> = {
    title: (_, type) => type === 'form' ? '是否缓存' : '缓存', dataIndex: 'isCache', valueType: 'switch', order: 1, initialValue: false,
    fieldProps: { checkedValue: true, uncheckedValue: false },
    formItemProps: form => ({ rules: z.boolean(), required: false, className: 'sm:col-span-2', description: form.getFieldValue('isCache') ? '开启 KeepAlive 缓存，切换路由时保持页面状态' : '不缓存页面' }),
    render: (_, menu) => <BooleanCell active={menu.isCache} label="缓存" icon={<Database />} />
  }
  return [
    {
      title: '菜单名称', dataIndex: 'title', hideInForm: true, hideInSetting: true,
      render: (_, menu) => {
        const Icon = menu.icon ? resolveMenuIcon(menu.icon) : Folder
        return <div className="flex items-center gap-2">{menu.type !== 3 && <Icon className="size-4 shrink-0 text-muted-foreground" />}
          <span className={cn('truncate text-sm', menu.type === 1 && 'font-medium text-foreground', menu.type === 2 && 'text-foreground', menu.type === 3 && 'text-muted-foreground')}>{menu.title}</span>
        </div>
      }
    },
    {
      title: (_, type) => type === 'form' ? '菜单类型' : '类型', dataIndex: 'type', initialValue: 2, order: 11,
      formItemProps: { rules: z.literal([1, 2, 3]), required: false, className: 'sm:col-span-2', description: menuId !== null ? '编辑菜单时不支持修改菜单类型' : undefined },
      render: (_, menu) => <TypeBadge tone={MENU_TYPE_TONES[menu.type]} label={MENU_TYPE_MAP[menu.type]} />,
      formItemRender: (_schema, { id, value, onChange, onBlur, invalid }, form) => {
        const disabled = menuId !== null || form.isSubmitting
        return <RadioGroup id={id} aria-invalid={invalid} onBlur={onBlur} value={String(value)} onValueChange={next => onChange(Number(next))} disabled={disabled} className="grid grid-cols-3 gap-2">
          {MENU_TYPE_OPTIONS.map(option => <Label key={option.value} className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors border-border/60 bg-muted/30 text-muted-foreground',
            'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted/60 hover:text-foreground', option.selectedClass
          )}><RadioGroupItem value={String(option.value)} className="absolute size-0 opacity-0" /><option.icon className="size-4 shrink-0" /><span>{option.label}</span></Label>)}
        </RadioGroup>
      }
    },
    { ...path, hideInForm: true }, { ...name, hideInForm: true }, { ...component, hideInForm: true }, { ...permission, hideInForm: true },
    {
      title: '排序', dataIndex: 'sort', valueType: 'digit', initialValue: 1, order: 8,
      fieldProps: { min: 1, placeholder: '数值越小越靠前' },
      formItemProps: { rules: z.number('请输入排序').int('排序必须为整数').min(1, '排序最小值为 1') }
    },
    {
      title: (_, type) => type === 'form' ? '菜单状态' : '状态', dataIndex: 'status', valueType: 'switch', initialValue: 1, order: 4,
      valueEnum: new Map<1 | 2, ProSchemaValueEnumType>([[1, { text: '启用', status: 'Success' }], [2, { text: '禁用', status: 'Error' }]]),
      formItemProps: form => ({ rules: z.literal([1, 2]), required: false, className: 'sm:col-span-2', description: form.getFieldValue('status') === 1
        ? '启用状态，正常在系统导航与权限中生效' : '禁用状态，该菜单及按钮将不可用' })
    },
    { ...isHidden, hideInForm: true }, { ...isExternal, hideInForm: true }, { ...isCache, hideInForm: true },
    {
      title: '上级菜单', dataIndex: 'parentId', hideInTable: true, order: 10, initialValue: null,
      formItemProps: { rules: z.union([z.string(), z.number()]).nullable().optional(), className: 'sm:col-span-2', required: false },
      formItemRender: (_schema, { id, value, onChange, invalid }, form) => <ParentTreeSelect id={id} value={value as string | number | null} onChange={onChange}
        data={menuTree} currentId={menuId} toNodeData={toMenuNodeData} disabled={form.isSubmitting} invalid={invalid}
        placeholder="选择上级菜单（默认根目录）" searchPlaceholder="搜索上级菜单" emptyText="未找到相关菜单" allOptionLabel="根目录" />
    },
    {
      valueType: 'dependency', name: ['type'], columns: ({ type }) => {
        const fields: ProFieldColumn<MenuResp>[] = [
          {
            title: type === 3 ? '按钮名称' : '菜单名称', dataIndex: 'title', hideInTable: true, order: 9,
            fieldProps: { placeholder: type === 3 ? '例如：新增' : '例如：用户管理' },
            formItemProps: { rules: z.string().min(1, '标题不能为空').max(30, '标题长度不能超过 30 个字符') }
          },
          ...(type !== 3 ? [path, {
            title: '菜单图标', dataIndex: 'icon', hideInTable: true, order: 7, initialValue: null,
            formItemProps: { rules: z.string().nullable().optional(), required: false },
            formItemRender: (_schema, { id, value, onChange, onBlur, invalid }, form) => <React.Suspense fallback={<Skeleton className="h-9 w-full" />}>
              <IconPicker id={id} invalid={invalid} onBlur={onBlur} value={value as string | null} onChange={onChange} disabled={form.isSubmitting} />
            </React.Suspense>
          } satisfies ProColumns<MenuResp>, isHidden, isExternal] : []),
          ...(type === 2 ? [name, component, permission, redirect, isCache] : type === 1
            ? [{ ...redirect, formItemProps: { ...redirect.formItemProps, className: 'sm:col-span-2' } }]
            : [{ ...permission, order: 7, formItemProps: { ...permission.formItemProps, className: 'sm:col-span-2', description: '接口鉴权代码' } }])
        ]
        return fields.map(column => ({ ...column, hideInTable: true, hideInSetting: true, hideInDescriptions: true }))
      }
    }
  ] as const satisfies readonly ProColumns<MenuResp>[]
}

/** Values have already passed the active column rules; clear fields excluded by menu type. */
export function toMenuPayload(values: ProValues): MenuReq {
  const value = values as Partial<MenuReq> & Pick<MenuReq, 'type' | 'title' | 'sort' | 'status'>
  return {
    type: value.type, title: value.title.trim(), parentId: value.parentId || null, sort: value.sort, status: value.status,
    icon: value.type !== 3 ? value.icon || null : null,
    path: value.type !== 3 ? value.path?.trim() || null : null,
    name: value.type === 2 ? value.name?.trim() || null : null,
    component: value.type === 2 ? value.component?.trim() || null : null,
    redirect: value.type !== 3 ? value.redirect?.trim() || null : null,
    permission: value.type !== 1 ? value.permission?.trim() || null : null,
    isExternal: value.type !== 3 ? value.isExternal ?? false : false,
    isCache: value.type === 2 ? value.isCache ?? false : false,
    isHidden: value.type !== 3 ? value.isHidden ?? false : false
  }
}

function MenuRowActions({ menu, onAction }: { menu: MenuResp; onAction: (action: MenuAction, menu: MenuResp) => void }) {
  const { hasPermission } = usePermission()
  return <TableDropdown<MenuAction> onSelect={action => onAction(action, menu)} menus={[
    hasPermission('system:menu:update') && { key: 'edit', name: '修改菜单', icon: <PenLine /> },
    hasPermission('system:menu:create') && menu.type !== 3 && { key: 'add-child', name: '添加下级', icon: <Plus /> },
    { type: 'divider' },
    hasPermission('system:menu:delete') && { key: 'delete', name: '删除', icon: <Trash2 />, danger: true }
  ]} />
}

export function createMenuColumns(onAction: (action: MenuAction, menu: MenuResp) => void): readonly ProColumns<MenuResp>[] {
  return [...menuColumns(), { title: '操作', valueType: 'option', render: (_, menu) => <MenuRowActions menu={menu} onAction={onAction} /> }]
}
