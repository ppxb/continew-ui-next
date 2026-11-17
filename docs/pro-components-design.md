# 配置式 CRUD 层设计（ProComponents 风格）

本文记录配置式 CRUD 层的设计与源码依据。`src/components/pro/` 和应用管理样板已经落地；实际 API 以 `src/components/pro/typing.ts` 为准，下文保留最初设计供对照。

- 参照对象：`ant-design/pro-components` 的 `master` 分支，`package.json` 版本 `3.1.15-9`（单包，源码在 `src/` 下）。下文引用的路径都相对该仓库根目录。
- 落地位置：`src/components/pro/`，建在现有的 TanStack Table / Form / Query 和 `src/components/` 公共组件之上。不引入 antd，不新增依赖，不改 `src/components/ui/*`。
- 命名：ProComponents 有的概念用它的名字和语义；有出入的地方在 2.10 的对照表里写明原因。

先说明一个版本差异，后面所有命名都受它影响：`master` 是 3.x，和很多人熟悉的 2.x 有两处改名。

| 2.x 写法 | `master`（3.x）写法 | 依据 |
|---|---|---|
| `hideInSearch: true` | `search: false` | `site/zh-CN/docs/api-changes.mdx`「已移除的 API」；`src/table/typing.ts` 里只有 `search` |
| `renderFormItem` | `formItemRender` | `src/utils/typing.ts` 的 `ProSchema.formItemRender`；`src/` 下已搜不到 `renderFormItem` |

本设计按 `master` 命名（见第七节问题 1）。

### 已落地实现与原稿的差异

- 应用管理的列、搜索、表单和详情共用 `appColumns`。页面的 API/抽屉生命周期仍保留在 `app-list.tsx`、`app-form-drawer.tsx`、`app-detail-drawer.tsx`；没有删掉仍有职责的包装文件，也没有批量迁移其他页面。
- `BetaSchemaForm` 在 `form/beta-schema-form.tsx`。它使用 `useAppForm` 和受控字段，字段级错误来自活动 schema 的聚合校验。函数 `formItemProps.rules` 和条件子列的规则也参与提交时的 parse/transform，不再受原稿的静态 schema 限制；它们的静态返回类型推导仍以 `typing.ts` 为准。
- 编辑渲染由 `ProField` 返回受控控件，再由表单统一包一次 `FormItem`，避免双重标签/错误外壳。提交入口自带防重锁，不借用 `FormShell` 的入口。
- `select` 支持 `fieldProps.mode: 'multiple'`，默认空数组；搜索对每个选项编码/解码，保留数字、布尔值。必填推断使用类型空值，而非列的非空默认值。
- `dateTime` 可编辑；日期范围也可作编辑控件，禁用时同步关闭其 portaled 日历。字段型搜索即时生效，关键字搜索防抖。
- 现有 `ColumnMeta.valueType` 仍取最近的骨架类型，没有放宽成全部 Pro 类型；新增的 `hideInSetting` 控制列设置菜单。旧页面继续兼容。
- `ProDescriptions` 接受显式 `loading`，可复用页面已有详情查询。内部请求先解包，再以原始实体缓存，与表单共享详情 key。
- `reload` 精确取消目标 key 在途请求并等候新请求；格式化搜索快照只含已生效筛选。搜索重置恢复 `form.initialValues`；重复防抖通知不再次回第一页。
- 未做可编辑表格、列设置持久化、排序/筛选菜单、完整 ProComponents API 兼容；这不是安装或复制 antd 的组件实现。

当前使用说明见 `docs/components.md` 的「配置式页面」章节。

---

## 一、ProComponents 是怎么做的

只写从源码读到的事实。

### 1. 公共的列模型 `ProSchema`

`src/utils/typing.ts`：

- `ProSchema<Entity, ExtraProps, ComponentsType, ValueType>` 是表格、表单、详情三者共用的列类型。字段：`key`、`dataIndex`、`title`（节点，或函数 `(schema, type, dom) => node`）、`tooltip`、`valueType`、`fieldProps`、`valueEnum`、`formItemProps`、`renderText`、`render`、`formItemRender`、`editable`、`request`、`params`、`debounceTime`、`dependencies`、`ignoreFormItem`、`hideInDescriptions`、`hideInForm`、`hideInTable`、`proFieldProps`。
- `fieldProps` 和 `formItemProps` 都可以是对象，也可以是函数 `(form, config) => props`，`config` 是列本身加上 `type`、`isEditable`、`rowKey`、`rowIndex`、`entity`。
- `render(dom, entity, index, action, schema)` 只管只读态，`dom` 是按 `valueType` 渲染好的默认节点。`renderText(text, record, index, action)` 先改值，改完的值再交给 `valueType`。
- `formItemRender(schema, config, form, action)` 管编辑态，`config` 里有 `value`、`onChange`、`type`、`defaultRender`、`record` 等。`ignoreFormItem` 表示不再套 `Form.Item`，只能和 `formItemRender` 一起用。
- `ProFieldValueTypeWithFieldProps` 是「`valueType` 名 → 该类型的 `fieldProps` 类型」的映射，`ProFieldValueType = keyof` 它。`group`、`formList`、`formSet`、`divider`、`dependency` 五个是布局类型（`PRO_FIELD_SCHEMA_LAYOUT_VALUE_TYPES`），其余是字段类型。
- `ProSchemaComponentTypes = 'form' | 'list' | 'descriptions' | 'table' | 'cardList' | undefined`，就是传给 `title`、`render` 等回调的 `type`。
- `ProCoreActionBase`：`reload(resetPageIndex?)`、`reloadAndRest()`、`reset()`、`clearSelected()`、`pageInfo`。
- `RequestOptionsType`（`label`、`value`、`options` 等）和 `ProFieldRequestData = (params, props) => Promise<RequestOptionsType[]>`，是列级 `request` 的类型。

`src/utils/valueEnumType.ts`：`ProSchemaValueEnumType = { text, status?, color?, disabled? }`；`valueEnum` 可以是普通对象，也可以是 `Map`（键可以是数字、布尔）。

### 2. ProTable 的列和搜索表单

`src/table/typing.ts`：

- `ProColumnType` 在 `ProSchema` 上加表格专有字段：`children`、`colSize`、`formWidth`、`initialValue`（搜索表单默认值）、`ellipsis`、`copyable`、`convertValue`、`transform`、`search`（`boolean` 或 `{ transform }`）、`hideInTable`、`hideInForm`、`hideInSetting`、`filters`、`onFilter`、`order`（表单里的排序）、`editable`、`readonly`、`disable`，以及 antd `ColumnType` 的 `width`、`align`、`fixed`、`sorter` 等。
- `ProTableProps`：`columns`、`request`、`params`、`postData`、`defaultData`、`actionRef`、`formRef`、`toolBarRender`、`headerTitle`、`tooltip`、`toolbar`（`ListToolBarProps`，含 `subTitle`）、`options`、`search`、`form`、`columnsState`、`pagination`、`rowSelection`、`manualRequest`、`columnEmptyText`、`beforeSearchSubmit`、`onSubmit`、`onReset`、`onLoad`、`onRequestError`、`polling`、`editable`、`cardProps`、`ghost`、`tableRender` 等，其余继承 antd `TableProps`（`rowKey`、`dataSource`、`loading`、`expandable`……）。
- `request(params, sort, filter)`：`params` 是 `U & { pageSize?, current?, keyword? }`，返回 `{ data, success?, total? }`（`RequestData`）。

`src/table/utils/genProColumnToColumn.tsx`：把 `ProColumns` 映射成 antd 列。列的 key 取 `key || dataIndex`，再拼上下标；`render` 换成内部的 `columnRender`；最后过滤掉 `hideInTable` 的列。

`src/table/utils/columnRender.tsx`：单元格渲染顺序是 `renderText` → `cellRenderToFromItem`（按 `valueType` 和只读/编辑态出节点）→ `genCopyable`（处理 `copyable`、`ellipsis`）→ 有 `render` 就调 `render(dom, row, index, action, { ...column, type: 'table' })`。`valueType: 'option'` 的 `render` 如果返回数组，会被包进一个 flex 行。

`src/table/utils/cellRenderToFromItem.tsx`：`text`/`textarea` 且没有 `valueEnum` 的只读单元格直接输出文本，空值输出 `columnEmptyText`（`Table.tsx` 里默认 `'-'`）；其余走 `ProFormField`。

`src/table/components/Form/FormRender.tsx`：搜索表单就是一个 `BetaSchemaForm`，`layoutType` 取 `QueryFilter`、`LightFilter`（`search.filterType === 'light'`）或 `Form`（`type === 'form'` 时）。列先过滤：`search === false` 的不进搜索表单，`type === 'form'` 时 `hideInForm` 的不进表单；`search` 是对象时展开到列上（所以 `search.transform` 会成为这一项的 `transform`）。也就是说，**列默认都会出现在搜索表单里**，要逐列写 `search: false` 关掉。

`src/table/components/Form/index.tsx`：搜索提交时经过 `beforeSearchSubmit`，然后调用 `onFormSearchSubmit`，非首次提交会把页码拨回第 1 页。

`src/form/components/SchemaForm/valueType/ignore.tsx`：`index`、`indexBorder`、`option` 三种列在表单里直接忽略。

### 3. 请求流程和 `actionRef`

`src/table/Table.tsx`：

- 搜索值存在 `formSearch` 状态里。请求参数是 `{ ...分页, ...formSearch, ...params }`，再调用 `request(actionParams, proSort, proFilter)`。
- `useFetchData` 的 `effects` 是 `params`、`formSearch`、`proFilter`、`proSort` 各自 `stringify` 后的结果，任一变化就重新请求。`params` 变化还会把页码拨回第 1 页。
- `options.search` 是工具栏里的关键字搜索框，值以 `name`（默认 `'keyword'`）为键并入 `formSearch`；`onSearch` 返回 `false` 时不并入，也就不触发请求。

`src/table/useFetchData.tsx`：每次请求新建一个 `AbortController`，新请求会中止上一个；有防抖（默认 20ms）、轮询、`postData` 管道；`success === false` 时当作空结果；`total` 写回分页状态；`manual` 为真时跳过首次请求。它自己管理 `dataSource`、`loading`、`pageInfo`，没有跨组件的请求缓存。

`src/table/utils/index.ts` 的 `useActionType` 把这些能力挂到 `actionRef.current` 上：`reload(resetPageIndex?)`（可先回第 1 页再请求）、`reloadAndRest()`（清选中、回第 1 页、请求）、`reset()`（重置搜索表单、筛选、排序、页码后请求）、`fullScreen()`、`clearSelected()`、`setPageInfo()`、`getSortFilter()`，另有 `pageInfo`。

### 4. 工具栏、列设置、行操作菜单

- `src/table/components/ToolBar/index.tsx`：`OptionConfig = { density?, fullScreen?, reload?, setting?, search?, reloadIcon?, densityIcon? }`，默认开启 `reload`、`density`、`setting`，`fullScreen` 默认关闭。`toolBarRender(action, { selectedRowKeys, selectedRows })` 返回节点数组。
- `src/table/Store/Provide.tsx`：`ColumnsState = { show?, fixed?, order?, disable? }`。`columnsState` 支持 `defaultValue`、`value` + `onChange`，以及用 `persistenceKey` + `persistenceType` 存到 `localStorage` / `sessionStorage`。默认隐藏某列的写法是 `columnsState.defaultValue = { 列key: { show: false } }`。
- `src/table/components/ColumnSetting/index.tsx`：`hideInSetting` 的列不出现在列设置面板里。
- `src/table/components/Dropdown/index.tsx`：`TableDropdown` 是行内「更多」菜单，属性是 `menus: { key, name, disabled? }[]` 和 `onSelect(key)`。

### 5. 字段层：`valueType`、只读/编辑、`valueEnum`

