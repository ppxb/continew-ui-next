# 公共业务组件使用说明

本文说明 `src/components/` 下的公共业务组件怎么用。示例都取自已经迁移的页面，可以对照源码看。

## 配置式页面：ProComponents 风格

标准页面优先使用 `@/components/pro`。一份 `columns` 描述字段，表格、搜索、新增/修改和详情共享它；其余章节的组件仍用于复杂手写页面和内部组合。

已落地样板：`src/routes/(main)/(app)/open/app/-components/app-columns.tsx`。`app-list.tsx` 使用 `ProTable`，`app-form-drawer.tsx` 使用 `BetaSchemaForm`，`app-detail-drawer.tsx` 使用 `ProDescriptions`；三个入口都读取 `appColumns`，不再各写一遍字段。

```tsx
import { z } from 'zod'
import { BetaSchemaForm, ProDescriptions, ProTable, type ProColumns } from '@/components/pro'

type Item = { id: string; name: string; status: 1 | 2 }

const columns = [
  { title: '序号', valueType: 'index' },
  { title: '名称', dataIndex: 'name', search: true,
    formItemProps: { rules: z.string().trim().min(1, '请输入名称') } },
  { title: '状态', dataIndex: 'status', valueType: 'switch', initialValue: 1,
    valueEnum: new Map([
      [1, { text: '启用', status: 'Success' as const }],
      [2, { text: '禁用', status: 'Error' as const }]
    ]) }
] as const satisfies readonly ProColumns<Item>[]

// request 把接口的 page/size、list/total 适配成 current/pageSize、data/total。
<ProTable<Item>
  columns={columns}
  rowKey="id"
  queryKey={['items', 'list']}
  pagination={{ align: 'right', showQuickJumper: true }}
  request={async ({ current, pageSize, ...filters }, _sort, _filter, signal) => {
    const result = await listItems({ ...filters, page: current, size: pageSize }, signal)
    return { data: result.list, total: result.total }
  }}
/>

<BetaSchemaForm<Item, typeof columns>
  columns={columns}
  layoutType="DrawerForm"
  title="新增记录"
  open={open}
  onOpenChange={setOpen}
  onFinish={async values => { await saveItem(values); return true }}
/>

<ProDescriptions columns={columns} dataSource={record} />
```

接口函数和页面状态由调用方提供。表格管理分页、查询缓存、取消请求、加载/错误/空状态、列显隐、刷新和全屏；表单管理校验、回填、提交和关闭保护。

| 列配置 | 用途 |
|---|---|
| `title`、`dataIndex`、`key` | 标签、实体字段名、稳定列标识；`title` 可按 `type` 返回不同标签 |
| `valueType` | `text`、`textarea`、`password`、`digit`、`select`、`switch`、`dateTime`、`dateRange`、`dateTimeRange`、`index`、`option`；项目注册了 `expiry` 和 `deptTreeSelect` |
| `valueEnum` | 只读标签/徽标和编辑选项；数字、布尔键用 `Map`，对象键是字符串 |
| `fieldProps`、`formItemProps` | 控件属性、字段说明/必填标记和 zod `rules`，可写函数读取当前表单与实体 |
| `hideInTable`、`hideInForm`、`hideInDescriptions` | 各场景独立隐藏；表单提交会排除隐藏字段和已消失的条件字段 |
| `search: true`、`search.transform` | 列默认不生成搜索控件；显式开启，或转换为接口要求的筛选参数 |
| `initialValue`、`convertValue` | 新增默认值、记录到表单的值转换；搜索默认值另外写在 `ProTable.form.initialValues` |
| `renderText`、`render`、`formItemRender` | 改只读值、改只读节点、改受控编辑控件；名字跟 ProComponents 3.x，不提供旧别名 |
| `dependencies`、`valueType: 'dependency'` | 函数属性联动，以及根据依赖值生成条件子列；活动规则一起校验并执行转换 |
| `request`、`params`、`proFieldProps.proFieldKey` | 异步选项；提供 query key，让字典缓存可共享和失效 |
| `ellipsis`、`copyable`、`align`、`span`、`order` | 截断、复制、列对齐、详情跨列、表单字段排序 |

注意：

- 字段型搜索即时生效；工具栏 `options.search` 的关键字框沿用防抖。导出时读 `formRef.current.getFieldsFormatValue()`，得到列表已经生效的筛选，而不是尚未生效的输入草稿。
- `onFinish` 收到 zod 输出，`.trim()`、`.transform()` 已执行。返回真值才关闭抽屉；返回假值、无返回值或请求失败都保持打开。提交中禁止重复提交和关闭。
- 修改表单用 `request`、`queryKey` 和可选 `params`，每次打开重新请求；无 `params` 时直接复用完整详情 key。有 `params` 时追加到 key。表单和详情缓存都是原始实体，不是 `{ data }` 包装。
- `actionRef.current.reload()` 取消目标页的旧请求，再等待新结果；`reload(true)` 先回第一页。`reset()` 恢复搜索默认值；`setPageInfo()` 可切页。
- `pagination={false}` 不传分页参数；`expandable` 描述树子节点和展开状态；`postData` 可过滤缓存中的树，无须重新请求。
- `pagination.align` 可选 `'left'`、`'center'`、`'right'`，默认 `'right'`，控制整组分页信息的对齐。顺序是总条数、页码、每页条数、跳页输入。
- `pagination.showQuickJumper` 默认 `true`。在「跳至」输入页码，按 Enter 或失焦跳转；空值、负数、小数和非数字不跳转，超过总页数会跳到末页，`0` 会跳到第一页。跳转后清空输入。
- 手写 `DataTable` 同样支持 `pagination={{ align: 'center', showQuickJumper: false }}`；直接使用 `TablePagination` 时传 `align`、`showQuickJumper`。
- 自定义类型通过 `ProConfigProvider.valueTypeMap` 注册读/编辑实现，类型通过声明合并登记。项目注册表在 `src/components/pro-value-types.tsx`，已经在根组件挂载。
- 配置是类型化 TS 对象，不是纯 JSON：zod 和渲染/联动函数仍在代码里。没有引入 antd 或新依赖。
- 主后台页面已迁移到配置式组件；权限／成员选择器、文件网格、上传队列、看板图表等专用控件保留原布局和行为。

### 已迁移模块

| 模块 | 封装组件 |
|---|---|
| 应用、用户、租户 | `ProTable`、`BetaSchemaForm`、`ProDescriptions` |
| 部门、菜单、角色 | 树／本地数据 `ProTable`、条件表单；角色新增配置式详情 |
| 字典、套餐 | 主从／嵌入式表格、配置式表单；套餐菜单树仍保留原授权逻辑 |
| 定时任务、公告 | 配置式列表／详情／表单；分片参数、富文本、存草稿／发布自定义底栏 |
| 日志、在线会话、短信日志 | 配置式筛选、分页、导出及原有动作 |
| 客户端、短信、存储配置 | 配置式列表／表单；存储分组保留独立表格和高级字段折叠区 |
| 网站、安全、登录、邮件配置 | `BetaSchemaForm(Form)`，保留原编辑、取消、恢复默认及批量保存控制器 |
| 文件管理、个人资料 | 文件列表／元信息／名称表单；资料描述与密码表单。网格、上传和专用侧栏不强行套成 CRUD |

### 复杂页面的保真选项