- `src/provider/typing/config.ts`：一个 `valueType` 的实现是 `ProRenderFieldPropsType = { render?(text, props, dom), formItemRender?(text, props, dom) }`，前者只读，后者编辑。`props`（`ProFieldFCRenderProps`）里有 `mode`、`fieldProps`、`light`、`label`、`valueEnum`、`value`、`onChange` 等。`ProFieldFCMode = 'read' | 'edit' | 'update'`。
- `src/field/ValueTypeToComponent.tsx`：内置类型表 `Record<ProFieldBuiltinValueType, ProRenderFieldPropsType>`。`index` 输出 `text + 1`；`text` 在没有显式写 `valueType` 且带 `valueEnum` 时按下拉渲染。
- `src/field/ProFieldCore.tsx`：`mode` 默认 `'read'`，`readonly` 会强制只读；编辑态取值顺序是 `fieldProps.value ?? text`，只读态反过来；自定义类型从 `ProConfigContext` 的 `valueTypeMap` 里取。
- `src/field/AllProField.tsx`：只读和编辑都先查 `valueTypeMap` 里的自定义类型，再查内置类型；只读空值输出 `emptyText`（默认 `'-'`）。
- `src/provider/index.tsx`：`ProConfigProvider` 的 `valueTypeMap?: Record<string, ProRenderFieldPropsType>` 就是注册自定义 `valueType` 的入口。
- `src/utils/proFieldParsingText/index.tsx`：只读态用 `valueEnum` 把值翻译成文字。有 `status`（`Success`、`Error`、`Processing`、`Warning`、`Default`，大小写两种都认）就画 antd `Badge` 的状态点，没有 `status` 但有 `color` 就画彩色点，都没有只出文字。值是数组时逐个翻译后用逗号连接。查表时先用原值、再用 `String(值)`。
- `src/field/internal/valueEnumToArray.ts`：编辑态把 `valueEnum` 转成选项数组，选项的 `value` 就是 `valueEnum` 的键。所以对象写法的键都是字符串，数字值要用 `Map`。
- `src/field/components/Select/index.tsx`：列级 `request` 用 `useSWR` 取选项，缓存键由 `proFieldKey`、`params`、搜索关键字组成。`FormRender.tsx` 给搜索表单里的每一项设的 `proFieldKey` 是 `table-field-${columnKey}`。

### 6. `BetaSchemaForm`

`src/form/components/SchemaForm/typing.ts`：

- `layoutType` 可选 `Form`（默认）、`DrawerForm`、`ModalForm`、`QueryFilter`、`LightFilter`、`StepForm`、`StepsForm`、`Embed`，不同取值对应不同的属性类型。
- `ProFormColumnsType` 在 `ProSchema` 上加：`name`、`width`、`formWidth`、`colProps`、`rowProps`、`colSize`、`readonly`、`hidden`、`initialValue`、`convertValue`（把取到的数据转成编辑控件要的格式）、`transform`（提交时转换字段值）、`order`、`columns`（子列，数组或 `(values) => 数组`）。

`src/form/components/SchemaForm/index.tsx`：`genItems` 先过滤（`type === 'form'` 时去掉 `hideInForm`），再按 `order` 从大到小排，`title` 是函数就以 `'form'` 调用，`fieldProps` / `formItemProps` 是函数就以 `(form, { ...列, type })` 调用，最后交给 `renderValueType`。表单值变化时默认重新生成表单项。`hideInForm` 只是布尔值，没有函数形式，也没有「新增 / 修改」模式的概念；按模式变化要靠调用方传不同的 `columns`。

`src/form/components/SchemaForm/valueType/`：

- `index.tsx`：依次尝试 `ignore`、`group`、`formList`、`formSet`、`divider`、`dependency`，都不是就按普通字段（`field.tsx`）渲染。
- `dependency.tsx`：`valueType: 'dependency'` 的列要有 `name`（依赖的字段名数组）和函数形式的 `columns`，渲染成 `ProFormDependency`，依赖字段变化时用新值重新生成子列。
- `field.tsx`：字段名取 `name || key || dataIndex`；有 `dependencies` 的字段外面包一层 `ProFormDependency`，依赖字段变化时重渲染；`formItemRender` 收到 `defaultRender`。

表单外壳：

- `src/form/BaseForm/BaseForm.tsx`：`onFinish(formData) => Promise<boolean | void>`、`submitter`、`formRef`、`request` + `params`（`request` 的返回值作为初始值）、`readonly`、`loading`。
- `src/form/layouts/DrawerForm/index.tsx`：`trigger`、`open`、`onOpenChange`、`title`、`width`、`drawerProps`、`onFinish`。`src/form/layouts/_shared/useOverlayForm.tsx` 里，`onFinish` 的结果为真值就关闭抽屉。

### 7. `ProDescriptions`

- `src/descriptions/typing.ts`：`ProDescriptionsColumn` 是 `ProSchema` 加 antd 描述项属性（`span` 等）和 `copyable`、`ellipsis`、`mode`、`order`。组件属性有 `columns`、`dataSource`、`request(params) => Promise<{ data, success? }>`、`params`、`actionRef`、`editable`、`emptyText`、`loading`，其余继承 antd `Descriptions`（`title`、`column` 等）。
- `src/descriptions/ProDescriptions.tsx`：过滤掉 `index`、`indexBorder` 和 `hideInDescriptions` 的列，再按 `order` 排序。
- `src/descriptions/schemaToDescriptionsItem.tsx`：每项先过 `renderText`，`title` 是函数就以 `'descriptions'` 调用，然后按 `valueType` 渲染；`valueType: 'option'` 的项不进列表，而是收集到右上角操作区。

---

## 二、本项目的对应设计

### 2.1 总览

```
一份 columns ──┬─ <ProTable>          列表：表格列 + 搜索栏 + 工具栏 + 分页
               ├─ <BetaSchemaForm>    新增/修改：layoutType="DrawerForm"
               └─ <ProDescriptions>   详情
```

五条原则：

1. 只做一层薄封装。表格还是 `DataTable`，抽屉还是 `EntityDrawer`，输入框还是 `src/components/form/*`，徽标还是 `ToneBadge`。pro 层负责「读配置、拼装、管状态」。
2. 请求全部走 TanStack Query。ProComponents 自己管请求状态；我们改成 `useQuery`，所以多出一个 `queryKey` 属性，这是唯一一个必须新增的概念。
3. 校验用 zod。`formItemProps.rules` 不是 antd 的规则数组，而是一个 zod schema。
4. 一种类型走到底。ProComponents 里表格、表单、详情的列类型是三个（`ProColumns`、`ProFormColumnsType`、`ProDescriptionsColumn`），共用时要强转。这里只有 `ProColumns<T>` 一个。
5. 手写永远可以共存。`ProTable` 不要求同屏的抽屉也是配置式的。

### 2.2 公共类型

#### 列：`ProColumns<T>`

```ts
// src/components/pro/typing.ts
import type { ReactNode } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import type { z } from 'zod'

import type { FormItemLabelProps } from '@/components/form'
import type { BadgeTone } from '@/components/tone-badge'

/** Which surface is rendering the column. Passed to `title`, `render`, `formItemRender`, `fieldProps`. */
export type ProSchemaComponentTypes = 'table' | 'form' | 'descriptions'

export type ProFieldFCMode = 'read' | 'edit'

/** One `valueEnum` entry: the label, plus the badge it draws in read mode. */
export interface ProSchemaValueEnumType {
  text: ReactNode
  /** A status badge with a dot. Mapped onto `ToneBadge` tones, see 2.4. */
  status?: 'Success' | 'Error' | 'Processing' | 'Warning' | 'Default'
  /** A `ToneBadge` tone, for categories that are neither good nor bad. */
  color?: BadgeTone
  disabled?: boolean
}

export type ProSchemaValueEnumObj = Record<string, ProSchemaValueEnumType | ReactNode>
/** Use a Map when the stored values are numbers or booleans: object keys are always strings. */
export type ProSchemaValueEnumMap = Map<string | number | boolean, ProSchemaValueEnumType | ReactNode>

/** One option of a select-like field, from `valueEnum` or a column `request`. */
export interface RequestOptionsType {
  label: string
  value: string | number
  disabled?: boolean
  status?: ProSchemaValueEnumType['status']
  color?: BadgeTone
  /** Tree options, for tree-select value types. */
  children?: RequestOptionsType[]
}

export type ProFieldRequestData<U = Record<string, unknown>> = (
  params: U,
  props: { signal: AbortSignal }
) => Promise<RequestOptionsType[]>

/** A column that loads its options must also name the cache entry they live in. */
type ProSchemaRequest =
  | { request?: undefined; params?: undefined }
  | {
      request: ProFieldRequestData
      params?: Record<string, unknown>
      proFieldProps: { proFieldKey: QueryKey }
    }

/** `valueType` -> its `fieldProps`. An interface, so a project type is added by declaration merging. */
export interface ProFieldValueTypeWithFieldProps {
  index: Record<string, never>
  option: Record<string, never>
  text: TextFieldProps
  textarea: TextareaFieldProps
  password: PasswordFieldProps
  digit: DigitFieldProps
  select: SelectFieldProps
  switch: SwitchFieldProps
  dateTime: Record<string, never>
  dateRange: DateRangeFieldProps
  dateTimeRange: DateRangeFieldProps
}

export type ProFieldValueType = keyof ProFieldValueTypeWithFieldProps

/** What `formItemProps` may carry: the project's `FormItem` props, plus the zod rule. */
export interface ProFormItemProps extends Omit<FormItemLabelProps, 'label'> {
  /** The field's zod schema. Drives validation, the required mark and the submitted type. */
  rules?: z.ZodType
}

/** The column itself plus the surface that is rendering it. */
export type ProSchemaConfig<T> = ProColumnBase<T> & { type: ProSchemaComponentTypes; entity?: T }

/** What a custom edit control needs: a controlled value and the label/error wiring. */
export interface ProFormItemRenderConfig {
  id: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  invalid: boolean
  /** `'form'` in a create/edit form, `'table'` in the ProTable search bar. */
  type: ProSchemaComponentTypes
  /** Renders what the `valueType` would have rendered. */
  defaultRender: () => ReactNode
}

interface ProColumnBase<T> {
  /** Unique id of the column. Defaults to `dataIndex`; set it when two columns share a `dataIndex`. */
  key?: string
  /** The field of the record. Also the form field name and, by default, the search param name. */
  dataIndex?: Extract<keyof T, string>
  title?: ReactNode | ((schema: ProColumnBase<T>, type: ProSchemaComponentTypes) => ReactNode)
  valueEnum?: ProSchemaValueEnumObj | ProSchemaValueEnumMap

  // ---- read mode (table cell, descriptions item)
  renderText?: (text: unknown, record: T, index: number, action: ActionType | undefined) => unknown
  render?: (
    dom: ReactNode,
    entity: T,
    index: number,
    action: ActionType | undefined,
    schema: ProSchemaConfig<T>
  ) => ReactNode
  ellipsis?: boolean
  copyable?: boolean

  // ---- edit mode (form, search bar)
  formItemProps?: ProFormItemProps | ((form: ProFormInstance, config: ProSchemaConfig<T>) => ProFormItemProps)
  formItemRender?: (schema: ProSchemaConfig<T>, config: ProFormItemRenderConfig, form: ProFormInstance) => ReactNode
  /** With `formItemRender`: the result already draws its own label and error. */
  ignoreFormItem?: boolean
  /** The value a new record starts with. Not used by the search bar, see 2.6. */
  initialValue?: unknown
  /** Record value -> form value, when filling an edit form. */
  convertValue?: (value: unknown, field: string, entity: T) => unknown
  /** Re-render this field when these fields change, so function `fieldProps`/`formItemProps` see new values. */
  dependencies?: readonly Extract<keyof T, string>[]
  /** Order inside the form and the search bar; larger comes first, ties keep array order. */
  order?: number

  // ---- where the column shows
  hideInTable?: boolean
  hideInForm?: boolean
  hideInDescriptions?: boolean
  /** Not listed in the column settings menu. Always true for `index` and `option`. */
  hideInSetting?: boolean
  /** Show the column in the search bar; the object form also renames or reshapes the request param. */
  search?: boolean | { transform: (value: unknown, field: string) => Record<string, unknown> }

  // ---- table and descriptions layout
  align?: 'left' | 'center' | 'right'
  /** Descriptions only: how many of the grid's columns the item spans. */
  span?: 1 | 2
}

type ProFieldColumn<T> = {
  [V in ProFieldValueType]: ProColumnBase<T> &
    ProSchemaRequest & {
      /** Defaults to `'text'`. */
      valueType?: V
      fieldProps?:
        | ProFieldValueTypeWithFieldProps[V]
        | ((form: ProFormInstance | undefined, config: ProSchemaConfig<T>) => ProFieldValueTypeWithFieldProps[V])
    }
}[ProFieldValueType]

/** Form only: sub-columns computed from the watched fields. */
interface ProDependencyColumn<T> {
  valueType: 'dependency'
  name: readonly Extract<keyof T, string>[]
  columns: (values: Partial<T>) => readonly ProFieldColumn<T>[]
}

export type ProColumns<T = Record<string, unknown>> = ProFieldColumn<T> | ProDependencyColumn<T>
```

`TextFieldProps`、`TextareaFieldProps`、`PasswordFieldProps`、`DigitFieldProps`、`SelectFieldProps`、`SwitchFieldProps` 就是 `src/components/form/*` 里对应输入组件的属性去掉标签那几项（`label`、`description`、`required`、`hideDescriptionOnError`、`className`），不另外发明。`DateRangeFieldProps` 是 `{ placeholder?: string }`。后文用到的 `EntityDrawerWidth` 现在是 `entity-drawer.tsx` 里的局部类型，实现时要导出。

每个实体的列统一这样声明，`as const satisfies` 既做类型检查，又保留每列的字面量信息，供表单值类型推导使用（2.5）：

```ts
export const appColumns = [
  { title: '序号', valueType: 'index' },
  { title: '应用名称', dataIndex: 'name', formItemProps: { rules: z.string().trim().min(1, '应用名称不能为空') } }
] as const satisfies readonly ProColumns<AppResp>[]
```

`dataIndex` 写错、`fieldProps` 和 `valueType` 对不上、写了 `request` 却没给 `proFieldProps.proFieldKey`，都会在编译期报错。

#### `valueType` 注册表

```ts
// src/components/pro/typing.ts（续）

/** The wiring an edit control receives. Absent in read mode. */
export interface ProFieldControlProps {
  id: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  invalid: boolean
}

export interface ProFieldFCRenderProps<V extends ProFieldValueType = ProFieldValueType> {
  mode: ProFieldFCMode
  /** True inside the ProTable search bar: render the compact filter control. */
  light?: boolean
  label?: ReactNode
  /** Resolved from the column's `valueEnum` or `request`. */
  options?: readonly RequestOptionsType[]
  /** The column's `fieldProps`; in edit mode the control wiring is merged in. */
  fieldProps: ProFieldValueTypeWithFieldProps[V] & Partial<ProFieldControlProps>
  /** Edit mode in a form: label, required mark and description, for a renderer that draws its own `FormItem`. */
  formItemProps?: FormItemLabelProps
  type: ProSchemaComponentTypes
}

/** How one value type renders. Same shape and names as ProComponents' `valueTypeMap` entries. */
export interface ProRenderFieldPropsType<V extends ProFieldValueType = ProFieldValueType> {
  /** Read mode. Without it the value renders as text. */
  render?: (text: unknown, props: ProFieldFCRenderProps<V>) => ReactNode
  /** Edit mode. Returns a controlled control; the layer wraps it in `FormItem`. */
  formItemRender?: (text: unknown, props: ProFieldFCRenderProps<V>) => ReactNode
  /** `formItemRender` already draws its own `FormItem`; used by the built-in bound inputs. */
  ignoreFormItem?: boolean
  /** The empty value of the type, such as `''` or `null`. See 2.5 for what it drives. */
  initialValue?: unknown
}

export type ProValueTypeMap = { [V in ProFieldValueType]?: ProRenderFieldPropsType<V> }
```

```tsx
// src/components/pro/provider.tsx
export interface ProConfigProviderProps {
  /** Project value types, merged over the built-in ones. */
  valueTypeMap?: ProValueTypeMap
  children: ReactNode
}

export function ProConfigProvider(props: ProConfigProviderProps): ReactNode
```

注册项目自己的类型分两步：先用声明合并把名字和 `fieldProps` 类型登记进去，再在应用根部把实现交给 `ProConfigProvider`。

```tsx
// src/components/pro-value-types.tsx (project file, outside the pro layer)
import { DeptTreeSelect } from '@/components/dept-tree-select'
import { ExpiryPicker } from '@/components/expiry-picker'
import type { ProValueTypeMap } from '@/components/pro'
import { TextCell } from '@/components/text-cell'

declare module '@/components/pro' {
  interface ProFieldValueTypeWithFieldProps {
    deptTreeSelect: { placeholder?: string }
    expiry: { neverLabel?: string; placeholder?: string }
  }
}

export const valueTypeMap: ProValueTypeMap = {
  deptTreeSelect: {
    initialValue: '',
    formItemRender: (_, { light, label, fieldProps: { id, value, onChange, invalid, placeholder } }) =>
      light ? (
        <DeptTreeSelect
          triggerPrefix={label}
          placeholder="全部部门"
          placeholderColor="foreground"
          showAllOption
          allOptionLabel="全部部门"
          value={value as string | undefined}
          onChange={next => onChange?.(next || undefined)}
          className="sm:w-44"
        />
      ) : (
        <DeptTreeSelect
          id={id}
          value={value as string}
          onChange={next => onChange?.(next)}
          invalid={invalid}
          placeholder={placeholder}
        />
      )
  },
  expiry: {
    initialValue: '',
    render: text => <TextCell value={text as string | null} className="tabular-nums" />,
    formItemRender: (_, { fieldProps: { id, value, onChange, onBlur, invalid, ...rest } }) => (
      <ExpiryPicker
        {...rest}
        id={id}
        value={value as string}
        onChange={next => onChange?.(next)}
        onBlur={onBlur}
        invalid={invalid}
      />
    )
  }
}
```

#### `ProTable`

```ts
// src/components/pro/typing.ts（续）

export interface RequestData<T> {
  data: T[]
  /** Required for a paginated table. */
  total?: number
  /** `false` is treated as a failed request. */
  success?: boolean
}

export type SortOrder = 'ascend' | 'descend' | null
export type FilterValue = (string | number)[] | null

type ProTableRequest<T, P> = (
  params: P,
  sort: Record<string, SortOrder>,
  filter: Record<string, FilterValue>,
  signal: AbortSignal
) => Promise<RequestData<T>>

/** The request params carry the page only when the table paginates. */
type ProTablePaging<T, U> =
  | { pagination?: { defaultPageSize?: number }; request: ProTableRequest<T, U & { current: number; pageSize: number }> }
  | { pagination: false; request: ProTableRequest<T, U> }

export interface ColumnsState {
  show?: boolean
}

export interface OptionConfig {
  /** The refresh button. Default true. */
  reload?: boolean
  /** The column visibility menu. Default true. */
  setting?: boolean
  /** The fullscreen button. Default true. */
  fullScreen?: boolean
  /** The keyword box at the start of the filter row. Default false. */
  search?:
    | boolean
    | {
        /** The request param the keyword is sent as. Default `'keyword'`. */
        name?: string
        placeholder?: string
        /** Return false to keep the keyword out of the request, for client-side filtering. */
        onSearch?: (keyword: string) => boolean | void
      }
}

export interface ActionType {
  /** Refetches the list; `true` goes back to the first page first. */
  reload: (resetPageIndex?: boolean) => Promise<void>
  /** Back to the first page, then refetch. */
  reloadAndRest: () => Promise<void>
  /** Clears the keyword and the search bar, goes back to the first page, then refetches. */
  reset: () => void
  setPageInfo: (page: { current?: number; pageSize?: number }) => void
  fullScreen: () => void
  readonly pageInfo: { current: number; pageSize: number; total: number }
}

export type ProTableProps<T, U extends Record<string, unknown> = Record<string, unknown>> = ProTablePaging<T, U> & {
  columns: readonly ProColumns<T>[]
  /** The row id field, or a function that returns the id. */
  rowKey: Extract<keyof T, string> | ((record: T) => string)
  /** The query key prefix of this list, such as `appKeys.lists()`. See 2.6. */
  queryKey: QueryKey
  /** Extra request params owned by the screen. A change refetches from the first page. */
  params?: Partial<U>
  /** Hold the request until this turns false, such as while a lookup it depends on loads. */
  manualRequest?: boolean
  /** Post-processes the rows on every render, without refetching. */
  postData?: (data: T[]) => T[]

  actionRef?: React.Ref<ActionType | undefined>
  /** The search bar's values, such as for an export that must match the list. */
  formRef?: React.Ref<ProFormInstance<U> | undefined>

  /** The card title. */
  headerTitle?: ReactNode
  /** `subTitle` is the line under the card title. */
  toolbar?: { subTitle?: ReactNode }
  /** Buttons before the refresh / columns / fullscreen group. Falsy entries are skipped. */
  toolBarRender?: false | ((action: ActionType | undefined) => ReactNode[])
  options?: false | OptionConfig
  /** `false` hides the search bar even when columns ask for it. */
  search?: false
  /** Search bar config. `initialValues` are the default filters. */
  form?: { initialValues?: Partial<U> }
  columnsState?: { defaultValue?: Record<string, ColumnsState> }
  /** Tree rows: the children field, and whether every node starts expanded. */
  expandable?: {
    childrenColumnName?: Extract<keyof T, string>
    defaultExpandAllRows?: boolean
    expandedRowKeys?: readonly string[]
    onExpandedRowsChange?: (expandedKeys: string[]) => void
  }
  /** The placeholder of an empty cell. Default `EMPTY_PLACEHOLDER`. */
  columnEmptyText?: string
  locale?: { emptyText?: string }
  /** `false` drops the card, for a table inside a tab or a panel. */
  cardProps?: false
  tableClassName?: string
}
```

```tsx
// src/components/pro/table/table-dropdown.tsx
type TableDropdownItem<K extends string> =
  | { key: K; name: ReactNode; icon?: ReactNode; disabled?: boolean; danger?: boolean }
  | { type: 'divider' }

export interface TableDropdownProps<K extends string> {
  /** Falsy entries are skipped, and dividers left at an edge or doubled up are dropped. */
  menus: readonly (TableDropdownItem<K> | false | null | undefined)[]
  onSelect: (key: K) => void
}

export function TableDropdown<K extends string>(props: TableDropdownProps<K>): ReactNode
```

#### `BetaSchemaForm`

```ts
// src/components/pro/typing.ts（续）

/** A small subset of antd's form instance, backed by TanStack Form (or by the search bar state). */
export interface ProFormInstance<Values = Record<string, unknown>> {
  getFieldValue: (name: string) => unknown
  getFieldsValue: () => Values
  /** The values as they are sent: empty ones dropped and `search.transform` applied. */
  getFieldsFormatValue: () => Values
  setFieldsValue: (values: Partial<Values>) => void
  resetFields: () => void
  submit: () => void
}

/** The columns that take part in a form: they have a `dataIndex` and are not hidden, `index` or `option`. */
type FormColumn<C> = C extends { dataIndex: string; hideInForm?: false; valueType?: infer V }
  ? V extends 'index' | 'option'
    ? never
    : C
  : never

/** A field's submitted type: the output of its zod rule, or the record's own type when it has none. */
type FieldValue<T, C> = C extends { formItemProps: { rules: infer R extends z.ZodType } }
  ? z.output<R>
  : C extends { dataIndex: infer K extends keyof T }
    ? T[K]
    : unknown

/** The values `onFinish` receives, derived from the columns. */
export type InferFormValues<T, C extends readonly unknown[]> = {
  [Col in FormColumn<C[number]> as Col['dataIndex']]: FieldValue<T, Col>
}

interface FormSchemaBase<T, C extends readonly ProColumns<T>[], U> {
  columns: C
  /** Create defaults that the columns cannot know, such as a parent id picked on the list. */
  initialValues?: Partial<T>
  /** Loads the record to edit. Leave it out to create. */
  request?: (params: U, signal: AbortSignal) => Promise<T>
  params?: U
  /** The query key of the record, such as `appKeys.detail(id)`. Required with `request`. */
  queryKey?: QueryKey
  /** Receives the validated values. A drawer closes when it resolves to a truthy value. */
  onFinish: (values: InferFormValues<T, C>) => Promise<boolean | void>
  formRef?: React.Ref<ProFormInstance | undefined>
  /** `false` drops the footer; `searchConfig` renames its two buttons. */
  submitter?: false | { searchConfig?: { submitText?: string; resetText?: string } }
}

export type FormSchema<
  T,
  C extends readonly ProColumns<T>[] = readonly ProColumns<T>[],
  U = Record<string, unknown>
> = FormSchemaBase<T, C, U> &
  (
    | { layoutType?: 'Form'; className?: string }
    | {
        layoutType: 'DrawerForm'
        title: string
        open: boolean
        onOpenChange: (open: boolean) => void
        width?: EntityDrawerWidth
        /** The rest of `EntityDrawer`'s header. */
        drawerProps?: { icon?: ReactNode; badge?: ReactNode; description?: string }
      }
  )

export function BetaSchemaForm<T, C extends readonly ProColumns<T>[] = readonly ProColumns<T>[]>(
  props: FormSchema<T, C>
): ReactNode
```

#### `ProDescriptions`

```ts
export interface ProDescriptionsProps<T, U = Record<string, unknown>> {
  columns: readonly ProColumns<T>[]
  /** The record to show, when the screen already has it. */
  dataSource?: T
  /** Loads the record. Leave it out while nothing is picked. */
  request?: (params: U, signal: AbortSignal) => Promise<{ data: T; success?: boolean }>
  params?: U
  /** The query key of the record, such as `appKeys.detail(id)`. Required with `request`. */
  queryKey?: QueryKey
  title?: ReactNode
  /** Grid columns on wide screens. Default 2. */
  column?: 1 | 2
  /** The placeholder of an empty value. Default `EMPTY_PLACEHOLDER`. */
  emptyText?: ReactNode
  className?: string
}

export function ProDescriptions<T>(props: ProDescriptionsProps<T>): ReactNode
```

#### 入口

```ts
// src/components/pro/index.ts
export { ProTable } from './table/pro-table'
export { TableDropdown } from './table/table-dropdown'
export { BetaSchemaForm } from './form/schema-form'
export { ProDescriptions } from './descriptions/pro-descriptions'
export { ProConfigProvider } from './provider'
export type * from './typing'
```