- `ProTable` 的 `dataSource` 模式接收上游查询的数据，内部执行一次客户端分页；不同时传 `request`。`loading`、`isError`、`isShowingPreviousRows` 保留查询状态，`reload` 失效 `queryKey` 前缀以刷新上游查询。
- `embedded` 让表格继承既有固定／flex 面板的剩余高度，不再单独测量视口。字典侧栏、文件列表及存储分组使用此模式。
- `options.search.delay` 可调整关键字防抖；`0` 只用于轻量即时过滤。菜单树沿用默认 300ms 防抖，搜索自动展开匹配的祖先路径，清空后恢复搜索前的手动展开状态。`onSearch` 返回 `false` 交由调用方筛选；清空仍调用它，不把未生效的关键字混入导出快照。
- `useAvailableHeight` 统一读取视口位置及祖先底部内边距、边框、外边距后，只在高度改变时写入 CSS 变量；不通过反复改高度、读取 `scrollHeight` 来试探页面溢出。固定定位的全屏容器不扣除外层页面留白；隐藏面板保留上次高度。
- 登录菜单共享现有 5 分钟查询时效，新鲜缓存不因切页重复请求。恢复本地菜单时立即渲染缓存，同时后台重验证；过期或显式失效后重新获取。菜单增改删除、清缓存、角色权限和成员变更、用户角色变更成功后，除业务查询键外还须失效 `MENU_QUERY_KEY`，让已挂载的导航立即刷新。
- `BetaSchemaForm.grid` 启用两列布局；`formItemsRender(items)` 可按 `name` 把已经注册的 `dom` 分组，字段仍进入统一校验和提交。存储高级字段没有被合并成一份不透明对象。
- `submitter.render(props, dom)` 自定义底栏，通过 `props.submit()` 进入统一校验；`form.isSubmitting` 从校验开始到请求结束都表示占用，标准字段自动禁用，自定义控件可读 `control.disabled`，避免草稿／发布快速连点改写状态。
- `dependency` 里的共享字段不会丢掉：列表／搜索／列设置按默认依赖展开，详情按记录展开。表单专用克隆需标记 `hideInTable`／`hideInDescriptions`，避免重复列。

### 默认主题与上游同步

默认 `blue` 已重定义为 Arco 配色，选项名称为 `霁蓝`：浅色主色 `#165DFF`、深色主色 `#3C7EFF`；配套背景、卡片、边框、强调和状态颜色采用官方调色板。无主题属性的根节点也应用此默认色，保存的自定义主色仍优先，不重置其他主题。