### 2.3 起步的 `valueType`

内置类型（`src/components/pro/field/value-type-map.tsx`）：

| `valueType` | 只读（表格、详情） | 编辑（表单） | 搜索栏（`light`） | 空值 |
|---|---|---|---|---|
| `index` | 序号，翻页后连续 | 忽略 | 忽略 | — |
| `text`（默认） | 文本；`ellipsis` 时用 `TextCell` 截断 | `TextInput` | 带防抖的输入框（`TableSearch`），占位文字取 `fieldProps.placeholder`，没有就用列标题 | `''` |
| `textarea` | 表格里同 `text`；详情里保留换行 | `TextareaInput` | 同 `text` | `''` |
| `password` | 不显示内容 | `PasswordInput` | 不支持 | `''` |
| `digit` | 等宽数字 | `NumberInput` | 不支持 | `null` |
| `select` | 按 `valueEnum` / `request` 出徽标或文字 | `SelectInput` | `FilterSelect`，自动加「全部」 | `''` |
| `switch` | 按 `valueEnum` 出徽标 | `SwitchInput` | `FilterSelect`（筛选需要「全部 / 开 / 关」三态） | 无，列上写 `initialValue` |
| `dateTime` | 等宽文本 | 起步不提供，用项目类型 `expiry` 或 `formItemRender` | 不支持，用 `dateTimeRange` 列 | `''` |
| `dateRange`、`dateTimeRange` | 不用于展示 | 起步不提供 | `DateRangeFilter`；值是 `[开始, 结束]` 两个字符串，`dateTimeRange` 扩到整天 | — |
| `option` | `render` 返回的数组排成一行 | 忽略 | 忽略 | — |
| `dependency` | — | 布局类型，见 2.7 | — | — |

项目类型（`src/components/pro-value-types.tsx`，通过 `ProConfigProvider` 注册）：

| `valueType` | 实现 | 用到的页面 |
|---|---|---|
| `deptTreeSelect` | `DeptTreeSelect`，表单和搜索栏两种形态 | 用户 |
| `expiry` | `ExpiryPicker` | 应用、租户 |

和 ProComponents 不同的三处：

- `index` 的序号翻页后连续（现有行为）；ProComponents 每页从 1 开始。
- `ellipsis` 和 ProComponents 一样默认关闭。现有的 `textColumn` 默认截断，迁移时要给「描述」这类长文本列写上 `ellipsis: true`。
- 内置的编辑态直接渲染 `src/components/form/*` 里已经绑定字段上下文、自带标签外壳的输入组件，所以这些条目带 `ignoreFormItem: true`。自定义类型和列级 `formItemRender` 返回受控控件，由 pro 层包上 `FormItem`，这和今天 `CustomField` 的用法一致。

骨架屏：`ColumnMeta.valueType` 现在声明在 `src/components/table/columns.tsx`，取值范围是 `'index' | 'text' | 'dateTime' | 'status' | 'option'`。同一个属性不能声明两次，实现时把这一处声明放宽成 `ProFieldValueType | 'status'`，`VALUE_TYPE_SKELETON` 对没登记的类型用默认宽度。

### 2.4 `valueEnum` 和异步选项

只读态由 `valueEnum`（或 `request` 取回的选项）决定文字和颜色，统一画成 `ToneBadge`：

| ProComponents `status` | `ToneBadge` | 说明 |
|---|---|---|
| `Success` | `tone="success"`，带圆点 | |
| `Error` | `tone="danger"`，带圆点 | |
| `Warning` | `tone="warning"`，带圆点 | |
| `Processing` | `tone="info"`，带圆点 | antd 是蓝色呼吸点，这里没有动画 |
| `Default` | `tone="neutral"`，带圆点 | |

没有 `status` 但有 `color` 时，`color` 直接是 `ToneBadge` 的 `tone`：状态色（`success`、`warning`、`caution`、`danger`、`info`、`primary`、`neutral`）带圆点，类型色（`blue`、`violet`、`teal`、`amber`）不带圆点，对应现在的 `kind="type"`。两者都没有就只出文字。值是数组时逐个渲染。

```ts
const STATUS_ENUM = new Map<number, ProSchemaValueEnumType>([
  [1, { text: '启用', status: 'Success' }],
  [2, { text: '禁用', status: 'Error' }]
])

{ title: '状态', dataIndex: 'status', valueType: 'switch', valueEnum: STATUS_ENUM }
```

这一列在表格和详情里画成绿色「启用」/ 红色「禁用」徽标（等同现在的 `StatusCell`），在搜索栏里是「状态」下拉，在表单里是开关。

编辑态和搜索栏的选项也来自 `valueEnum`，选项的 `value` 就是 `valueEnum` 的键。后端是数字的字段用 `Map`，这一点和 ProComponents 相同。

异步字典用列级 `request`。ProComponents 用 swr 缓存，键来自 `proFieldKey`；这里换成 `useQuery`，`proFieldProps.proFieldKey` 就是 query key，类型上要求必填，因为列的 `dataIndex` 在不同实体间会重名（`status`、`type`），自动生成的键会串缓存。

```ts
// src/lib/dict-column.ts (project glue, outside the pro layer)
import { listDict } from '@/lib/api/common'
import { dictKeys } from '@/lib/query-keys'

/** The `request` and cache key of a dictionary-backed column; spread it into the column. */
export function dictColumn(code: string) {
  return {
    request: (_params: Record<string, unknown>, { signal }: { signal: AbortSignal }) => listDict(code, signal),
    proFieldProps: { proFieldKey: dictKeys.code(code) }
  }
}

// usage
{ title: '公告类型', dataIndex: 'type', valueType: 'select', search: true, ...dictColumn('notice_type') }
```

说明：

- 键用的是现有的 `dictKeys.code(code)`，所以和 `useNoticeDicts`、`useDictOptions` 共用同一份缓存，现有的失效逻辑也照常生效。
- 表格每个单元格都会订阅这个查询，TanStack Query 会合并成一次请求。
- `listDict` 返回的 `LabelValueResp` 只有 `label`、`value`、`disabled`，没有颜色。要徽标颜色时在 `request` 里补上 `status` 或 `color` 再返回。
- 列的 `params` 会追加到 query key 末尾并传给 `request`，`params` 变了就重新取。

### 2.5 校验、默认值、必填星号、类型

**规则写在哪。** 列的 `formItemProps.rules` 是这个字段的 zod schema。位置和 ProComponents 相同（antd 的 `rules` 也在 `formItemProps` 里），内容从规则数组换成 zod。

```ts
{
  title: '应用名称',
  dataIndex: 'name',
  formItemProps: { rules: z.string().trim().min(1, '应用名称不能为空').max(100, '应用名称长度不能超过 100 个字符') }
}
```

**从列推导出四样东西**（`src/components/pro/form/schema.ts`）：

| 推导结果 | 规则 |
|---|---|
| 字段级校验 | 每个字段：`<form.AppField validators={{ onDynamic: rules }}>` |
| 表单级 schema | `z.looseObject({ [dataIndex]: rules })`，只收对象写法里的 `rules`；用 `looseObject` 是为了保留没有规则的字段 |
| 默认值 | 每个字段：列的 `initialValue`，没有就用该 `valueType` 的空值（`''`、`null`……），最后被表单的 `initialValues` 覆盖 |
| 必填星号 | `formItemProps.required` 写了就用它；没写时，该类型有空值且 `rules.safeParse(空值)` 不通过，就画星号。这和 antd「不设置则根据校验规则自动生成」的语义相同 |

**校验行为保持现状。** 表单仍然是 `useAppForm` + `revalidateLogic()`：表单级 `validators.onDynamic` 是上面的 schema，字段级 `validators.onDynamic` 是各自的 `rules`；提交仍然走 `FormShell` 的三步（先 `form.validate('submit')`，再 `form.handleSubmit()`，最后聚焦第一个 `aria-invalid` 的控件）。

**提交的值。** 校验通过后，pro 层用表单级 schema 再 `parse` 一次，把结果交给 `onFinish`。所以 `onFinish` 拿到的是 zod 的输出：`.trim()` 已经生效，`.transform()` 也已经执行。提交前的转换写在规则里，类型跟着走：

```ts
// '' -> null, and `onFinish` sees `string | null`
formItemProps: { rules: z.string().refine(isEmptyOrFuture, '失效时间必须是未来时间').transform(value => value || null) }
```

因此表单这一侧不再需要 ProComponents 的 `transform`，只保留反方向的 `convertValue`（详情 → 表单值）。填充修改表单时，记录里的 `null` / `undefined` 自动换成该类型的空值，所以现在各页面的 `toFormValues` 里那些 `?? ''` 不用再写；只有真正要换形状的字段才写 `convertValue`，比如 `deptId` 转成字符串。

**TypeScript 类型。** `onFinish` 的参数类型是 `InferFormValues<T, typeof columns>`：

- 有 `rules` 的字段：`z.output<typeof rules>`；
- 没有 `rules` 的字段：记录类型里这个键的类型，如 `AppResp['status']`；
- `hideInForm: true`、`index`、`option` 的列不参与。

这要求 `columns` 用 `as const satisfies readonly ProColumns<T>[]` 声明。直接标注成 `ProColumns<T>[]` 会丢掉字面量，推不出字段。

**限制。**

- 函数形式的 `formItemProps` 返回的 `rules` 只作为字段级校验生效，不进表单级 schema，也不参与类型推导（该字段按记录类型算）。
- `dependency` 子列同理：只有字段级校验，值的类型不推导。
- 表单独有、记录类型里没有的字段（如用户的 `password`），要在实体类型上补一个可选键：`type UserRecord = UserResp & { password?: string }`。
- 跨字段规则（「结束时间不早于开始时间」这类）起步不支持，见第五节。

### 2.6 `ProTable` 的数据流

**状态。** `ProTable` 自己持有：分页、列显隐、关键字、搜索栏的值、树的展开状态、全屏。页面不再写这些 `useState`。

**请求参数。** 和 ProComponents 的合并顺序一致：

```
params = { current, pageSize,          // pagination !== false 时才有
           ...搜索栏的值,               // 去掉空值，经过各列的 search.transform
           [options.search.name]: 关键字,
           ...props.params }
request(params, sort, filter, signal)
```

`sort` 和 `filter` 两个位置保留是为了和 ProComponents 的调用形状一致，起步阶段恒为 `{}`（表头排序、表头筛选都没做）。第四个参数 `signal` 是新增的。

**query key。**

```
[...props.queryKey, params, sort, filter]
```

`queryKey` 传实体已有的列表前缀，如 `appKeys.lists()`。这样：

- 翻页、改筛选会换 key，`placeholderData: keepPreviousData` 让旧数据半透明地留在屏幕上（现有行为）。
- 换 key 时 TanStack Query 通过 `signal` 取消上一个请求，`request` 把 `signal` 传给接口函数即可。
- 新增、修改、删除后照旧 `invalidateQueries({ queryKey: appKeys.all })`。`ConfirmDialog` 的 `invalidateKeys` 不用改，因为列表的 key 就在这个前缀下面。

**`actionRef` 和失效的对应关系。**

| `actionRef.current` | 实现 |
|---|---|
| `reload()` | `queryClient.invalidateQueries({ queryKey: props.queryKey })`：这个列表所有页都标记过期，当前页立即重取 |
| `reload(true)` | 页码回 1，再做同样的失效 |
| `reloadAndRest()` | 同 `reload(true)`；ProComponents 还会清空选中行，这里没有行选择 |
| `reset()` | 关键字和搜索栏回到 `form.initialValues`，页码回 1，再失效 |
| `setPageInfo()`、`pageInfo` | 读写内部的分页状态 |
| `fullScreen()` | 现有的 `useFullscreenTransition().toggleFullscreen` |

工具栏的刷新按钮调用的就是 `reload()`。它和现在的 `query.refetch()` 的区别是，其他页的缓存也会被标记过期。

**其余对应。**

- `manualRequest` 对应 `useQuery` 的 `enabled: !manualRequest`。值从 `true` 变 `false` 时发出请求，和 ProComponents 的行为一致，可以直接替代 `useListTable` 的 `enabled`。
- `postData` 在渲染时处理 `data`，不触发请求，适合树表的本地过滤（2.8）。
- 总数变少导致当前页越界时，沿用 `usePageClamp`。
- 搜索栏的值变化后页码回 1。
- 搜索栏的默认值来自 `form.initialValues`，不读列的 `initialValue`。同一份列既用于新增表单又用于搜索，「状态默认启用」不应该变成「默认只看启用的」。

**搜索栏的样子。** 沿用现在的行内筛选：关键字框在最左，后面是各个筛选控件，改了立即生效，没有「查询 / 重置」按钮。行为上接近 ProComponents 的 `filterType: 'light'`，但控件是项目现有的 `TableSearch`、`FilterSelect`、`DateRangeFilter`。ProComponents 默认的 `QueryFilter`（带标签的栅格表单加查询、重置、展开收起）不做，见第七节问题 3。

**哪些列进搜索栏。** 列上写了 `search: true`（或对象）才进。这和 ProComponents 相反（它默认全进，逐列 `search: false` 关掉）。本项目的列表通常是「一个关键字框加一两个筛选」，十几列里只有一两列可搜，按 ProComponents 的默认值每个实体要写十来个 `search: false`。见第七节问题 2。

### 2.7 逃生口

| 需求 | 写法 | 来源 |
|---|---|---|
| 单元格、详情项自己画 | `render(dom, entity, index, action, schema)`，用 `schema.type` 区分表格和详情 | 同 ProComponents |
| 先改值再按类型渲染 | `renderText` | 同 ProComponents |
| 表单控件自己画 | `formItemRender(schema, { id, value, onChange, onBlur, invalid, type, defaultRender }, form)`，返回受控控件；`type === 'table'` 表示在搜索栏里 | 同 ProComponents，多了 `id`、`onBlur`、`invalid` |
| 连标签和错误也自己画 | 再加 `ignoreFormItem: true` | 同 ProComponents |
| 属性随表单值变化 | `fieldProps` / `formItemProps` 写成函数 `(form, config) => props`；读别的字段时加 `dependencies: ['那个字段']` | 同 ProComponents |
| 改一个字段时联动改另一个 | `fieldProps: form => ({ onChange: value => form.setFieldsValue({ ... }) })` | 同 ProComponents |
| 一组字段按条件出现 | `{ valueType: 'dependency', name: ['a'], columns: ({ a }) => [...] }` | 同 ProComponents |
| 新增和修改的字段不同 | 页面按模式传不同的 `columns`（见下） | 同 ProComponents |
| 整个抽屉手写 | 不用 `BetaSchemaForm`，见本节末尾 | — |

**新增和修改不同。** ProComponents 的 `hideInForm` 只是布尔值，`BetaSchemaForm` 也不区分新增和修改；它的做法是调用方给不同的 `columns`。这里照做：

```ts
// user-columns.tsx
export const passwordColumn = {
  title: '密码',
  dataIndex: 'password',
  valueType: 'password',
  hideInTable: true,
  hideInDescriptions: true,
  formItemProps: { rules: z.string().min(1, '密码不能为空').regex(PASSWORD_PATTERN, PASSWORD_HINT) }
} as const satisfies ProColumns<UserRecord>

export const userColumns = [/* …, */ passwordColumn /* , … */] as const satisfies readonly ProColumns<UserRecord>[]

// user-list.tsx
const formColumns = isCreate ? userColumns : userColumns.filter(column => column !== passwordColumn)
```

修改时列里没有 `password`，表单级 schema 里也就没有它，和现在的 `baseSchema` / `createSchema` 等价。代价是类型上 `values.password` 在两种模式下都是 `string`，修改模式下运行时没有这个键，只能在 `isCreate` 分支里读。

**手写抽屉和 `ProTable` 共存。** `ProTable` 只要求两件事：操作列的 `render` 能调页面的 `setState` 打开抽屉；抽屉保存成功后失效实体的 key 前缀（现在所有抽屉已经这么做），或者调用 `actionRef.current?.reload()`。抽屉内部用 `useAppForm` 手写还是用 `BetaSchemaForm`，`ProTable` 不关心。

### 2.8 树表和不分页的列表

可以表达，用三个属性：

```tsx
<ProTable<DeptResp>
  rowKey="id"
  columns={deptColumns}
  queryKey={deptKeys.trees()}
  pagination={false}
  expandable={{ childrenColumnName: 'children', expandedRowKeys, onExpandedRowsChange: setExpandedRowKeys }}
  request={async (_params, _sort, _filter, signal) => ({ data: await getDeptTree(undefined, signal) })}
  // Filter the cached tree locally; returning false keeps the keyword out of the request.
  options={{ search: { placeholder: '搜索部门名称或描述', onSearch: keyword => (setKeyword(keyword), false) } }}
  postData={tree => filterDeptTree(tree, keyword)}
/>
```

- `pagination={false}`：不画分页，`request` 的参数里没有 `current` / `pageSize`，表头吸顶（现在的 `stickyHeader` + `showPagination={false}`）。
- `expandable`：`childrenColumnName` 对应 TanStack Table 的 `getSubRows`。第一个数据列自动加缩进和展开箭头，这是 antd 的默认行为，现在部门、菜单的名称列手写的那段缩进逻辑收进 pro 层。
- 本地过滤：`options.search.onSearch` 返回 `false` 是 ProComponents 拦截请求的原生方式，配合 `postData` 就是现在部门、菜单页「取一次整棵树、前端过滤」的行为。
- 「全部展开 / 收起」按钮放在 `toolBarRender` 里，通过受控的 `expandedRowKeys` 实现。

### 2.9 权限

沿用 `usePermission` 的约定：每个页面调用一次，结果往下传，不在行里调用。

```tsx
const { hasPermission } = usePermission()

// 1. Toolbar buttons: falsy entries are skipped.
toolBarRender={() => [
  hasPermission('system:user:create') && <Button key="create">…</Button>,
  hasPermission('system:user:export') && <Button key="export">…</Button>
]}

// 2. Row actions: falsy menu entries are skipped, leftover dividers are dropped.
<TableDropdown
  key="actions"
  onSelect={key => handleAction(key, user)}
  menus={[
    { key: 'detail', name: '用户详情', icon: <Eye /> },
    hasPermission('system:user:update') && { key: 'edit', name: '修改用户', icon: <Pen />, disabled: isLocked },
    { type: 'divider' },
    hasPermission('system:user:delete') && { key: 'delete', name: '删除', icon: <Trash2 />, danger: true, disabled: isLocked }
  ]}
/>

// 3. A whole column: plain `hideInTable`.
{ title: '操作', valueType: 'option', hideInTable: !hasAnyPermission(ROW_ACTION_CODES), render: … }
```

因为操作列要用到页面的状态和 `hasPermission`，它在页面里用 `useMemo` 追加到实体的列后面；`hasPermission` 在权限码不变时引用稳定，可以直接做依赖。列和菜单项上不加 `permission` 字段，ProComponents 没有这个概念，条件表达式已经够用。

### 2.10 概念对照表

状态：**相同** = 名字和语义都一样；**调整** = 名字一样，语义或类型有出入；**新增** = ProComponents 没有；**不做** = 起步不支持。

| ProComponents | 本项目 | 状态 | 说明 |
|---|---|---|---|
| `ProTable` | `ProTable` | 调整 | 请求走 TanStack Query；内部是 `DataTable` |
| `ProColumns<T, ValueType>` | `ProColumns<T>` | 调整 | 一个类型覆盖表格、表单、详情；自定义 `valueType` 用声明合并登记，不用第二个泛型 |
| `ProFormColumnsType`、`ProDescriptionsColumn` | 并入 `ProColumns` | 不做 | 一份数组一种类型，不需要强转 |
| `title` | `title` | 调整 | 函数形式是 `(schema, type)`，少了第三个参数 `dom` |
| `dataIndex` | `dataIndex` | 调整 | 类型是 `keyof T`，写错会报错；不支持数组路径 |
| `key` | `key` | 相同 | |
| `valueType` | `valueType` | 调整 | 只支持字符串；函数形式和 `{ type: 'money' }` 对象形式不做 |
| `valueEnum` | `valueEnum` | 调整 | 对象和 `Map` 都支持；`status` 映射到 `ToneBadge`；`color` 只能是 `ToneBadge` 的色名；函数形式不做 |
| `fieldProps` | `fieldProps` | 相同 | 类型按 `valueType` 收窄 |
| `formItemProps` | `formItemProps` | 调整 | 内容是项目 `FormItem` 的属性（`description`、`required`、`className`……）加 `rules` |
| `formItemProps.rules` | `formItemProps.rules` | 调整 | 一个 zod schema，不是 antd 规则数组 |
| `render` | `render` | 相同 | |
| `renderText` | `renderText` | 相同 | |
| `formItemRender`（2.x：`renderFormItem`） | `formItemRender` | 调整 | `config` 里多了 `id`、`onBlur`、`invalid`；不自动给返回的节点注入 `value` / `onChange` |
| `ignoreFormItem` | `ignoreFormItem` | 相同 | 注册表条目上也能写 |
| `hideInTable`、`hideInForm`、`hideInDescriptions`、`hideInSetting` | 同名 | 相同 | |
| `search: false`（2.x：`hideInSearch`） | `search` | 调整 | 默认值相反：写了 `search: true` 才进搜索栏 |
| `search.transform` | `search.transform` | 相同 | |
| `initialValue` | `initialValue` | 调整 | 只是新增表单的默认值，不作为搜索默认值 |
| `order` | `order` | 调整 | 影响表单和搜索栏；详情按数组顺序，不看 `order` |
| `convertValue` | `convertValue` | 相同 | |
| `transform`（表单提交） | zod 的 `.transform()` | 不做 | 写在 `rules` 里，类型能跟着变 |
| `ellipsis`、`copyable` | 同名 | 调整 | 只支持布尔值 |
| `dependencies` | `dependencies` | 调整 | 只做「依赖字段变化时重渲染」；ProComponents 还会把值注入 `request` 的 `params` |
| 列级 `request`、`params` | 同名 | 调整 | 走 `useQuery`；第二个参数是 `{ signal }` |
| `proFieldProps.proFieldKey` | 同名 | 调整 | 是 query key，和 `request` 一起必填 |
| `valueType: 'dependency'` + `name` + `columns` | 同名 | 相同 | |
| `span`（详情） | `span` | 调整 | 只有 1 和 2 |
| `colSize`、`colProps`、`rowProps`、`width`、`formWidth` | — | 不做 | 表单目前都是单列；需要跨列时用 `formItemProps.className` |
| `tooltip` | — | 不做 | 现有页面没有用到表头提示 |
| `editable`、`readonly`、`hidden` | — | 不做 | 没有可编辑表格 |
| `sorter`、`filters`、`onFilter`、`fixed`、`children` | — | 不做 | 现有页面没有表头排序、筛选、固定列、分组表头 |
| 表级 `request(params, sort, filter)` | `request(params, sort, filter, signal)` | 调整 | 多一个 `signal`；`sort`、`filter` 起步恒为 `{}` |
| `RequestData`（`data`、`total`、`success`） | `RequestData` | 相同 | |
| — | `queryKey` | 新增 | TanStack Query 需要 |
| `params` | `params` | 相同 | |
| `rowKey` | `rowKey` | 调整 | 必填 |
| `actionRef` / `ActionType` | 同名 | 调整 | 见 2.6；没有 `clearSelected`、`getSortFilter`、`scrollTo` 和行编辑方法 |
| `formRef` | `formRef` | 调整 | `ProFormInstance` 只有 6 个方法 |
| `toolBarRender` | `toolBarRender` | 调整 | 没有第二个参数（选中行） |
| `headerTitle` | `headerTitle` | 调整 | 画成卡片标题 |
| `toolbar.subTitle` | `toolbar.subTitle` | 调整 | 画成卡片标题下的说明 |
| `options`（`reload`、`setting`、`fullScreen`、`search`） | 同名 | 调整 | `fullScreen` 默认开；全屏是页内动画，不是浏览器全屏；没有 `density` |
| `options.search.name`、`onSearch` | 同名 | 调整 | 关键字框在筛选行最左，不在工具栏里 |
| `search`（`SearchConfig`） | `search?: false` | 调整 | 只有开关；`QueryFilter` 的配置项不适用 |
| `form.initialValues` | 同名 | 相同 | |
| `pagination` | `pagination` | 调整 | `false` 或 `{ defaultPageSize }` |
| `columnsState` | `columnsState` | 调整 | 只有 `defaultValue`；受控和持久化不做 |
| `manualRequest` | `manualRequest` | 相同 | |
| `postData` | `postData` | 调整 | 每次渲染时执行，不只在请求返回后 |
| `expandable` | `expandable` | 调整 | 只有 4 个字段 |
| `columnEmptyText` | `columnEmptyText` | 调整 | 默认是项目的 `EMPTY_PLACEHOLDER`（`—`） |
| `cardProps` | `cardProps?: false` | 调整 | 只能关掉卡片 |
| `TableDropdown` | `TableDropdown` | 调整 | 菜单项多了 `icon`、`danger` 和分隔线，跳过假值 |
| `dataSource`、`loading`（不走 `request`） | — | 不做 | 本地过滤用 `postData` |
| `rowSelection`、`tableAlertRender` | — | 不做 | 只有「角色分配用户」一处用到选择，保持手写 |
| `polling`、`debounceTime`、`revalidateOnFocus`、`onLoad`、`onRequestError`、`beforeSearchSubmit`、`tableRender` 等 | — | 不做 | 没有页面需要 |
| `BetaSchemaForm` / `FormSchema` | 同名 | 调整 | 内部是 `useAppForm` + `FormShell` |
| `layoutType` | `layoutType` | 调整 | 只有 `'Form'` 和 `'DrawerForm'` |
| `onFinish` | `onFinish` | 相同 | 返回真值关闭抽屉 |
| 表单的 `request`、`params` | 同名 | 调整 | 走 `useDetailQuery`；多一个 `signal` 和 `queryKey` |
| `initialValues` | `initialValues` | 相同 | |
| `open`、`onOpenChange`、`title`、`width`、`drawerProps` | 同名 | 调整 | `width` 取 `EntityDrawer` 的档位；`drawerProps` 是 `EntityDrawer` 的头部属性 |
| `trigger` | — | 不做 | 同一个抽屉既要从工具栏开（新增），也要从行菜单开（修改），必须受控 |
| `submitter` | `submitter` | 调整 | 只有 `false` 和 `searchConfig` |
| `ProDescriptions` | `ProDescriptions` | 调整 | 内部是 `DetailGrid` + `DetailField`；没有行内编辑、`actionRef` |
| `ProConfigProvider` 的 `valueTypeMap` | 同名 | 调整 | 只有这一个属性 |
| `ProRenderFieldPropsType` | 同名 | 调整 | 回调少了第三个参数 `dom`；多了 `ignoreFormItem`、`initialValue` |
| `ProFieldValueTypeWithFieldProps` | 同名 | 调整 | 是 `interface`，可以声明合并 |
| `mode: 'read' \| 'edit' \| 'update'` | `'read' \| 'edit'` | 调整 | |
| `light` | `light` | 相同 | 表示在搜索栏里 |
| `ProForm`、`ProFormText` 等逐个字段组件 | 现有的 `useAppForm` + `field.TextInput` 等 | 不做 | 手写表单继续用现有组件 |