配色依据：[Arco 调色板](https://github.com/arco-design/arco-design/blob/main/components/style/theme/color/compiled-colors.less) 与 [全局语义变量](https://github.com/arco-design/arco-design/blob/main/components/style/theme/global.less)。没有安装 Arco 组件库。

基于上游 `ppxb/continew-ui-next` 的 `4094d17` 做了兼容回移：用户导入与解析覆盖层、用户／角色详情主按钮、SITE 保存和默认恢复后刷新公开配置、租户编码登录、认证反馈、主题／全屏无障碍名称、其他暗色主题的独立 secondary 表面、无用地理依赖及资料占位字段清理。没有用上游整套 shell／偏好架构覆盖现有 Pro 和布局，也没有重复增加已有跳页功能。

---

| 组件 | 位置 | 用途 |
|---|---|---|
| `useAppForm` 和字段组件 | `src/components/form/` | 表单抽屉里的输入框、下拉框、开关、底栏 |
| `FormShell` | `src/components/form/form-shell.tsx` | 抽屉里的 `<form>`：可滚动的字段区加固定底栏，负责提交和聚焦第一个错误字段 |
| `CustomField` | `src/components/form/custom-field.tsx` | 自定义控件（树选择、日期选择等）的标签和错误提示外壳 |
| `FormItem` | `src/components/form/form-item.tsx` | 不绑定单个字段的行的标签和错误提示外壳 |
| `ConfirmDialog` | `src/components/confirm-dialog.tsx` | 需要用户确认的操作，如重置、强退 |
| `DeleteConfirmDialog` | `src/components/delete-confirm-dialog.tsx` | 删除确认 |
| `ToneBadge` | `src/components/tone-badge.tsx` | 状态和类型徽标 |
| `FormSkeleton` | `src/components/form-skeleton.tsx` | 编辑抽屉加载详情时的骨架屏 |
| 列定义 helper | `src/components/table/columns.tsx` | 表格的序号、文本、时间、状态、操作列 |

---

## 一、表单

### 1. 基本用法

用 `useAppForm` 代替 TanStack Form 的 `useForm`，参数完全相同。表单用 `form.AppForm` 和 `form.FormShell` 包起来，字段写在 `form.AppField` 里，回调参数 `field` 上挂着已注册的字段组件。

```tsx
import { revalidateLogic } from '@tanstack/react-form'
import { z } from 'zod'

import { useAppForm } from '@/components/form'
import { FieldGroup } from '@/components/ui/field'

const formSchema = z.object({
  name: z.string().trim().min(1, '应用名称不能为空').max(100, '应用名称长度不能超过 100 个字符'),
  description: z.string().max(200, '描述长度不能超过 200 个字符'),
  status: z.number().int().min(1).max(2)
})

const form = useAppForm({
  defaultValues: { name: '', description: '', status: 1 },
  validationLogic: revalidateLogic(),
  validators: { onDynamic: formSchema },
  onSubmit: async ({ value }) => {
    await createApp(value)
  }
})

<form.AppForm>
  <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
    <FieldGroup className="gap-4">
      <form.AppField name="name" validators={{ onDynamic: formSchema.shape.name }}>
        {field => <field.TextInput label="应用名称" required maxLength={100} placeholder="请输入应用名称" />}
      </form.AppField>

      <form.AppField name="description" validators={{ onDynamic: formSchema.shape.description }}>
        {field => <field.TextareaInput label="应用描述" rows={3} maxLength={200} />}
      </form.AppField>

      <form.AppField name="status">
        {field => (
          <field.SwitchInput
            label="状态"
            description={field.state.value === 1 ? '启用后允许调用开放 API 接口' : '禁用后阻止所有调用请求'}
          />
        )}
      </form.AppField>
    </FieldGroup>
  </form.FormShell>
</form.AppForm>
```

几点约定：

- `name` 写错时 TypeScript 会报错，组件读到的值类型也随字段推导。
- `required` 只负责画红色星号，字段是否必填仍由 zod schema 决定。两者要保持一致。
- 标签会自动关联控件，点击标签会聚焦输入框。
- 字段出错时，控件会带上 `aria-invalid="true"`。提交失败后，`FormShell` 会聚焦第一个带这个属性的控件。

完整示例：`src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx`。

### 2. 字段组件

所有字段组件都接受以下属性：

| 属性 | 类型 | 说明 |
|---|---|---|
| `label` | `ReactNode` | 标签文字 |
| `description` | `ReactNode` | 控件下方的说明；开关类组件显示在标签下方 |
| `required` | `boolean` | 是否显示必填星号 |
| `hideDescriptionOnError` | `boolean` | 字段出错时隐藏说明，只显示错误，避免两行文字叠在一起 |
| `className` | `string` | 加在字段外层，常用于网格布局里跨两列：`className="sm:col-span-2"` |

#### TextInput：单行文本

字段类型：`string`。

| 属性 | 说明 |
|---|---|
| `type` | `'text' \| 'email' \| 'tel' \| 'url'`，默认 `'text'`。密码请用 `PasswordInput` |
| `addonStart` | 输入框开头的前缀，如「http(s)://」 |
| `addonEnd` | 输入框末尾的单位或提示，如「秒」 |
| 其余 | 透传原生 `<input>` 属性，如 `maxLength`、`placeholder`、`autoComplete`、`disabled`、`inputMode` |

```tsx
<form.AppField name="phone">
  {field => (
    <field.TextInput label="手机号码" type="tel" maxLength={14} placeholder="请输入手机号码" autoComplete="off" />
  )}
</form.AppField>

<form.AppField name="domain">
  {field => <field.TextInput label="域名" addonStart="http(s)://" maxLength={255} />}
</form.AppField>
```

#### PasswordInput：密码

字段类型：`string`。带显示/隐藏按钮，其余属性透传原生 `<input>`。

规则提示和错误只显示一个：

```tsx
<form.AppField name="password">
  {field => (
    <field.PasswordInput
      label="密码"
      required
      description={PASSWORD_HINT}
      hideDescriptionOnError
      maxLength={32}
      autoComplete="new-password"
    />
  )}
</form.AppField>
```

完整示例：`src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx`。

#### TextareaInput：多行文本

字段类型：`string`。其余属性透传原生 `<textarea>`，如 `rows`、`maxLength`、`placeholder`。

```tsx
<form.AppField name="description">
  {field => <field.TextareaInput label="描述" rows={3} maxLength={200} placeholder="请输入描述信息" />}
</form.AppField>
```

#### NumberInput：数字

字段类型必须是 `number | null`。用户删空输入框时字段存 `null`，不会被回填成默认值。

| 属性 | 说明 |
|---|---|
| `addonEnd` | 输入框末尾的单位，如「秒」「MB」 |
| 其余 | 透传原生 `<input>` 属性，如 `min`、`max`、`step` |

schema 要显式拒绝 `null`，表单值类型用 `z.input`，提交时再收窄成 `number`：

```tsx
const formSchema = z.object({
  // 删空时存 null，由这里提示用户，不会回填成 1。
  sort: z
    .number({ error: '请输入排序' })
    .int()
    .min(1, '排序最小值为 1')
    .nullable()
    .refine(value => value !== null, '请输入排序')
})

// 用 z.input：refine 会把输出类型收窄成 number，而表单里 sort 可能是 null。
type FormValues = z.input<typeof formSchema>

// 提交时，校验已经排除了 null。
const payload = { sort: value.sort as number }

<form.AppField name="sort" validators={{ onDynamic: formSchema.shape.sort }}>
  {field => <field.NumberInput label="排序" required min={1} />}
</form.AppField>
```

完整示例：`src/routes/(main)/(app)/system/dept/-components/dept-form-drawer.tsx`。

#### SelectInput：下拉单选

字段类型：`string` 或 `number`，存的就是选中项的 `value`。`''` 和 `null` 显示占位提示，`0` 是有效值。

| 属性 | 说明 |
|---|---|
| `options` | `{ label: string; value: string \| number }[]` |
| `placeholder` | 未选择时的提示 |
| `disabled` | 是否禁用 |
| `renderOption` | 自定义选项内容，如在文字前加颜色圆点。参数是 `options` 里的那一项 |

```tsx
<form.AppField name="color">
  {field => (
    <field.SelectInput
      label="颜色"
      options={DICT_COLOR_OPTIONS}
      renderOption={option =>
        option.value === 'none' ? (
          option.label
        ) : (
          <span className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', DICT_COLOR_DOT_CLASSES[option.value])} />
            {option.label}
          </span>
        )
      }
    />
  )}
</form.AppField>
```

后端是数字的字段直接存数字，选项的 `value` 也写数字，不需要和字符串来回转换：

```tsx
const GENDER_ITEMS = ([0, 1, 2] as const).map(value => ({ value, label: genderLabel(value) }))

const formSchema = z.object({
  gender: z.literal([0, 1, 2])
})

<form.AppField name="gender">
  {field => <field.SelectInput label="性别" options={GENDER_ITEMS} />}
</form.AppField>
```

完整示例：`src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx`。

#### SwitchInput：开关

标签在左，开关在右。默认开 = `1`、关 = `2`，对应后端的启用和禁用。

| 属性 | 说明 |
|---|---|
| `checkedValue` | 打开时存的值，默认 `1` |
| `uncheckedValue` | 关闭时存的值，默认 `2` |
| `disabled` | 是否禁用 |

布尔字段：

```tsx
<form.AppField name="isHidden">
  {field => <field.SwitchInput label="是否隐藏" checkedValue={true} uncheckedValue={false} />}
</form.AppField>
```

反向开关（打开表示 `false`）把两个值对调即可。比如角色的「父子联动」，字段存的是「独立选择」：

```tsx
<form.AppField name="deptCheckStrictly">
  {field => <field.SwitchInput label="父子联动" checkedValue={false} uncheckedValue={true} />}
</form.AppField>
```

### 3. FormShell 和 FormFooter：表单外壳和底栏

`FormShell` 渲染抽屉里的 `<form>`：上面是可滚动的字段区，下面是固定的底栏。提交时它会依次做三件事：

1. 先跑一遍整个表单的校验。`handleSubmit` 遇到字段错误就会停下，写在表单级的规则会被藏起来，所以要先单独校验一次；
2. 调用 `form.handleSubmit()`；
3. 聚焦第一个出错的控件。

`FormFooter` 渲染「取消」和「保存」两个按钮。提交过程中两个按钮都会禁用，保存按钮显示加载图标。

两者都要放在 `form.AppForm` 里面，底栏通过 `footer` 传给 `FormShell`：

```tsx
<form.AppForm>
  <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
    <FieldGroup>…</FieldGroup>
  </form.FormShell>
</form.AppForm>
```

`FormShell` 的属性：

| 属性 | 说明 |
|---|---|
| `footer` | 字段区下方的内容，通常是 `<form.FormFooter onCancel={onClose} />` |
| `className` | 加在可滚动的字段区上 |

`FormFooter` 的属性：

| 属性 | 默认值 | 说明 |
|---|---|---|
| `onCancel` | 必填 | 点击取消时调用 |
| `cancelText` | `'取消'` | 取消按钮文字 |
| `submitText` | `'保存'` | 保存按钮文字 |
| `submittingText` | `'保存中'` | 提交中的文字 |

新增和编辑文字不同时：

```tsx
<form.FormFooter onCancel={onClose} submitText={submitLabel} submittingText={`${submitLabel}中`} />
```

底栏有额外按钮时（比如公告的「存草稿」），不要用 `FormFooter`，在页面里自己写。

### 4. CustomField：自定义控件

树选择、日期选择、富文本等控件没有注册成字段组件。仍然用 `form.AppField` 取值，再用 `field.CustomField` 包上标签、必填星号、说明和错误提示：

```tsx
<form.AppField name="deptId">
  {field => (
    <field.CustomField label="所属部门" required>
      {({ id, invalid }) => (
        <DeptTreeSelect
          id={id}
          data={depts.data}
          value={field.state.value}
          onChange={field.handleChange}
          invalid={invalid}
        />
      )}
    </field.CustomField>
  )}
</form.AppField>
```

回调参数：

| 参数 | 说明 |
|---|---|
| `id` | 传给控件后，点击标签会聚焦控件。控件没有 `id` 属性时可以不传 |
| `invalid` | 字段当前是否有错误，传给控件画红框 |

错误提示由 `CustomField` 自己从字段上读取，不用再传 `errors`。`label`、`description`、`required`、`hideDescriptionOnError`、`className` 和字段组件相同；`orientation="horizontal"` 时控件在标签右侧。

日期选择器配规则提示的写法：

```tsx
<form.AppField name="expireTime">
  {field => (
    <field.CustomField label="过期时间" description="留空表示永不过期；若设置则必须是未来时间" hideDescriptionOnError>
      {({ id, invalid }) => (
        <ExpiryPicker
          id={id}
          value={field.state.value}
          onChange={field.handleChange}
          onBlur={field.handleBlur}
          invalid={invalid}
        />
      )}
    </field.CustomField>
  )}
</form.AppField>
```

完整示例：`src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx`。

### 5. FormItem：不绑定字段的行

`CustomField` 内部用的就是 `FormItem`。只有下面两种情况才直接用它：

- 这一行不对应某个字段，比如部门表单里只读的「顶级部门」；
- 要显示的不是字段自己的全部错误，比如下拉框在空状态下要隐藏错误文字。

```tsx
import { FormItem } from '@/components/form'

<FormItem id="dept-root-parent" label="上级部门" description="根机构部门不支持变更上级部门" errors={[]}>
  <Input id="dept-root-parent" value="顶级部门（根机构）" disabled readOnly />
</FormItem>
```

| 属性 | 说明 |
|---|---|
| `errors` | 必填。要显示的错误，没有就传 `[]` |
| `id` | 控件的 id。传了之后点击标签会聚焦控件，控件本身也要设置相同的 id |
| `label`、`description`、`required`、`hideDescriptionOnError`、`className` | 同字段组件 |
| `orientation` | `'vertical'`（默认）或 `'horizontal'`。`horizontal` 时控件在标签右侧 |

### 6. 什么时候不用字段组件

遇到下面这些情况，用 `form.Field` + `FormItem`，不要硬套字段组件：

- 改一个字段要联动修改别的字段，比如定时任务切换触发类型时要重置触发间隔。
- 下拉框需要加载骨架、空状态，或者在空状态下要隐藏错误文字，比如定时任务的「任务组」、租户的「套餐」。
- 下拉框的值可能是 `undefined`，或者是多选。

---

## 二、确认弹窗

### ConfirmDialog

用于需要用户确认的操作。组件内部用 `useMutation` 执行 `action`，统一处理：

- 请求进行中禁止关闭弹窗，取消和确认按钮都会禁用；
- 成功后刷新 `invalidateKeys` 里的缓存、弹出成功提示、执行 `onSuccess`、关闭弹窗；
- 失败时由 `reportError` 提示错误。

```tsx
import { RotateCcw } from 'lucide-react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLastRecord } from '@/hooks/use-last-record'

export function AppResetSecretDialog({ app, open, onClose, onSuccess }: AppResetSecretDialogProps) {
  // 关闭动画期间 app 会变成 null，保留上一条记录，避免文案闪烁。
  const shownApp = useLastRecord(app)

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      tone="warning"
      icon={<RotateCcw />}
      title="重置应用密钥"
      description={`确定重置应用「${appLabel(shownApp)}」的密钥吗？`}
      confirmLabel="确认重置"
      pendingLabel="重置中"
      disabled={app === null}
      action={() => resetAppSecret(app!.id)}
      invalidateKeys={app ? [appKeys.secret(app.id)] : undefined}
      successMessage="重置密钥成功"
      onSuccess={() => {
        if (app) onSuccess?.(app)
      }}
    />
  )
}
```

| 属性 | 默认值 | 说明 |
|---|---|---|
| `open`、`onClose` | 必填 | 打开状态和关闭回调 |
| `title`、`description` | 必填 | 标题和说明 |
| `action` | 必填 | 确认后执行的请求，返回 Promise |
| `tone` | `'danger'` | `danger` 红色，用于删除、强退；`warning` 琥珀色，用于重置这类可恢复但有影响的操作；`primary` 主题色 |
| `icon` | 三角警告图标 | 标题左侧的图标 |
| `confirmLabel` | `'确认'` | 确认按钮文字 |
| `pendingLabel` | `'处理中'` | 请求中的按钮文字 |
| `invalidateKeys` | 无 | 成功后要刷新的 query key 列表 |
| `successMessage` | `'操作成功'` | 成功提示；传 `null` 不提示 |
| `errorMessage` | 无 | 失败时的兜底提示 |
| `onSuccess` | 无 | 成功后、关闭前调用 |
| `disabled` | `false` | 禁用确认按钮 |
| `showConfirm` | `true` | 是否显示确认按钮。传 `false` 时只展示警告，不允许操作 |

完整示例：
- `src/routes/(main)/(app)/open/app/-components/app-reset-secret-dialog.tsx`
- `src/routes/(main)/(app)/monitor/online/-components/online-user-kickout-dialog.tsx`

### DeleteConfirmDialog

删除专用，是 `ConfirmDialog` 加上一组删除默认值：红色、按钮文字「删除 / 删除中」、提示「删除成功 / 删除失败」。不能改 `tone`，其余属性和 `ConfirmDialog` 相同。

```tsx
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'

<DeleteConfirmDialog
  open={open}
  onClose={onClose}
  title="删除应用"
  description={shownApp ? `是否确定删除应用「${shownLabel}」？删除后不可恢复` : '是否确定删除该应用？删除后不可恢复'}
  disabled={!app}
  action={async () => {
    if (app) await deleteApp(app.id)
  }}
  invalidateKeys={[appKeys.all]}
/>
```

完整示例：`src/routes/(main)/(app)/open/app/-components/app-delete-dialog.tsx`。

---

## 三、徽标：ToneBadge

所有带颜色的状态和类型徽标都走这一个组件，颜色只在 `tone-badge.tsx` 里维护。

```tsx
import { ToneBadge } from '@/components/tone-badge'

// 状态徽标：带圆点，用于记录的状态或结果
<ToneBadge tone="success" label="启用" />
<ToneBadge tone="danger" label="失败" />

// 类型徽标：不带圆点，字体更细，用于没有好坏之分的分类
<ToneBadge tone="blue" label="目录" kind="type" />
```

| 属性 | 默认值 | 说明 |
|---|---|---|
| `tone` | 必填 | 颜色，见下表 |
| `label` | 必填 | 文字 |
| `kind` | `'status'` | `status` 带圆点、字体加粗；`type` 不带圆点、字体常规 |
| `dot` | `kind === 'status'` | 单独控制是否显示圆点 |
| `className` | 无 | 额外样式 |

可用的 `tone`：

| 分组 | 取值 |
|---|---|
| 状态色 | `success`、`warning`、`caution`、`danger`、`info`、`primary`、`neutral` |
| 类型色 | `blue`、`violet`、`teal`、`amber` |

原有的 `StatusBadge`（`status-cell.tsx`）和 `TypeBadge`（`data-badge.tsx`）仍然可以用，它们内部转调 `ToneBadge`，样式不变。新代码直接用 `ToneBadge`。

---

## 四、骨架屏：FormSkeleton

编辑抽屉加载详情时显示。`fields` 按页面字段的顺序列出每一行的形状，让骨架屏和真实表单的高度接近。

```tsx
import { FormSkeleton } from '@/components/form-skeleton'

<FormSkeleton fields={['input', 'input', 'textarea', 'switch']} />
```

| 取值 | 形状 |
|---|---|
| `'input'` | 标签 + 单行输入框 |
| `'textarea'` | 标签 + 多行输入框 |
| `'switch'` | 左侧标签和说明，右侧开关 |

传 `onCancel` 时，骨架屏下方会画出抽屉底栏：一个可用的「取消」按钮和一个禁用的「保存」按钮，加载期间抽屉的高度和按钮位置不会跳动。

```tsx
<FormSkeleton fields={['input', 'input', 'textarea', 'switch']} onCancel={onClose} />
```

典型用法：新增时直接渲染表单，编辑时等详情加载完成再渲染，失败显示重试。

```tsx
{isCreate || (!detail.isError && detail.data && detail.fetchStatus === 'idle') ? (
  <form>…</form>
) : detail.isError ? (
  <QueryState state="error" className="p-6" onRetry={() => void detail.refetch()} />
) : (
  <FormSkeleton fields={['input', 'input', 'textarea', 'switch']} />
)}
```

加载骨架的配置式调用见 `src/components/pro/form/beta-schema-form.tsx`；手写调用见 `src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx`。

---

## 五、表格列定义

`src/components/table/columns.tsx` 提供一组列定义 helper。每个 helper 会在列上记录一个 `valueType`，`DataTable` 加载时按它画骨架屏。

```tsx
import type { ColumnDef } from '@tanstack/react-table'

import { dateTimeColumn, indexColumn, optionColumn, statusColumn, textColumn } from '@/components/table/columns'
import type { DataTableFeatures } from '@/lib/data-table-features'

export function createAppColumns(onAction: (action: AppAction, app: AppResp) => void, rowOffset: number) {
  const columns: ColumnDef<DataTableFeatures, AppResp>[] = [
    indexColumn(rowOffset),
    statusColumn('status'),
    textColumn('description', '描述'),
    textColumn('createUserString', '创建人'),
    dateTimeColumn('createTime', '创建时间'),
    optionColumn(app => <RowActions app={app} onAction={onAction} />)
  ]

  return columns
}
```

第一个参数是字段名，写错或者传了布尔类型的字段时 TypeScript 会报错。

| helper | `valueType` | 说明 |
|---|---|---|
| `indexColumn(rowOffset)` | `index` | 序号，列 id 为 `index`。传 `rowOffset` 让翻页后序号连续；不出现在列设置里 |
| `textColumn(key, header)` | `text` | 文本。空值显示占位符，超长截断 |
| `dateTimeColumn(key, header)` | `dateTime` | 时间，等宽数字 |
| `statusColumn(key)` | `status` | 表头「状态」。后端的 1 显示绿色「启用」，2 显示红色「禁用」 |
| `optionColumn(render)` | `option` | 表头「操作」，列 id 为 `actions`。`render` 返回该行的 `RowActionsMenu`；不出现在列设置里 |

### 自定义单元格

helper 覆盖不到的列照常手写 `ColumnDef`，在 `meta` 里写上最接近的 `valueType`，让骨架屏宽度合适：

```tsx
{
  accessorKey: 'expireTime',
  header: '失效时间',
  meta: { valueType: 'dateTime' },
  cell: ({ row }) => <ExpireTimeCell expireTime={row.original.expireTime} />
}
```

`textColumn` 会截断长文本。名称这类需要完整显示的列，手写一列即可。

### 骨架屏

用了 helper 或写了 `meta.valueType` 的列表页，不需要再给 `DataTable` 传 `skeletonWidths`。骨架宽度按每列的 `valueType` 取，隐藏某一列后也不会错位。没有 `valueType` 的列使用默认宽度 `w-24`。

还没迁移的页面继续传 `skeletonWidths`，行为和原来一样。

列 helper 的手写示例：`src/routes/(main)/(app)/system/user/-components/user-columns.tsx`、`user-list.tsx`。应用管理已改为本页开头的配置式写法。