### 2.11 故意不做的部分

为了让这一层保持在十来个文件的规模，下面这些 ProComponents 能力不做：

- 可编辑表格（`EditableProTable`、`editable`、行内编辑相关的 `actionRef` 方法）。
- `QueryFilter` 和 `LightFilter` 两种独立的筛选表单组件；搜索栏只有一种实现。
- `StepsForm` / `StepForm`、`ModalForm`、`LoginForm`、`Embed`。
- `formList`、`formSet`、`group`、`divider` 四种布局类型。
- `ProList`、卡片列表、`ProCard`、`ProLayout`、`PageContainer`。
- 国际化（`intl`）、主题 token、暗色算法；文案直接写中文，样式走 Tailwind。
- 表格密度、列拖拽排序、列固定、列设置持久化、拖拽排序表格。
- 行选择和批量操作栏。
- 表头排序和表头筛选。
- 轮询、窗口聚焦刷新、游标分页、同步到 URL。
- 除 2.3 以外的 `valueType`（金额、百分比、进度条、评分、滑块、颜色、图片、头像、代码、级联、多选框、单选框、时间、周/月/季/年、相对时间等）。需要时作为项目类型注册。
- 单元格自动合并（`mergeFields`、`autoMerge`）。

---

## 三、内部结构

### 1. 文件

```
src/components/pro/
  index.ts                      入口，只导出 2.2「入口」里的那些
  typing.ts                     全部公共类型
  provider.tsx                  ProConfigProvider 和读取 valueTypeMap 的 hook
  field/
    pro-field.tsx               按 valueType 和 mode 分发到注册表；空值占位、copyable、ellipsis
    value-type-map.tsx          内置 valueType 的只读 / 编辑 / 搜索三种渲染
    value-enum.tsx              valueEnum → ToneBadge；valueEnum → 选项数组
    use-field-options.ts        列级 request 的 useQuery 封装
  table/
    pro-table.tsx               ProTable：状态、拼装、actionRef
    gen-pro-column-to-column.tsx  ProColumns → TanStack ColumnDef
    use-fetch-data.ts           query key、useQuery、分页、usePageClamp
    form-render.tsx             搜索栏：关键字框和 search 列的筛选控件
    tool-bar.tsx                toolBarRender 和 options 三个按钮
    table-dropdown.tsx          TableDropdown
  form/
    schema-form.tsx             BetaSchemaForm：genItems、dependency、两种 layoutType
    schema.ts                   列 → zod schema、默认值、必填、骨架形状
    form-instance.ts            ProFormInstance 的两种实现（TanStack Form、搜索栏状态）
  descriptions/
    pro-descriptions.tsx        ProDescriptions
```

文件名尽量和 ProComponents 的对应文件一致（`genProColumnToColumn`、`useFetchData`、`FormRender`、`ToolBar`、`ValueTypeToComponent`），方便对照源码。

项目侧另有两个文件，不属于 pro 层：`src/components/pro-value-types.tsx`（项目的 `valueType`）和 `src/lib/dict-column.ts`（字典列）。

### 2. 每一块落在哪些现有组件上

| pro 层 | 用到的现有代码 |
|---|---|
| `ProTable` 外框 | `ListPageCard`（标题、说明、全屏占位）、`ListFilterRow`、`TableFillArea`、`useFullscreenTransition` |
| 表格本体 | `DataTable`（含 `TablePagination`、`TableSkeletonRows`、`QueryState`）、`dataTableFeatures`、`useTable` |
| 取数 | `useQuery` + `keepPreviousData`、`usePageClamp` |
| 工具栏 | `TableToolbar`（刷新、列显隐、全屏、重置列） |
| 搜索栏 | `TableSearch`、`FilterSelect`、`DateRangeFilter`、`toDateTimeRangeQuery` 里的格式化逻辑 |
| `TableDropdown` | `RowActionsMenu` + `DropdownMenuItem` / `DropdownMenuSeparator` |
| 只读渲染 | `ToneBadge`、`TextCell`、`CopyButton`、`EMPTY_PLACEHOLDER` |
| `BetaSchemaForm` | `useAppForm`、`FormShell`、`FormFooter`、`FormItem`，以及 `src/components/form/*` 的六个输入组件 |
| `DrawerForm` 布局 | `EntityDrawer`、`useDetailQuery`、`useFillFormOnce`、`FormSkeleton`、`QueryState`、`reportError` |
| `ProDescriptions` | `DetailGrid`、`DetailField`、`useDetailQuery`、`useLastRecord`、`Skeleton` |

`BetaSchemaForm` 的抽屉流程就是现在每个表单抽屉里重复的那一段：新增直接渲染表单；修改等详情取回、且不在重取中再渲染，失败显示重试，加载中显示 `FormSkeleton`（形状按列的 `valueType` 生成）；提交中不允许关闭；`onFinish` 抛错时调用 `reportError` 并保持抽屉打开。

### 3. 现有文件的去向

不删除任何文件，下面只是分类。

**继续公开使用**（手写页面和 pro 层都会用）：

- `confirm-dialog.tsx`、`delete-confirm-dialog.tsx`
- `tone-badge.tsx`、`query-state.tsx`、`copy-button.tsx`、`copyable-text.tsx`
- `entity-drawer.tsx`
- `src/components/form/*` 全部：`useAppForm`、六个输入组件、`FormShell`、`FormFooter`、`FormItem`
- `form-skeleton.tsx`
- `data-table.tsx`、`table-toolbar.tsx`、`table-search.tsx`、`filter-select.tsx`、`date-range-filter.tsx`、`row-actions-menu.tsx`：手写的列表（文件管理、角色分配用户等）继续直接用
- `dept-tree-select.tsx`、`expiry-picker.tsx`、`parent-tree-select.tsx` 等控件
- `use-permission.ts`、`use-export.ts`、`use-last-record.ts`、`use-detail-query.ts`、`use-fill-form-once.ts`

**变成内部积木**（配置式页面不再直接引用，由 pro 层引用）：

- `list-page-card.tsx`、`list-filter-row.tsx`、`table-fill-area.tsx`
- `table-pagination.tsx`、`table-skeleton-rows.tsx`
- `detail-field.tsx`
- `text-cell.tsx`
- `use-page-clamp.ts`、`use-fullscreen-transition.ts`、`use-available-height.ts`

**全部页面迁移完后不再有人引用**：

- `src/components/table/columns.tsx` 里的 `indexColumn`、`textColumn`、`dateTimeColumn`、`statusColumn`、`optionColumn`（`ColumnMeta` 声明要保留并放宽，见 2.3）
- `src/hooks/use-list-table.ts`，前提是手写列表里没有页面还在用
- `status-cell.tsx` 的 `StatusCell`、`SuccessFailureCell`、`StatusBadge`（换成 `valueEnum`）
- `data-badge.tsx` 的 `TypeBadge`（换成 `valueEnum` 的 `color`）
- `src/components/form/custom-field.tsx`，前提是手写表单里没有页面还在用
- 各个已迁移页面的 `*-columns.tsx`（旧写法）、`*-detail-drawer.tsx`、`*-form-drawer.tsx`、`use-*-detail.ts`

---

## 四、样板

说明：pro 层还不存在，下面的代码没有整体编译过。其中的类型难点单独验证过，见文末「类型可行性」。

### 1. 应用管理（`open/app`）完整改写

现在这个页面是 9 个文件、818 行。改写后 `app-detail-drawer.tsx`、`app-form-drawer.tsx`、`use-app-detail.ts` 三个文件不再需要；`app-display.tsx` 和三个弹窗（查看密钥、重置密钥、删除）原样保留。

```tsx
// src/routes/(main)/(app)/open/app/-components/app-columns.tsx
import { z } from 'zod'

import { Clock } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import type { ProColumns, ProSchemaValueEnumType } from '@/components/pro'
import type { AppResp, AppStatus } from '@/lib/api/app'

import { AccessKeyCell, ExpireTimeCell } from './app-display'

const STATUS_ENUM = new Map<AppStatus, ProSchemaValueEnumType>([
  [1, { text: '启用', status: 'Success' }],
  [2, { text: '禁用', status: 'Error' }]
])

/** Empty means the app never expires; a set value must lie in the future. */
function isEmptyOrFuture(value: string) {
  if (!value) return true
  const date = new Date(value.replace(/-/g, '/'))
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
}

export const appColumns = [
  { title: '序号', valueType: 'index' },
  {
    title: '应用 ID',
    dataIndex: 'id',
    hideInTable: true,
    hideInForm: true,
    span: 2,
    render: (_, app) => <CopyableText value={String(app.id)} label="复制 ID" className="break-all" />
  },
  {
    title: '应用名称',
    dataIndex: 'name',
    span: 2,
    fieldProps: { maxLength: 100, placeholder: '请输入应用名称，例如：商城接口服务' },
    formItemProps: {
      rules: z.string().trim().min(1, '应用名称不能为空').max(100, '应用名称长度不能超过 100 个字符')
    },
    render: dom => <span className="font-medium text-foreground">{dom}</span>
  },
  {
    title: 'Access Key',
    dataIndex: 'accessKey',
    hideInForm: true,
    span: 2,
    render: (_, app, _index, _action, { type }) =>
      type === 'table' ? (
        <AccessKeyCell accessKey={app.accessKey} />
      ) : (
        <CopyableText
          value={app.accessKey}
          label="复制 Access Key"
          successMessage="Access Key 已复制到剪贴板"
          className="break-all"
        />
      )
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'switch',
    valueEnum: STATUS_ENUM,
    initialValue: 1,
    // The switch sits last in the form.
    order: -1,
    formItemProps: form => ({
      description: form.getFieldValue('status') === 1 ? '启用后允许调用开放 API 接口' : '禁用后阻止所有调用请求'
    })
  },
  {
    title: '失效时间',
    dataIndex: 'expireTime',
    valueType: 'expiry',
    fieldProps: { neverLabel: '永久有效', placeholder: '永久有效（点击设置失效时间）' },
    formItemProps: {
      rules: z
        .string()
        .refine(isEmptyOrFuture, '失效时间必须是未来时间')
        .transform(value => value || null),
      description: (
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          留空表示永久有效；若设置则必须是未来时间
        </span>
      )
    },
    render: (_, app) => <ExpireTimeCell expireTime={app.expireTime} />
  },
  {
    title: (_, type) => (type === 'table' ? '描述' : '应用描述'),
    dataIndex: 'description',
    valueType: 'textarea',
    ellipsis: true,
    span: 2,
    fieldProps: { rows: 3, maxLength: 200, placeholder: '请输入应用描述信息（选填，最大 200 字）' },
    formItemProps: {
      rules: z
        .string()
        .max(200, '描述长度不能超过 200 个字符')
        .transform(value => value || undefined)
    }
  },
  { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
  { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
  { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
  { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true }
] as const satisfies readonly ProColumns<AppResp>[]
```

```tsx
// src/routes/(main)/(app)/open/app/-components/app-list.tsx
import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { Download, Eye, KeyRound, LayoutGrid, Pen, Plus, RotateCcw, Trash2 } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import {
  BetaSchemaForm,
  ProDescriptions,
  ProTable,
  TableDropdown,
  type ProColumns,
  type ProFormInstance
} from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useExport } from '@/hooks/use-export'
import {
  appKeys,
  createApp,
  exportApps,
  getApp,
  listApps,
  updateApp,
  type AppPageQuery,
  type AppResp
} from '@/lib/api/app'

import { appColumns } from './app-columns'
import { AppDeleteDialog } from './app-delete-dialog'
import { AppResetSecretDialog } from './app-reset-secret-dialog'
import { AppSecretDialog } from './app-secret-dialog'

type AppAction = 'detail' | 'edit' | 'secret' | 'resetSecret' | 'delete'
type AppSearch = Omit<AppPageQuery, 'page' | 'size'>

const DEFAULT_SORT = 'id,desc'

const HIDDEN_BY_DEFAULT = {
  createUserString: { show: false },
  updateUserString: { show: false },
  updateTime: { show: false }
}

export function AppList() {
  const queryClient = useQueryClient()
  const formRef = React.useRef<ProFormInstance<AppSearch>>(undefined)
  // One state per overlay: a null value means it is closed. The form drawer holds an object,
  // because a null id there means 新增.
  const [detailAppId, setDetailAppId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ appId: string | number | null } | null>(null)
  const [secretApp, setSecretApp] = React.useState<AppResp | null>(null)
  const [resetSecretApp, setResetSecretApp] = React.useState<AppResp | null>(null)
  const [deletingApp, setDeletingApp] = React.useState<AppResp | null>(null)
  const { isExporting, exportData } = useExport(exportApps)

  const columns = React.useMemo<readonly ProColumns<AppResp>[]>(() => {
    const handleAction = (action: AppAction, app: AppResp) => {
      if (action === 'detail') setDetailAppId(app.id)
      else if (action === 'edit') setFormTarget({ appId: app.id })
      else if (action === 'secret') setSecretApp(app)
      else if (action === 'resetSecret') setResetSecretApp(app)
      else setDeletingApp(app)
    }

    return [
      ...appColumns,
      {
        title: '操作',
        valueType: 'option',
        render: (_, app) => {
          const isLocked = Boolean(app.disabled)
          return [
            <TableDropdown<AppAction>
              key="actions"
              onSelect={action => handleAction(action, app)}
              menus={[
                { key: 'detail', name: '应用详情', icon: <Eye /> },
                { key: 'edit', name: '修改应用', icon: <Pen />, disabled: isLocked },
                { type: 'divider' },
                { key: 'secret', name: '查看密钥', icon: <KeyRound /> },
                { key: 'resetSecret', name: '重置密钥', icon: <RotateCcw />, disabled: isLocked },
                { type: 'divider' },
                { key: 'delete', name: '删除', icon: <Trash2 />, danger: true, disabled: isLocked }
              ]}
            />
          ]
        }
      }
    ]
  }, [])

  const formAppId = formTarget?.appId ?? null

  return (
    <>
      <ProTable<AppResp, AppSearch>
        headerTitle="应用管理"
        toolbar={{ subTitle: '维护第三方接入应用及其访问凭证' }}
        rowKey="id"
        columns={columns}
        formRef={formRef}
        queryKey={appKeys.lists()}
        request={async ({ current, pageSize, ...search }, _sort, _filter, signal) => {
          const page = await listApps({ ...search, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        // The backend matches `description` against both the name and the description.
        options={{ search: { name: 'description', placeholder: '搜索应用名称、描述' } }}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        toolBarRender={() => [
          <Button key="create" className="w-full sm:w-auto" onClick={() => setFormTarget({ appId: null })}>
            <Plus />
            新增应用
          </Button>,
          <Button
            key="export"
            variant="outline"
            disabled={isExporting}
            onClick={() => void exportData({ ...formRef.current?.getFieldsFormatValue(), sort: DEFAULT_SORT })}
          >
            {isExporting ? <Spinner /> : <Download />}
            导出
          </Button>
        ]}
      />

      <EntityDrawer
        open={detailAppId !== null}
        onClose={() => setDetailAppId(null)}
        title="应用详情"
        icon={<LayoutGrid className="size-4" />}
        width={32}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <ProDescriptions<AppResp>
            columns={appColumns}
            queryKey={appKeys.detail(detailAppId)}
            request={
              detailAppId === null ? undefined : async (_params, signal) => ({ data: await getApp(detailAppId, signal) })
            }
          />
        </div>
      </EntityDrawer>

      <BetaSchemaForm<AppResp, typeof appColumns>
        layoutType="DrawerForm"
        title={formAppId === null ? '新增应用' : '修改应用'}
        drawerProps={{ icon: <LayoutGrid className="size-4" /> }}
        width={30}
        open={formTarget !== null}
        onOpenChange={open => {
          if (!open) setFormTarget(null)
        }}
        columns={appColumns}
        queryKey={appKeys.detail(formAppId)}
        request={formAppId === null ? undefined : (_params, signal) => getApp(formAppId, signal)}
        // `values` is { name: string; status: AppStatus; expireTime: string | null; description: string | undefined }.
        onFinish={async values => {
          if (formAppId === null) {
            await createApp(values)
          } else {
            await updateApp(formAppId, values)
          }

          void queryClient.invalidateQueries({ queryKey: appKeys.all })
          toast.add({ title: formAppId === null ? '新增应用成功' : '修改应用成功', type: 'success' })
          return true
        }}
      />

      <AppSecretDialog app={secretApp} open={secretApp !== null} onClose={() => setSecretApp(null)} />
      <AppResetSecretDialog
        app={resetSecretApp}
        open={resetSecretApp !== null}
        onClose={() => setResetSecretApp(null)}
        onSuccess={setSecretApp}
      />
      <AppDeleteDialog app={deletingApp} open={deletingApp !== null} onClose={() => setDeletingApp(null)} />
    </>
  )
}
```

现有行为的对应：

| 现有行为 | 改写后 |
|---|---|
| 关键字搜索，参数名 `description` | `options.search` |
| 序号翻页连续 | `valueType: 'index'` |
| 名称加粗、不截断 | `render`，不写 `ellipsis` |
| Access Key 带复制按钮 | `render`，按 `type` 区分表格和详情 |
| 状态徽标 | `valueEnum` |
| 失效时间的「永久有效 / 已过期」 | `render`，表格和详情共用 |
| 描述截断 | `ellipsis: true` |
| 审计列默认隐藏 | `columnsState.defaultValue` |
| 行操作 5 项，内置应用禁用 | `valueType: 'option'` + `TableDropdown` |
| 新增 / 修改抽屉，zod 校验 | `BetaSchemaForm`，规则在列上 |
| 表单顺序：名称、失效时间、描述、状态 | 数组顺序，状态列 `order: -1` |
| 详情抽屉 | `EntityDrawer` + `ProDescriptions` |
| 导出带当前筛选 | `formRef.current.getFieldsFormatValue()` |
| 查看密钥、重置密钥、删除 | 原有弹窗，不变 |

和现状有三处细微差别：应用名称首尾空格会被去掉后再提交（现在 schema 里写了 `.trim()` 但提交的是原值）；详情里「应用描述」不再是灰色字；修改抽屉的骨架屏形状按列生成，不再手写。

### 2. 用户管理（`system/user`）要点

只写难点，其余列和应用管理同理。

```tsx
// src/routes/(main)/(app)/system/user/-components/user-columns.tsx
/** `password` only exists in the create form, so it is added to the record type as an optional key. */
export type UserRecord = UserResp & { password?: string }

const GENDER_ENUM = new Map<UserGender, string>([
  [0, '未知'],
  [1, '男'],
  [2, '女']
])

/** Only the create form shows it; the page drops this column when editing. */
export const passwordColumn = {
  title: '密码',
  dataIndex: 'password',
  valueType: 'password',
  hideInTable: true,
  hideInDescriptions: true,
  fieldProps: { maxLength: 32, placeholder: '请输入密码', autoComplete: 'new-password' },
  formItemProps: {
    rules: z.string().min(1, '密码不能为空').regex(PASSWORD_PATTERN, PASSWORD_HINT),
    description: PASSWORD_HINT,
    hideDescriptionOnError: true
  }
} as const satisfies ProColumns<UserRecord>

export const userColumns = [
  { title: '序号', valueType: 'index' },
  {
    title: '昵称',
    dataIndex: 'nickname',
    fieldProps: { maxLength: 30, placeholder: '请输入昵称' },
    formItemProps: { rules: z.string().regex(NAME_PATTERN, '昵称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线') },
    render: (dom, user, _index, _action, { type }) => (type === 'table' ? <NicknameCell user={user} /> : dom)
  },
  // username …
  passwordColumn,
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'switch',
    valueEnum: STATUS_ENUM,
    // In the search bar a switch column is a 全部 / 启用 / 禁用 select.
    search: true,
    initialValue: 1,
    order: -1,
    formItemProps: form => ({
      description: form.getFieldValue('status') === 1 ? '启用后该用户可以登录' : '禁用后该用户无法登录'
    })
  },
  {
    title: '性别',
    dataIndex: 'gender',
    valueType: 'select',
    valueEnum: GENDER_ENUM,
    initialValue: 1,
    // Always has a value, so no required mark.
    formItemProps: { required: false }
  },

  // Department: the table and the detail show the name, the form and the search bar pick by id.
  { title: '所属部门', dataIndex: 'deptName', hideInForm: true },
  {
    title: '所属部门',
    dataIndex: 'deptId',
    valueType: 'deptTreeSelect',
    hideInTable: true,
    hideInDescriptions: true,
    search: true,
    convertValue: value => (value == null ? '' : String(value)),
    formItemProps: { rules: z.string().min(1, '请选择所属部门') }
  },

  // Roles: same split. The multi-select is the existing component, wired through `formItemRender`.
  {
    title: '角色',
    dataIndex: 'roleNames',
    hideInForm: true,
    render: (_, user) => <TagList items={user.roleNames} max={1} />
  },
  {
    title: '角色',
    dataIndex: 'roleIds',
    hideInTable: true,
    hideInDescriptions: true,
    initialValue: [],
    convertValue: value => (value as UserResp['roleIds']).map(String),
    formItemProps: { rules: z.array(z.string()).min(1, '请至少选择一个角色') },
    formItemRender: (_, { id, value, onChange, invalid }) => (
      <UserRoleSelect id={id} value={value as string[]} onChange={onChange} invalid={invalid} />
    )
  }
  // phone, email, isSystem, description, audit columns …
] as const satisfies readonly ProColumns<UserRecord>[]
```

```tsx
// src/routes/(main)/(app)/system/user/-components/user-list.tsx (excerpt)
type UserSearch = Omit<UserPageQuery, 'page' | 'size'>

export function UserList() {
  // One store subscription for the page; rows only close over the result.
  const { hasPermission } = usePermission()
  const formRef = React.useRef<ProFormInstance<UserSearch>>(undefined)
  // … overlay states, same as today

  const columns = React.useMemo<readonly ProColumns<UserRecord>[]>(
    () => [
      ...userColumns,
      {
        title: '操作',
        valueType: 'option',
        render: (_, user) => {
          const isLocked = Boolean(user.disabled)
          return [
            <TableDropdown<UserAction>
              key="actions"
              onSelect={action => handleAction(action, user)}
              menus={[
                { key: 'detail', name: '用户详情', icon: <Eye /> },
                hasPermission('system:user:update') && {
                  key: 'edit',
                  name: '修改用户',
                  icon: <Pen />,
                  disabled: isLocked
                },
                { type: 'divider' },
                hasPermission('system:user:resetPwd') && {
                  key: 'resetPassword',
                  name: '重置密码',
                  icon: <KeyRound />,
                  disabled: isLocked
                },
                hasPermission('system:user:updateRole') && {
                  key: 'assignRoles',
                  name: '分配角色',
                  icon: <ShieldCheck />,
                  disabled: isLocked
                },
                { type: 'divider' },
                hasPermission('system:user:delete') && {
                  key: 'delete',
                  name: '删除',
                  icon: <Trash2 />,
                  danger: true,
                  disabled: isLocked
                }
              ]}
            />
          ]
        }
      }
    ],
    [hasPermission, handleAction]
  )

  const formUserId = formTarget?.userId ?? null
  const isCreate = formUserId === null
  const formColumns = React.useMemo(
    () => (isCreate ? userColumns : userColumns.filter(column => column !== passwordColumn)),
    [isCreate]
  )

  return (
    <>
      <ProTable<UserRecord, UserSearch>
        headerTitle="用户管理"
        toolbar={{ subTitle: '对当前系统用户的基本信息进行管理' }}
        rowKey="id"
        columns={columns}
        formRef={formRef}
        queryKey={userKeys.lists()}
        request={async ({ current, pageSize, ...search }, _sort, _filter, signal) => {
          const page = await listUsers({ ...search, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        // Keyword box, then 部门 and 状态 from the two `search: true` columns.
        options={{ search: { name: 'description', placeholder: '搜索用户名、昵称、描述' } }}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        toolBarRender={() => [
          hasPermission('system:user:create') && (
            <Button key="create" onClick={() => setFormTarget({ userId: null })}>
              <Plus />
              新增用户
            </Button>
          ),
          hasPermission('system:user:export') && (
            <Button
              key="export"
              size="icon"
              variant="outline"
              disabled={isExporting}
              onClick={() => void exportData({ ...formRef.current?.getFieldsFormatValue(), sort: DEFAULT_SORT })}
            >
              {isExporting ? <Spinner /> : <Download />}
            </Button>
          )
        ]}
      />

      <BetaSchemaForm<UserRecord, typeof userColumns>
        layoutType="DrawerForm"
        title={isCreate ? '新增用户' : '修改用户'}
        width={32}
        open={formTarget !== null}
        onOpenChange={open => {
          if (!open) setFormTarget(null)
        }}
        columns={formColumns}
        queryKey={userKeys.detail(formUserId)}
        request={isCreate ? undefined : (_params, signal) => getUser(formUserId, signal)}
        onFinish={async ({ password, ...values }) => {
          if (isCreate) {
            // `password` is only present here: the edit columns do not contain it.
            await createUser({ ...values, password: encryptByRsa(password) })
          } else {
            await updateUser(formUserId, values)
          }

          void queryClient.invalidateQueries({ queryKey: userKeys.all })
          toast.add({ title: isCreate ? '新增成功' : '修改成功', type: 'success' })
          return true
        }}
      />

      {/* UserResetPasswordDialog, UserAssignRolesDialog, UserDeleteDialog stay hand-written. */}
    </>
  )
}
```

四个难点的落点：

| 难点 | 做法 |
|---|---|
| 部门树筛选 | `deptId` 列 `valueType: 'deptTreeSelect'` + `search: true`，搜索栏里渲染成现在那个带「部门」前缀和「全部部门」的树选择 |
| 角色多选 | `formItemRender` 直接接现有的 `UserRoleSelect`，不新增控件 |
| 密码只在新增时出现 | 页面按模式过滤掉 `passwordColumn`，校验规则随列一起消失 |
| 按权限显示操作 | `toolBarRender` 和 `TableDropdown.menus` 里用 `hasPermission(...) &&`，权限判断集中在页面一处 |

现有代码里 `email`、`phone`、`description` 的「空串转 `undefined`」「去首尾空格」都写进各列的 `rules`（`.trim().transform(value => value || undefined)`），`toUserReq` 不再需要。

---

## 五、不适合配置式的页面

### 判断标准

满足任意一条，对应的那一块就手写，不要硬套：

1. 不是「列表 + 实体表单」：设置页、仪表盘、文件管理、个人中心。
2. 表单里有动态增删的行（ProComponents 的 `formList`），或者控件自带一套子状态：富文本、用户选择器、图标选择器、带勾选策略的权限树。
3. 有跨字段的校验，或者提交前要做 schema 之外的检查。
4. 超过三分之一的字段要写 `formItemRender`。这时配置只剩下噪音，手写更清楚。
5. 选项控件自己要处理加载骨架、空状态、失败重试，并且只有这一个页面用。多个页面都用的话，注册成项目 `valueType` 再走配置。
6. 底栏不只是「取消 / 保存」。
7. 主从布局、双栏布局。外层手写，里面的表格仍然可以是 `ProTable`（`cardProps={false}`）。

表格、表单、详情分开判断。一个页面常见的情况是表格和详情走配置，表单手写。

### 预期清单

依据是这次读过的代码和各目录的文件构成；没逐个读完的页面标了「待确认」，迁移到那一页时再定。

| 页面 | 表格 | 表单 | 详情 | 原因 |
|---|---|---|---|---|
| 应用管理 | 配置 | 配置 | 配置 | 样板 |
| 用户管理 | 配置 | 配置 | 配置 | 见第四节；重置密码、分配角色两个弹窗手写 |
| 租户管理 | 配置 | 待确认 | 配置 | 套餐下拉有骨架和空状态（标准 5） |
| 字典、字典项 | 字典项表格配置 | 配置 | — | 双栏布局手写（标准 7） |
| 在线用户、系统日志、任务日志、短信日志 | 配置 | — | 配置（日志详情待确认） | 只读列表 |
| 配置页里的客户端、短信、存储列表 | 配置（`cardProps={false}`） | 待确认 | — | 在标签页里 |
| 定时任务 | 配置 | 手写 | 配置 | 触发类型联动、分片参数动态行、提交前检查（标准 2、3） |
| 通知公告 | 配置 | 手写 | 手写 | 富文本、用户选择器、定时发布、「存草稿」（标准 2、6） |
| 角色管理 | 配置 | 待确认 | — | 权限抽屉、分配用户抽屉手写（标准 2、7） |
| 租户套餐 | 配置 | 手写 | 待确认 | 菜单树勾选（标准 2） |
| 部门管理 | 配置（树） | 待确认 | — | 上级部门树选择，根部门有只读行 |
| 菜单管理 | 配置（树） | 手写 | — | 字段随菜单类型变化，图标选择器（标准 2、4） |
| 系统配置（站点、安全、登录、邮件） | — | 手写 | — | 标准 1 |
| 文件管理、仪表盘、个人中心 | — | 手写 | — | 标准 1 |
| 各类确认弹窗 | — | — | — | 继续用 `ConfirmDialog` / `DeleteConfirmDialog` |

---

## 六、迁移顺序

每一步结束都要能通过 `tsc --noEmit`、`oxlint`、`vitest run`，并且已迁移和未迁移的页面可以并存。行数是粗估。

| 步骤 | 内容 | 规模 |
|---|---|---|
| 1 | `typing.ts`、`provider.tsx`、`field/*`（只读渲染、`valueEnum`、列级 `request`）、`ProTable`（`request`、分页、`options`、关键字、`columnsState`、`toolBarRender`）、`TableDropdown`；放宽 `ColumnMeta.valueType`；给列转换、query key、`valueEnum` 映射写单元测试。应用管理只换表格，两个抽屉暂时不动，用来验证「手写抽屉 + `ProTable`」能共存 | 新增约 700 行，应用管理减约 150 行 |
| 2 | `BetaSchemaForm`（`Form`、`DrawerForm`、schema 推导、内置编辑控件、`formItemRender`、`dependencies`、`dependency`）、`ProDescriptions`；项目类型 `expiry`。应用管理换掉表单和详情抽屉，至此样板完整 | 新增约 500 行，应用管理再减约 300 行 |
| 3 | 搜索栏（`search` 列、`form.initialValues`、`search.transform`、`dateRange` / `dateTimeRange`）；项目类型 `deptTreeSelect`；`dictColumn`。迁移用户管理 | 新增约 250 行，用户管理减约 500 行 |
| 4 | 只读列表：在线用户、系统日志、任务日志、短信日志 | 每页减 100–200 行 |
| 5 | 表格走配置、表单视情况：租户管理、租户套餐、通知公告、角色管理、定时任务、字典项，以及配置页里的三个列表 | 每页半天左右，表格部分各减 100–250 行 |
| 6 | 树表：`expandable`、`pagination={false}`、`postData` 本地过滤。迁移部门、菜单的表格 | 新增约 120 行 |
| 7 | 更新 `docs/components.md`；列出已经没有引用的文件（第三节第 3 点），由你决定怎么处理 | 文档 |

步骤 1、2 做完后先停一下看效果，再决定 3 之后的范围。

---

## 七、待确认问题

每条都给了推荐的默认做法；没有回复就按推荐执行。

1. **用 3.x 的名字还是 2.x 的名字？** `master` 是 `formItemRender` 和 `search: false`；2.x 是 `renderFormItem` 和 `hideInSearch`。推荐：跟 `master`，不留别名。你指的是这个仓库，官方文档也已经按 3.x 写。
2. **列默认进不进搜索栏？** ProComponents 默认全进，逐列写 `search: false` 关掉。推荐：反过来，写 `search: true` 才进。本项目每个列表只有一两个筛选项。
3. **搜索栏的样子。** 推荐：保持现在的行内筛选（改了立即生效，没有按钮）。另一个选择是 ProComponents 默认的查询表单（带标签的栅格，加「查询 / 重置 / 展开」），那要新写一套组件，现有页面的外观也会变。
4. **`formItemProps` 里的属性名。** 推荐：用项目 `FormItem` 现有的名字（`description`、`hideDescriptionOnError`、`required`、`className`）。另一个选择是改成 antd 的 `extra`，但手写表单和配置表单会出现两套叫法。
5. **手写表单那几个名字要不要顺手改？** 你提过 `FormShell`、`CustomField` 别扭。按 ProComponents 的叫法，对应的是 `FormShell` → `ProForm`、`FormFooter` → `Submitter`、`CustomField` → `ProFormItem`。推荐：改，但放在步骤 2 之后单独一次纯改名提交，不和功能混在一起。
6. **新增和修改字段不同时怎么写？** 推荐：按 ProComponents 的做法，页面传不同的 `columns`（2.7）。另一个选择是加一个它没有的扩展 `hideInForm: (mode) => boolean`，写起来短一点，但偏离了原库。
7. **自定义 `valueType` 的类型怎么登记？** 推荐：声明合并（2.2）。ProComponents 的做法是第二个泛型 `ProColumns<T, 'a' | 'b'>`，每个用到的地方都要带上。
8. **要不要提供分页适配函数？** 每个列表的 `request` 里都有四行「`current` / `pageSize` 换成 `page` / `size`，`list` 换成 `data`」。推荐：前两个页面先手写，第三个页面确认形状完全一样后再抽成 `pageRequest(listApps, { sort })`。
9. **`onFinish` 收到 zod 的输出值。** 这会带来一个行为变化：规则里写了 `.trim()` 的字段，提交的是去掉首尾空格的值。推荐：接受。
10. **树表的搜索。** 推荐：保持现在的前端过滤（`onSearch` 返回 `false` 加 `postData`）。另一个选择是把关键字交给后端过滤，每次输入都会多一次请求。
11. **多选下拉要不要做成内置类型？** 现在只有用户的角色一处，样板里用 `formItemRender` 接了现有组件。推荐：出现第二处多选时，把 `UserRoleSelect` 提成通用控件，做成 `valueType: 'select'` + `fieldProps.mode: 'multiple'`。
12. **列显隐要不要记住？** ProComponents 的 `columnsState.persistenceKey` 可以存到 `localStorage`。推荐：起步不做，以后加不影响已有写法。

---

## 附：类型可行性

两个临时文件放在 `backups/pro-20261116/scratch/`（`backups/` 已被 git 忽略），用项目自带的 `tsc` 按现有 `tsconfig.json` 的严格配置编译通过。验证了下面几点：

| 验证点 | 结果 |
|---|---|
| `ProColumns<T>` 按 `valueType` 展开成联合类型，`fieldProps` 随 `valueType` 收窄；项目类型通过声明合并加入 | 通过；`fieldProps` 写错、`valueType` 不存在都会报错 |
| `dataIndex` 限定为 `keyof T` | 通过；写错报错 |
| 写了 `request` 必须同时给 `proFieldProps.proFieldKey` | 通过；漏写报错 |
| `as const satisfies readonly ProColumns<T>[]` 下，`render` 等回调的参数仍有类型 | 通过 |
| `InferFormValues` 从列推出表单值类型：有 `rules` 取 zod 输出，没有取记录类型，`hideInForm` / `index` / `option` 排除 | 通过 |
| 实体列展开后再追加操作列、按模式过滤出子集，仍然能当 `columns` 传 | 通过 |
| `useAppForm` 的 `defaultValues` 用 `Record<string, unknown>` 时，`<form.AppField name={运行时字符串}>` 可以编译，字段级 `validators.onDynamic` 接受 zod schema，表单级接受运行时拼出来的 `z.object(...)` | 通过 |
| `ProColumns` 能生成 `ColumnDef<DataTableFeatures, T>[]` | 通过；`meta.valueType` 受现有声明限制，需要按 2.3 放宽 |

没有验证的部分：

- 第四节的两段样板代码没有整体编译，因为 pro 层还不存在。
- 运行时行为都没有跑过，只读了类型和源码。包括：内置编辑控件直接渲染 `src/components/form/*` 的输入组件（依据是 `createFormHook` 的 `AppField` 会提供字段上下文）；字段的 `validators` 在渲染之间变化（依据是 `useField` 每次渲染调用 `fieldApi.update`）；详情抽屉关闭动画期间保留上一条记录。
- `Processing` 映射到 `info`、类型色不带圆点这两处是视觉判断，需要你看过效果再定。
