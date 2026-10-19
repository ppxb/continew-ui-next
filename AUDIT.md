# AUDIT.md — continew-ui-next 前端审计报告

审计对象：`continew-ui-next`（React 19 + TanStack Router 文件式路由的纯客户端 SPA + Tailwind v4 + shadcn/ui base-nova + Base UI 原语 + TanStack Query + TanStack Table v9 + react-hook-form + zod）
审计基线：v1 为 `ce44df6`；本版已按当前代码状态重写，已修复的问题直接删除、不再保留，见 §0 口径说明
代码规模：`src/**/*.ts(x)` 共 418 文件
本文所有路径均相对 `continew-ui-next/`。

---

## 0. 口径说明

本节记录判定口径，避免后续 review 重复提出同一问题。

### 0.1 规则口径澄清（需所有者确认后写进 AGENTS.md）

- **R2 的准确表述**：规则约束的是"不要修改 shadcn 上游原件"，**不是**"`ui/` 目录里只能有上游文件"。`ui/` 的定位是「registry 引入的根组件 + 项目自己的基础组件」，目前只有 `tree.tsx` / `tree-select.tsx`（项目基础组件）与 `striped-pattern.tsx`（其他 registry 引入的根组件）三个非上游文件，均为**有意安排**。
- **`ui/` 目录构成**：64 个文件 = 上游原件 + 3 个非上游文件。`tree.tsx` / `tree-select.tsx` 是项目自研的基础组件；`striped-pattern.tsx` 是其他 registry 引入的根组件，**已核实不在 base-nova registry**（`/r/styles/base-nova/striped-pattern.json` → 404，`components.json` 的 `registries` 为空 `{}`），`shadcn add` 不会覆盖它。项目自研但**不属于基础组件**的 `password-input.tsx`，以及业务共享的 `status-cell.tsx`，都在 `src/components/`。
- **复合控件 ARIA 例外**：`tree.tsx` 的 `role="tree"` / `role="treeitem"` / `aria-selected` / `aria-expanded` / `tabIndex` 是该控件可访问性的实现本身，**没有可替代的库原语**（Base UI 1.9.0 只有 accordion / context-menu / menu / menubar / navigation-menu，无 tree）。建议写明：自研复合控件为自身提供 ARIA 不受 R3 约束。
- **`aria-label` 在 `ui/` 内本就允许**：AGENTS.md 原文是 "Do not add `aria-label` outside the shadcn components in `src/components/ui/`"。`tree-select.tsx` 的 4 处 `aria-label` 已全部删除：「全部展开」「全部收起」改用 `Tooltip` 提供可见文案，「清空已选」「清空搜索」直接去掉。属体验取舍，不是规则强制。

### 0.2 统计口径

统计时 `aria-invalid` / `aria-label` 用带 `=` 的精确匹配（排除 `aria-invalid:` 这类变体类名）；`title=` 原始命中含 5 处组件同名 prop（`storage/config-storage.tsx:254,265`、`storage/group-panel.tsx:66`、`nav-main.tsx:202,215`），净计 8 处。

---

## 1. 审计说明

### 1.1 范围划分

| 区域 | 文件数 | 说明 |
|---|---|---|
| 业务代码 | 164 | `routes/(main)/(app)/**`、`routes/(main)/auth/**`、`lib/**`、`hooks/**`、`stores/**`、`navigation/**`、`components/**`（不含 `ui/**`） |
| 模板示例代码 | 190 | `routes/(main)/dashboard/**`、`chat/**`、`mail/**`（继承自 next-shadcn-admin-dashboard） |
| shadcn 原始组件 | 64 | `components/ui/**`（含 3 个非上游文件：2 个项目基础组件 + 1 个其他 registry 根组件，见 §0.1） |

### 1.2 硬规则口径（所有者定义）

- **R1** 除"以前项目的示例代码"外不使用 `font-mono`。示例代码 = 上表"模板示例代码"三目录；其余为业务代码。
- **R2** 不直接修改 shadcn 原始组件：`components/ui/**` 应保持上游原样，也不应把自研组件放进去。
- **R3** 除 shadcn 原始组件外，不设置 `title`、`aria-*`、`role` 等无障碍属性。
- **R4** 只使用 shadcn 组件或包装 shadcn 的高级组件，不自己实现、不直接使用原生 html 元素。

### 1.3 判定口径（避免误报）

以下情形**不计**为 R3/R4 违规，报告中已剔除：

- `table.FlexRender` 是 TanStack Table 的对象属性访问，不是原生 `<table>`（7 个表格文件共 14 处，若按正则统计会造成假阳性）。
- 布局用 `<div>`/`<span>`/`<section>`/`<svg>` 是 React 组合的必然结果。
- `<form>`：`components/ui/` 内没有表单元素级 shadcn 原语（无 `form.tsx`），react-hook-form 必须挂在原生 `<form>` 上（`login-form.tsx:73`、各 `*-form-drawer.tsx`）。
- `<colgroup>/<col>`、`<dl>/<dt>/<dd>` 属项目既有惯例（`dashboard/infrastructure/-components/project-environments.tsx:113` 同样用法）。
- 本地组件自身名为 `title` 的 **prop** 不是 DOM `title` 属性：`storage/config-storage.tsx:254,265`、`storage/group-panel.tsx:66` 是 `StorageGroupPanel` 的标题 prop；`nav-main.tsx:202,215` 传给 `CollapsedIconFallback` 的 `title` 已被解构并渲染为 `{title.slice(0, 1)}` 文本（**[已复核]** 不落 DOM，非 R3 违规）。
- `aria-invalid` 存在两方口径冲突，本报告单列（见 §3.3 末），不与其他 R3 项混算。

### 1.4 方法

1. 机械扫描：对全量 416 个文件统计 `font-mono` / `aria-*` / `title=` / 原生交互元素的分布；对 `components/ui/**` 做零引用与 git 溯源；对 `-components/**` 做孤儿文件与重复度（相同行占比）计算。
2. 分模块深审：按 7 个范围独立通读源码，产出带 `文件:行号` 与代码证据的发现。
3. 高危项复核：报告中标 **[已复核]** 的条目由本次审计直接回源码确认（含读 TanStack Query 源码确认 key 匹配语义）。

---

## 2. 结论摘要

### 2.1 规则违背量化（机械统计，业务代码）

| 项 | 业务代码 | 模板示例 | shadcn ui |
|---|---|---|---|
| 文件数 | 164 | 190 | 64 |
| `font-mono` | **0 ✅** | 7（豁免） | 2（上游） |
| `aria-invalid=` | 56 | 6 | 5（上游原语自身的属性声明，非调用方传入） |
| `aria-label=` | 33 | 92 | 8 |
| `role=` | 8 | 6 | 17（全部是上游原语内部的 ARIA，如 `breadcrumb`/`carousel`/`pagination`/`tree`） |
| DOM `title=` | 13 → **净 8** | 6 | 1（`sidebar.tsx` 上游的 `title="Toggle Sidebar"`） |
| 原生 `<button>` | 18 | 4 | 1（同上） |
| 原生 `<input>` | 2 | 0 | 0 |
| 原生 `<img>` | 6 | 0 | 0 |
| 原生 `<table>` | 0 | 0 | 0 |

> 统计口径见 §0.2。业务代码 `aria-label` 含 `components/password-input.tsx:17`（基础组件，计入业务代码）。

### 2.2 必修清单（高）

1. **正确性**：`role-user-drawer` 取消授权后成员列表不刷新（invalidate key 不匹配）。
2. **正确性**：4 个表单式配置面板（site/security/login/mail）没有错误态，接口失败时会把默认值整批写回。
3. **正确性**：`client/form-drawer` / `sms/form-drawer` 编辑态详情加载失败会渲染空表单，保存即用默认值覆盖原记录。
4. **正确性**：`dept-delete-dialog` 的「有子部门不可删」守卫读的是**搜索过滤后**的树，命中父节点时可删除含子部门的节点。
5. **性能**：`navigation/sidebar/menu-icons.ts:132,327` 与 `system/menu/-components/icon-picker.tsx:3` 都用运行时 `icons` 全量对象索引图标，破坏 tree-shaking（Lucide 官方明确说明动态索引 "is importing all icons during the build"）；叠加 `icon-picker.tsx:368-393` 的模块作用域扫描，打开菜单页即付出整库代价。
6. **R3/R4**：`config-site.tsx` 手写文件上传（原生 `input[type=file]` + `div[role=button]` + 手写键盘分支 + 5 处原生 `<img>`）；`components/app-shell/header/search-dialog.tsx:131-133` 手写 `<kbd>` 而 `ui/kbd.tsx` 已存在且别处在用。
7. **最佳实践**：`login-form.tsx:37-38` 硬编码预填超管账号口令 `admin/admin123`。
8. **最佳实践**：`lib/http.ts:220-221` 在 401 上连弹两条相同 toast（`sessionExpiredHandler` 一次 + `fail()` 一次），叠加 `query-client.ts:21` 的 `retry: 1` 会随重试重复弹；`components/app-shell/index.tsx:48-52` 先 `await ensureMenuLoaded()` 再 `requireAuth`，与它自己 44-46 行的注释相反，未登录深链会先发一次 `GET /auth/user/route` 并可能触发刷新/登出。

### 2.3 结构性问题（中，决定长期成本）

- **表格外壳复制 7 份**：`user/role/app/client/sms/dept/menu` 的 `*-table.tsx` 彼此相同行占比 **94.3%–96.2%**（实测），`getPageNumbers` 全仓 7–9 份、`preventPaginationNavigation` 8–9 份、`TableSkeletonRows` 7 份、分页页脚 5 份。
- **空状态手写 17+ 处**，而 `components/ui/empty.tsx` 全项目只被引用 1 次。
- **死代码约 5,000 行**：`ui/**` 14 文件 1,649 行 + `(legacy)` 25 文件约 3,300 行 + `components/can.tsx` 等。
- **`dept` 与 `menu` 是两个几乎逐行相同的模块**（`*-table.tsx` 95.8% 相同、`*-list.tsx` 65.7% 相同），且其中一个的 bug 在另一个里被正确修掉，说明复制已经产生分叉。

### 2.4 值得肯定

- R1 在业务代码中 **100% 合规**（`font-mono` 零命中）。
- `components/ui/**` 无 `'use client'` 残留（`1979956` 已清理干净）。
- 全项目业务代码 **无 `any`、无 `@ts-ignore`、无 lint 抑制注释**。
- TanStack Query/Table 的主干用法正确：key 工厂统一、`placeholderData: previous => previous` 保留旧页、服务端分页 `manualPagination + rowCount + pageCount + autoResetPageIndex:false`、稳定空数组、`enabled` 懒加载、列表三态（骨架/空/错误+重试）齐全。
- 列表页的越界回退、`getRowId`、`columnVisibility` 重置等细节处理到位。

---

## 3. 硬规则违背

### 3.1 R1 `font-mono`：合规

业务代码 164 文件 **0 命中**。7 处全部落在模板示例代码（`dashboard/(legacy)/finance-v1/-components/card-overview.tsx:60,67,73,77`、`dashboard/tasks/-components/columns.tsx:109`、`dashboard/ecommerce/-components/kpi-strip.tsx:256`、`dashboard/invoice/-components/invoice-paper.tsx:25`），按豁免口径不计。

> 注意：`storage/display.tsx:53` 的注释仍写 "monospaced"，但实现已无 `font-mono`（`MonoCell` 只剩 `block truncate`）——注释过期，见 §11。

### 3.2 R2 修改 shadcn 原始组件

#### (a) 上游文件的本地偏离

**结论：合规。** `components/ui/**` 已无未经所有者确认的上游改动。上表 4 处经确认的有意偏离记录在此，以免后续 review 重复提出：

| 文件 | 改动 | 提交 | 说明 |
|---|---|---|---|
| `components/ui/tooltip.tsx:38` | `rounded-md` → `rounded-2xl` | `910d205` | 有意：对齐 miyabi 样式 |
| `components/ui/tooltip.tsx:44` | `rounded-[2px]` → `rounded-xs` | `63b9273` | 语义等价：--radius-xs: .125rem = 2px |
| `components/ui/toast.tsx:23` | `z-50` → `z-[100]` | `10b8453` | 有意：z-index 层级 |
| `components/ui/button.tsx:6` | 基础变体追加 `cursor-pointer`（影响所有按钮） | `63b9273` | 有意。Tailwind v4 的 preflight 已不再给 <button> 设 cursor: pointer（产物 CSS 里除 utility 外无任何 cursor 声明），故这行确实恢复了手型光标，非冗余 |

> 合规例外，**不应还原**：`sidebar.tsx:342` 的 `overscroll-contain` 是 AGENTS.md 明文要求保留的；`1979956` 删除 19 个文件的 `'use client'` 与 `733dc87` 对 61 个文件的纯格式化均为 AGENTS.md 授权操作。

### 3.3 R3 无障碍属性

业务代码共 56 处 `aria-invalid` + 33 处 `aria-label` + 8 处 `role=` + 8 处 DOM `title=`。

**`aria-label`（33 处，集中在 app-shell 与权限树）**

| 文件 | 处数 |
|---|---|
| `components/app-shell/header/layout-controls.tsx:113,116,119,137,140,158,161,179,182,185,203,206` | 12 |
| `routes/(main)/(app)/system/role/-components/role-checkable-tree.tsx:98,118,135,152,163` | 5 |
| `components/app-shell/header/header-tabs.tsx:162,202` | 2 |
| `routes/(main)/(app)/system/role/-components/role-user-drawer.tsx:137,148` | 2 |
| `routes/(main)/(app)/system/menu/-components/icon-picker.tsx:495,531` | 2 |
| `components/app-shell/app-breadcrumb.tsx:217`、`components/simple-icon.tsx:17` | 各 1 |
| `routes/(main)/(app)/open/app/-components/app-list.tsx:210`、`system/config/-components/sms/toolbar.tsx:94`、`system/dept/-components/dept-columns.tsx:127`、`system/menu/-components/menu-columns.tsx:139`、`system/menu/-components/menu-list.tsx:260`、`system/role/-components/role-permission-drawer.tsx:123`、`auth/-components/captcha-image.tsx:22` | 各 1 |
| `components/password-input.tsx:17` | 1 |

改法统一：删掉 `aria-label`，改用可见文本、`<span className="sr-only">`（项目已有写法：`app-detail-drawer.tsx:172`、`user-detail-drawer.tsx:164-167`）或 `Tooltip`（`role-checkable-tree.tsx` 已在同文件用 Tooltip）。

**DOM `title=`（8 处）**

- `system/config/-components/storage/display.tsx:41,46,60` — 截断提示，`title={storage.name}` / `title={storage.code}` / `title={value}`
- `open/app/-components/app-display.tsx:73` — `title={accessKey}`
- `open/app/-components/app-form-drawer.tsx:267` — `title="清空并设为永久有效"`
- `system/config/-components/sms/columns.tsx:63` — `title="复制"`
- `system/dept/-components/dept-list.tsx:266` — `title="清空搜索"`
- `auth/-components/captcha-image.tsx:21` — `title="Click to refresh"`（同时还有 `aria-label`）

建议一律换 `Tooltip`（项目内 `client/columns.tsx:107-124` 是正确范例）。

**其他 R3 违规（基础层）**

- `components/simple-icon.tsx:17-18` — 自研 SVG 上同时写 `aria-label={title}` 与 `aria-hidden="false"`，而同文件 `:23` 的 `<title>` 已提供名称；`aria-hidden="false"` 本身也是默认值。两行都应删除。
- `components/app-shell/sidebar/support-card.tsx:27` — 向自研 `SimpleIcon` 传 `aria-hidden`。
- `components/app-shell/header/header-tabs.tsx:162` — 自研容器写 `aria-label="快捷标签导航"`（`<nav>` 本身已表达语义）。
- `components/app-shell/sidebar/nav-main.tsx:72,228` — 为「当前菜单项」自定义 `'aria-current'?: 'page' | undefined` 接口并手工下发；且只有折叠态下拉子项（228 行）带该属性、展开态子项（267 行）没有，同一子项两种呈现语义不一致。应删除该接口，依赖 `SidebarMenuSubButton` 的 `isActive`/`data-active`（`ui/sidebar.tsx:491,642` 已把 `active` 交给原语）。

**`role=`（8 处，最严重）**

- `system/config/-components/config-site.tsx:286,328` — `role={isEdit ? 'button' : undefined}` + `tabIndex` + 手写 `onKeyDown` 把 `<div>` 伪造成按钮，同时违反 R3 与 R4
- `system/menu/-components/icon-picker.tsx:492-497` — 在 shadcn `Button`（DialogTrigger）**内部**再放一个 `role="button"` 的 `<span>`，属嵌套交互元素（无效 HTML）

**`aria-invalid`（56 处）的口径冲突**

- 支持保留的一方：`components/ui/input.tsx:11`、`select`、`checkbox.tsx:10` 只声明 `aria-invalid:` 变体、自身从不设置该属性，调用方不传则错误态边框/ring 失效。
- 支持删除的一方：同一批 `Field` 上已经写了 `data-invalid={fieldState.invalid}`（`components/ui/field.tsx:49` 的 `data-[invalid=true]:text-destructive` 即由此驱动），两者并存属冗余；且 AGENTS.md 明确「application code passes none of its own（aria-label）」。

**建议**：由所有者拍一次口径。若从严（按 R3 字面），删掉全部 56 处 `aria-invalid` 并确认 `Field`/`FieldError` 的错误视觉仍在；若从宽，则在 AGENTS.md 里把它写成显式例外，避免后续 review 反复争议。涉及文件：`storage/form-drawer.tsx`(9)、`sms/form-drawer.tsx`(8)、`client/form-drawer.tsx`(10)、`user-form-drawer.tsx`(8)、`role-form-drawer.tsx`(5)、`dept-form-drawer.tsx`(3)、`menu-form-drawer.tsx`(3)、`user-reset-password-dialog.tsx`(2)、`app-form-drawer.tsx`(2)、`login-form.tsx`(4)、`profile/-components/password-form.tsx`(3)、`user-role-select.tsx`(1)、`client/auth-type-select.tsx`(1)。

### 3.4 R4 原生 html 元素 / 自实现

**原生 `<button>`（18 处 / 15 文件）**

| 位置 | 场景 | 建议 |
|---|---|---|
| `system/config/-components/config-site.tsx:425,438` | 预览模式切换（admin/user） | `ToggleGroup`（`components/ui/toggle-group.tsx` 已存在） |
| `system/config/-components/sms/columns.tsx:56` | 复制 Access Key（且自实现剪贴板、无 try/catch） | `Button variant="ghost" size="icon-xs"` + 复用 `client/columns.tsx:86-127` |
| `system/menu/-components/menu-form-drawer.tsx:227,248,269` | 菜单类型切换（3 个，各约 20 行重复 class） | `ToggleGroup` 或 `Button`，并用数组 map 生成 |
| `system/menu/-components/icon-picker.tsx:586` | 图标网格每一格 | `Button variant="ghost"` |
| `system/menu/-components/menu-columns.tsx:132`、`system/dept/-components/dept-columns.tsx:120` | 树展开/折叠 | `Button variant="ghost" size="icon-xs"` |
| `system/menu/-components/menu-list.tsx:259`（对应 `dept-list.tsx:259`） | 清空搜索 | 统一为 `Button variant="ghost" size="icon-xs"` |
| `system/role/-components/role-checkable-tree.tsx:95` | 清空搜索 | 同文件 114 行已在用 `Button` |
| `system/user/-components/user-form-drawer.tsx:470`、`user-role-select.tsx:77`、`user-assign-roles-dialog.tsx:177` | 「加载失败，重试」链接 | `Button variant="link" size="sm"`，并抽 `RetryHint` 组件 |
| `open/app/-components/app-form-drawer.tsx:260` | 清空失效时间 | `Button variant="ghost" size="icon-xs"` |
| `auth/-components/captcha-image.tsx:18` | 刷新验证码 | `Button variant="ghost" size="icon-sm"` |
| `components/app-shell/header/header-tabs.tsx:200`、`components/app-shell/app-breadcrumb.tsx:215` | 标签关闭 / 路径展开 | `Button` |

**原生 `<input>`（2 处）**：`system/config/-components/config-site.tsx:277,319` — `<input type="file" className="hidden">` 手写 Logo/Favicon 上传，配套 `div[role=button]` 与手写键盘处理（见 §3.3）。应封装为基于 `Button` 的上传组件，业务层不再出现原生 input。

**原生 `<img>`（6 处）**：`config-site.tsx:297,339,470,497,583`（5 处）、`auth/-components/captcha-image.tsx:28`。建议抽 `SiteLogo` / `CaptchaImage` 包装组件，原生 `img` 只出现在包装内部。

**自实现已有 shadcn 能力**

- `components/app-shell/header/search-dialog.tsx:131-133` — 手写 `<kbd>` 并自带一套样式，而 `components/ui/kbd.tsx` 已存在且正在被使用（`dashboard/users/-components/users.tsx:100`、`dashboard/infrastructure/-components/infrastructure-header.tsx:60`）。应改为 `import { Kbd } from '@/components/ui/kbd'`。
- `components/app-shell/sidebar/nav-main.tsx:86`、`components/app-shell/sidebar/support-card.tsx:17,21` — 外链用裸 `<a href target="_blank">`，而同文件/同层已用 TanStack `Link`（`nav-main.tsx:89`、`app-breadcrumb.tsx:166`）。应统一为 `Link href=… target="_blank"`。

- `system/config/-components/config-mail.tsx:291-310` — 手写密码可见性切换（`showPassword` state + 绝对定位 `Button` + `tabIndex={-1}`），项目已有 `PasswordInput`（`ui/password-input.tsx`，已被 3 处使用）。
- `auth/-components/captcha-image.tsx:29` — 手写 `<Loader2Icon className="animate-spin" />`，应用 `ui/spinner.tsx`（已在 35 处使用）。
- `routes/(main)/dashboard/**` — 4 处原生 `<button>`（`logistics/-components/shipment-list.tsx:52`、`patient-monitoring/-components/patient-card.tsx:21`、`chat/-components/chat-conversation-list.tsx:96`、`mail/-components/mail-list.tsx:37`）。

---

## 4. 正确性缺陷（审计额外发现）

> 这些不在所有者列出的 8 类里，但属"必须修"，单列。

1. **[高·已复核]** `system/role/-components/role-user-drawer.tsx:95,115,376` — 取消授权后成员列表不刷新。失效 key 与查询 key 结构不等：失效用 `roleKeys.users(roleId)` → `['system','role','users',id,undefined]`；列表查询用 `roleKeys.users(roleId, {page,size,description})` → `['system','role','users',id,{…}]`（同文件 70-74 行）。TanStack Query 的 `partialMatchKey` 逐元素比较 `typeof`，`undefined` 与 `object` 不匹配，故失效不命中。修法：新增 `usersRoot: (id) => [...roleKeys.all, 'users', id]` 并用它失效。
2. **[高]** `system/config/-components/config-site.tsx:71-74`、`config-security.tsx:58-61`、`config-login.tsx:43-46`、`config-mail.tsx:57-60` — option 查询只取 `data`/`isLoading`，无 `isError`。请求失败时 `options` 落为 `[]`、`isLoading` 为 false，面板照常渲染默认值，用户点「修改」→「保存」会把默认值整批写回后端（`config-security.tsx:88-96` 提交 `Object.entries(form)` 全量）。
3. **[中]** `system/config/-components/client/form-drawer.tsx:147-151,257`、`sms/form-drawer.tsx:206,230-232` — 编辑态详情查询失败无分支：`isEdit && isLoading` 为 false 时直接渲染 `DEFAULT_FORM_VALUES` 空表单，保存即以默认值覆盖原记录（`storage/form-drawer.tsx:736-737` 有 `isError` 分支，可作范例，但也缺重试按钮）。
4. **[中]** `system/dept/-components/dept-delete-dialog.tsx:27`（同 `menu-delete-dialog.tsx:27`）— `hasChildren` 读的是搜索过滤后的树。`filterDeptTree` 会把 `children` 替换为只含命中子节点的数组（`dept-list.tsx:51-56`），命中父节点而子节点未命中时 `children` 为空，守卫放行，导致删除含子部门的节点。
5. **[中]** `system/dept/-components/dept-list.tsx:180` — 导出只把关键词当 `description` 传后端，而列表过滤同时匹配 `name`（`dept-list.tsx:38-39`），导出结果 ≠ 当前筛选结果。
6. **[中]** `system/role/-components/role-permission-drawer.tsx:105,128-157` — 只处理 loading，权限树加载失败静默显示空树（`permTree.isError` 从未读取）。
7. **[中]** `auth/-components/login-form.tsx:37-38` — 硬编码预填 `username: 'admin', password: 'admin123'`。
8. **[低]** `system/dept/-components/dept-list.tsx:199-207`（同 `menu-list.tsx:198-206`）— 「展开全部/折叠全部」判定错误：任一节点展开即视为已全展开。
9. **[低]** `system/role/-components/role-checkable-tree.tsx:50-54` — 注释称「首次加载」，实际依赖 `[index.allKeys]`，`data` 身份变化即重置展开态，丢弃用户折叠操作。
10. **[低]** `open/app/-components/app-form-drawer.tsx:307` vs `:29-33` — 日历禁用放宽到「昨天」，而 zod 要求「必须是未来时间」，用户可选到必然报错的日期。
11. **[低]** `routes/-components/not-found.tsx:7` — `h-dvh` 同时用于根 `notFoundComponent` 与 `$.tsx:26` 屏内回退；在 app-shell（`h-12` header）内会多出约一屏滚动。

---

## 5. 重复实现

### 5.1 服务端分页表格外壳（最严重，7 份）

实测相同行占比（去空行、trim 后逐行比对）：

| A | B | 相同行占比 |
|---|---|---|
| `system/user/-components/user-table.tsx` | `open/app/-components/app-table.tsx` | **96.2%** |
| `system/dept/-components/dept-table.tsx` | `system/menu/-components/menu-table.tsx` | **95.8%** |
| `system/user/-components/user-table.tsx` | `system/role/-components/role-table.tsx` | **95.2%** |
| `system/config/-components/client/table.tsx` | `system/config/-components/sms/table.tsx` | **94.3%** |

复制的不只是外观，是整套逻辑：`PAGE_SIZE_OPTIONS`、`preventPaginationNavigation`、`PageItem` + `getPageNumbers`、`TableSkeletonRows`、分页页脚（每页/共 N 条/页码）、空态、错误重试。证据：`app-table.tsx:31` 与 `user-table.tsx:31` 的 `function getPageNumbers(currentPage: number, pageCount: number): PageItem[] {` 逐字相同。

全仓计数：

| 被复制的实现 | 份数 |
|---|---|
| `getPageNumbers` / `PageItem` | 7 份函数 + 2 份内联（`crm/-components/opportunities-section.tsx:82`、`ecommerce/-components/recent-orders.tsx:68`） |
| `preventPaginationNavigation` | 8–9 份 |
| `TableSkeletonRows` | 7 份 |
| `PAGE_SIZE_OPTIONS` `[10,20,30,40,50]` | 5 份 |
| 分页页脚组合 | 5 份 |
| `RowActions` | 7 份 |

**建议**：在 `src/components/data-table/` 建一个泛型外壳（`table` 由调用方传入 + 稳定空数组 + 三态 + 分页页脚），把 `getPageNumbers`/`preventPaginationNavigation`/`PAGE_SIZE_OPTIONS` 提到 `src/lib/`。7 个屏只保留列定义、工具栏与文案差异。这符合 AGENTS.md「组件被其他特性复用后应上移」。

### 5.2 工具栏（8 份）

`user-toolbar`(100) / `role-toolbar`(85) / `app-toolbar`(113) / `client/toolbar`(90) / `sms/toolbar`(93) / `storage/toolbar`(65) / `dept-toolbar`(156) / `menu-toolbar`(142)。`user-toolbar` ↔ `role-toolbar` 相同行占比 78%；隐藏列下拉与全屏按钮在 8 份里逐字相同（`<DropdownMenuLabel>显示的列</DropdownMenuLabel>` 在 `app-toolbar.tsx:86` 与 `user-toolbar.tsx:78` 相同）。建议抽 `DataTableToolbar`，用插槽区分差异。

### 5.3 删除对话框（6 份）

`user/role/app/client/sms/storage` 六个 `-delete-dialog` 结构一致（AlertDialog + Media + Spinner + toast + invalidate），且 loading 策略有三种写法：`useState`+try/catch（sms/storage/user/role/dept/menu）、`useMutation`（client）。建议抽 `ConfirmDeleteDialog({ entityLabel, onConfirm })`。

### 5.4 表单抽屉

- `app-form-drawer`(356) / `user-form-drawer`(513) / `role-form-drawer`(332) / `menu-form-drawer`(590) / `dept-form-drawer`(316) / `client/form-drawer`(595) / `sms/form-drawer`(488) / `storage/form-drawer`(689)：骨架组件（`UserFormSkeleton`/`ClientFormSkeleton`/`StorageFormSkeleton`/`AppFormSkeleton`）各写一份，且多为逐字段硬编码。
- `storage/form-drawer.tsx:54,299-302` 与 `sms/form-drawer.tsx:27,170-173`：条件必填都在 `onSubmit` 里 `setError` 手补，而 schema 里该字段是可选项（同文件的 `superRefine` 已有更合适的模式）。
- `menu-form-drawer.tsx:412-430,472-508,511-528`：「权限标识」写两遍、「重定向地址」写两遍。

### 5.5 复制到剪贴板（5 份）

`app-display.tsx:14`、`app-detail-drawer.tsx:16`、`app-secret-dialog.tsx:28`、`system/user/-components/user-detail-drawer.tsx:16`、`system/config/-components/client/detail-drawer.tsx:22` 各自声明 `COPIED_FEEDBACK_MS = 1500` 并实现一套 copied state + toast + 定时器；`sms/columns.tsx:56-66` 是第 6 份且无 try/catch。`app-detail-drawer.tsx:27-57` 与 `:59-90`（`IdField`/`AccessKeyField`）除 toast 文案外完全相同。建议抽 `CopyField`/`useCopyToClipboard`。

### 5.6 列表页状态逻辑

`app-list.tsx:58-65`（300ms 防抖）、`:88-93`（页码越界回退）、`:222-226`（全屏占位 + ref 容器）与 `user-list.tsx:75-82,123-128,288-292` 逐字相同；`dept-list.tsx` 与 `menu-list.tsx` 的递归过滤、防抖 effect、展开态判断同样逐字相同。建议抽 `useDebouncedKeyword` / `usePageBoundsCorrection` / `TableFullscreenContainer`。

### 5.7 `dept` 与 `menu` 是双胞胎模块

| A | B | 相同行占比 |
|---|---|---|
| `dept-table.tsx` | `menu-table.tsx` | 95.8% |
| `dept-parent-select.tsx` | `menu-parent-select.tsx` | 67.7% |
| `dept-list.tsx` | `menu-list.tsx` | 65.7% |

此外 `collectDescendantIds`（防环收集）、`selectedValue`/`handleChange`、`COLUMN_LABEL_MAP` 与列 `header` 字符串、`RowActions` 都各写两份。分叉已经产生：`menu-form-drawer.tsx:170` 只失效 `menuKeys.trees()` 而 `dept-form-drawer.tsx:150` 失效 `deptKeys.all`。

### 5.8 空状态：手写 17+ 处 vs `ui/empty.tsx` 只用 1 次

- 6 个表格写 `暂无数据`（`user-table.tsx:141`、`app-table.tsx:141`、`client/table.tsx:140`、`role-table.tsx:139`、`dept-table.tsx:93`、`menu-table.tsx:93`），`sms/table.tsx:138` 写 `暂无短信配置`（第 7 处，文案还不一致）。
- `storage/group-panel.tsx:158`（`暂无{title}配置`）、`user-role-select.tsx:82`、`client/auth-type-select.tsx:51`、`role-user-drawer.tsx:318`、`config/route.tsx:113`。
- 模板示例里 7 处 `No results.` + 10 处 coming-soon 块。
- 而 `components/ui/empty.tsx`（86 行）全项目只被 `dashboard/file-manager/-components/folders-section.tsx:12` 引用一次。

### 5.9 config 面板内部

- 「选项数组 → label map」循环写 5 遍（`client/config-client.tsx:112-142` 四段 + `sms/config-sms.tsx:96-102`）。
- 4 个表单式面板的「option → form 同步」与 `handleResetForm` 各写两遍（`config-site.tsx:86-97` vs `:162-171`、`config-security.tsx:71-84` vs `:121-132`、`config-login.tsx:56-62` vs `:99-103`、`config-mail.tsx:70-82` vs `:119-129`）。
- `client/detail-drawer.tsx:119-165` 与 `client/columns.tsx:255-322` 把同一批字段格式化写两遍。
- `sms/config-sms.tsx:106-118`、`storage/config-storage.tsx:94-95`：`queryKey` 与 `queryFn` 各写一遍同样的参数对象。
- 列工厂签名不一致：`createClientColumns`(9 个位置参数) / `createSmsColumns`(6 个) vs `createLocalStorageColumns(options)` 对象写法。

### 5.10 模板示例代码

- `formatInvoiceCurrency` 两份完全相同（`invoice-paper.tsx:135-139`、`invoice-items.tsx:153-157`）。
- KPI 卡整段手写重复（`analytics-kpi-strip.tsx:10-138` 5 张、`ecommerce/kpi-strip.tsx:92-198` 6 张、`crm/kpi-cards.tsx`）。
- 同一状态色 class 串硬编码 20+ 处（`bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300`）。
- 日期格式化各写一份（`mail-list.tsx:105`、`recent-orders-table/columns.tsx:22`、`recent-notes-card.tsx:9`、`profile-record.ts:18`、`kpi-strip.tsx:62,70,82`、`store-traffic.tsx:138`），而 `lib/utils.ts:15` 已有 `formatCurrency`。
- `chat/-components/use-chat.ts:14-25` 与 `mail/-components/use-mail.ts:14-25` 26 行几乎逐字相同。

### 5.11 基础层（lib / hooks / stores / components）

- `components/app-shell/app-breadcrumb.tsx:27-49` 与 `components/app-shell/header/header-tabs.tsx:19-41` — 21 条 `STATIC_ROUTE_TITLES` 完全重复（同键同值），应抽到 `src/navigation/`。
- `hooks/use-lg.ts:5-19` 与 `hooks/use-mobile.ts:5-19` — 同一套 `matchMedia` + 监听 + 初值实现复制两遍，只差断点与比较方向。应合并为 `useMediaQuery(query)`，两个具名 hook 只提供 query 字符串。
- `stores/tabs.ts:103-107` 与 `:109-111` — `closeAllTabs` 与 `resetTabs` 函数体完全相同，保留一个即可（`use-logout.ts:21,35` 用的是 `resetTabs`）。
- `components/app-shell/header/theme-switcher.tsx:8` 与 `lib/preferences/theme.ts:7` — 主题模式清单写两遍（`THEME_CYCLE` vs `THEME_MODE_VALUES`），前者应复用后者。
- `components/app-shell/header/layout-controls.tsx:33-46` 与 `:83-95` — 主题预设的「色点 + 文案」JSX 构建两遍，应抽 `renderPresetLabel(preset)`。
- `components/app-shell/index.tsx:57` 与 `app-breadcrumb.tsx:129` — `useBreadcrumbTrail()` 在同一次 shell 渲染里被调用两次（前者只为取 `.length > 0`），`findMenuTrail` 遍历菜单树两遍且 `useMemo` 不共享。

---

## 6. 低效实现

- **[中]** `system/config/-components/sms/config-sms.tsx:164`、`storage/config-storage.tsx:144` — `useCallback` 依赖整个 `useMutation` 返回对象（每次渲染都是新引用），导致回调与 `columns` 的 `useMemo` 永不命中，列定义每帧重建。对照 `client/config-client.tsx:174-191` 用 `[]` 是正确的。修法：依赖 `mutation.mutate`（稳定）或放 ref。
- **[中]** `system/menu/-components/icon-picker.tsx:368-393` — 在**模块作用域**对整库图标做 O(分类 × 图标) 扫描并构造 1500+ 对象与 Set；`menu-form-drawer` 静态导入该模块，因此只要打开菜单页就付出代价，即使从未打开图标弹窗。
- **[中]** `system/menu/-components/icon-picker.tsx:447-454,563,611-623` — 同一分页能力做两套（滚动触底自动加载 + 「加载更多」按钮），且 `handleScroll` 每次渲染重建、未节流。
- **[中]** `system/config/-components/config-site.tsx:141-145,155-159` — 图片经 `readAsDataURL` 转 base64 直接写进 option 值（`:137` 只校验 MIME，无大小上限），而 `lib/api/common.ts:22-28` 已有 `uploadFile()` 返回 `{ url }`。
- **[中]** `system/config/route.tsx:93-103` — 两个 `useMemo` 实际每帧重算：`usePermission()` 每次渲染返回新的 `hasPermission` 闭包，依赖项恒变。
- **[低]** `system/menu/-components/menu-form-drawer.tsx:221,229,230,241` — 类型切换按钮对禁用态三重防护（`disabled` + `pointer-events-none` + `onClick` 内判断）。
- **[低]** 模板示例：`analytics-drivers-coverage-triage.tsx:6-25`（静态数组写在组件体内）、`analytics-drivers-forecast-target.tsx:45-47`（`const chartData = CHART_DATA` 别名 + 每帧 `Math.min/Math.max`）、`store-traffic.tsx:147-153`（`formatTrafficTick` 定义在组件内）、`users-columns.tsx:46-57`（10 条超长 class 数组在 `getAvatarTone()` 内构造且逐行调用）。

---

## 7. 死代码

### 7.1 `components/ui/**`：14 文件 / 约 1,649 行（占该目录 21.7%）

零外部引用（已二次校验，`toggle.tsx` 因被 `toggle-group.tsx:7` 引用而**不算**死代码）：

`questionnaire.tsx`(282)、`combobox.tsx`(259)、`menubar.tsx`(256)、`carousel.tsx`(210)、`attachment.tsx`(185)、`navigation-menu.tsx`(143)、`input-otp.tsx`(80)、`accordion.tsx`(59)、`native-select.tsx`(47)、`hover-card.tsx`(43)、`slider.tsx`(40)、`radio-group.tsx`(26)、`aspect-ratio.tsx`(18)、`direction.tsx`(1)。

> 风险提示：删除上游文件与 R2「保持上游原样」存在张力，且 `shadcn add` 会重新拉回。若更看重"可 diff 上游"，替代方案是不删、仅标注未使用。

### 7.2 无引用的路由（约 25 文件 / 3,300 行）

`routes/(main)/dashboard/(legacy)/`（analytics-v1 / crm-v1 / default-v1 / finance-v1）全仓无任何菜单项、`to=` 或链接引用（侧边栏由 `GET /auth/user/route` 驱动），只被 `routeTree.gen.ts` 自动登记。**[已复核]** `(legacy)/analytics-v1/route.tsx` 与 `dashboard/index.tsx` 渲染完全相同的组件树（`AnalyticsOverview` + `DriversForecastTarget` + `DriversCoverageTriage` + `ActionsManagerQueue` + `ActionsRiskLedger`），是逐行重复的同一页面。

同类：`dashboard/coming-soon/route.tsx:7-13` 与 `dashboard/$.tsx:7-13` 是近乎相同的「未开发」占位页，且 `coming-soon` 只出现在硬编码标签表（`app-shell/app-breadcrumb.tsx:48`、`header-tabs.tsx:40`），不在后端菜单中。

### 7.3 无引用的 API / 工具导出（`lib/api/**`）

| 符号 | 位置 | 说明 |
|---|---|---|
| `uploadFile` | `lib/api/common.ts:22` | 上传接口定义了但没人用，而 `config-site.tsx` 用 base64 手写上传（§6） |
| `listSiteOptionDict` | `lib/api/common.ts:31` | 无引用 |
| `deleteApps` | `lib/api/app.ts:83` | 无引用（弹窗用单数 `deleteApp`） |
| `deleteRole` | `lib/api/role.ts:160` | 无引用（弹窗用 `deleteRoles`） |
| `listRolesPage` | `lib/api/role.ts:137` | 别名 `= listRoles`，无引用 |
| `MENU_TYPE_MAP`、`MENU_TYPE_OPTIONS` | `lib/api/menu.ts:5,11` | 无引用（菜单表单把文案硬编码了一遍） |
| `deleteClientCookie` | `lib/cookie.ts:20` | 无引用 |
| `getLocalStorageValue` | `lib/local-storage.ts:11` | 无引用（只有写侧被 `preferences-storage.ts:20` 使用） |

> 以下**不是**死代码，仅 `export` 冗余（只在本文件内使用）：`deleteDepts`(dept.ts:71，被同文件 `deleteDept` 调用)、`deleteMenus`(menu.ts:88)、`MENU_QUERY_KEY`/`menuQueryOptions`(hooks/use-menu.ts:14,16)、`isPublicPath`(lib/auth-guard.ts:8)、`DEFAULT_STALE_TIME_MS`(lib/query-client.ts:4)、`MAX_HEADER_TABS`/`DEFAULT_PINNED_TAB`(stores/tabs.ts:12,14)、`MENU_ICONS`(navigation/sidebar/menu-icons.ts:141)。

### 7.4 无引用的组件与导出

- `components/can.tsx`（26 行）— 全项目零引用，而 4 个权限布尔值在 `dept-list`/`menu-list` 手工穿透到 columns/toolbar 两层（`dept-columns.tsx:93-98`、`dept-toolbar.tsx:36-37`）。要么用起来，要么删掉。
- `system/config/-components/storage/display.tsx:17-19` `storageTypeDescription` — 零引用（注释声称"shown under the drawer title"但无人调用）。
- `open/app/-components/app-display.tsx:16-18` `appLabel` — 零引用。
- `dashboard/kanban/-components/utils.ts:8,13` `findColumnId`/`findTask` — 零引用。
- `routes/(main)/(app)/$.tsx:38-39` — 为占位页计算源码仓库路径，且在**生产**也渲染（`:39,49`），与 `root-error.tsx:13` 的 `import.meta.env.DEV` 门控不一致。
- `auth/-components/social-auth/google-button.tsx:9` + `auth/login/route.tsx:28` — Google 登录按钮无任何 `onClick`/OAuth 逻辑；`login/route.tsx:38-41` 的语言切换是纯静态文本。

### 7.5 不可达分支 / 恒 false 条件

| 位置 | 条件 | 说明 |
|---|---|---|
| `dept-list.tsx:231`、`menu-list.tsx:230` | `isStale={query.isPlaceholderData}` | 这两个查询未配 `placeholderData`，恒 false，`*-table.tsx:49` 的降透明度分支永不生效（user/role/app/client/sms 都配了） |
| `user-table.tsx:118`、`app-table.tsx:118`、`role-table.tsx:116`、`dept-table.tsx:70`、`menu-table.tsx:70` | `row.getIsSelected()` | 这些表无选择列、无 `rowSelection` state，恒 false |
| `use-user-detail.ts:36-39`、`use-role-detail.ts:26-28`、`use-app-detail.ts:26-28`、`app-secret-dialog.tsx:96-100` | `if (id === null) throw` | 同 hook 的 `enabled: enabled && id !== null` 已拦截，不可达 |
| `app-delete-dialog.tsx:36,69-71`、`app-reset-secret-dialog.tsx:36,69-71` | `if (app === null) return` / `app === null ?` | 弹窗只在选中记录后打开，不可达 |
| `role-user-drawer.tsx:76`、`role-user-add-dialog.tsx:44` | `if (!roleId) return Promise.resolve(…)` | `enabled: open && roleId !== null` 已拦截 |
| `role-permission-drawer.tsx:85` | `if (!roleId) return` | 同上，且 `!roleId` 会把 `id === 0` 误判为缺失 |
| `role-delete-dialog.tsx:26,46` | `onSuccess?.()` | 唯一调用点 `role-list.tsx:194` 从不传该 prop |
| `user-display.tsx:15`、`role-columns.tsx:22` | `?? '未知'` | `Record<number,string>`/`Record<DataScope,string>` 已穷尽，且未开 `noUncheckedIndexedAccess` |
| `user-table.tsx:89` | `Math.max(table.getPageCount(), 1)` | 调用方已保证 ≥1 |
| `lib/preferences/preferences-storage.ts:12-13,19-21` | `'none'` / `'localStorage'` 分支 | 六个偏好全部声明 `persistence: 'client-cookie'`（`preferences-config.ts:56,63,70,77,84,91`），两分支不可达 |
| `stores/tabs.ts:72-75` | `// All were somehow unclosable…` | 唯一调用点 `header-tabs.tsx:118` 保证非 `/dashboard` 一定 `closable: true`，且重复路径已在 `:43-55` 拦截 |

### 7.6 无调用方传入的 props（过度设计的配置面）

`role-checkable-tree.tsx:19-25,40-41`（5 个：`showSearch`、`treeContainerClassName` 等）、`dept-tree-select.tsx:21,61`（`showPathInTrigger`）、`use-app-detail.ts:13,21,33`（`alwaysRefetch`，且 `staleTime: alwaysRefetch ? 0 : undefined` 两分支等价）、`captcha-image.tsx:6,13`（`isEnabled`，调用方已条件渲染）。

### 7.7 query key 工厂与 store 中的死键（已逐个 grep 核实）

- `lib/query-keys.ts:25` `deptKeys.tree()`、`:33` `menuKeys.tree()`、`:34` `menuKeys.dicts()`、`:35` `menuKeys.dict()` — 从未被调用（外部只用 `trees()` / `detail()` / `all`；`dict()` 本身还是 `[...dicts()]` 的冗余包装）。
- `stores/auth/auth-store.ts:23` `roles` — 只写不读（`usePermission` 只暴露 `permissions`）。
- `stores/auth/auth-store.ts:24,38,62,73` `isLoadingUser` — 被写 3 次、从不被读，没有任何组件消费加载态。
- `hooks/use-permission.ts:27-28` `hasAnyPermission` / `hasAllPermissions` — 被返回但从未被解构使用。
- 仅同文件自用却导出的符号（去掉 `export` 即可）：`stores/tabs.ts:12,14`（`MAX_HEADER_TABS`、`DEFAULT_PINNED_TAB`）、`navigation/sidebar/menu-icons.ts:141`（`MENU_ICONS`）、`hooks/use-captcha.ts:5`（`CaptchaState`）、`components/app-shell/app-breadcrumb.tsx:20`（`BreadcrumbItemData`）、`components/app-shell/index.tsx:35`（`ShellPreferences`）、`lib/query-client.ts:4`（`DEFAULT_STALE_TIME_MS`）。

---

## 8. 冗余代码

- **[中]** `system/role/-components/role-user-drawer.tsx:343` — `<span>` 直接作为 `<ul>`（`PaginationContent`）的子元素，HTML 语义非法（`components/ui/pagination.tsx:20` 渲染 `<ul>`）。应包 `PaginationItem`。
- **[低]** `system/user/-components/use-fullscreen-transition.ts`（1 行）— 纯转发模块 `export { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'`，而 `user-list.tsx:18` 通过 `'./use-fullscreen-transition'` 导入、其余 7 处直接导入 `@/hooks/...`。删掉该文件并统一导入路径。
- **[低]** `system/config/-components/client/columns.tsx:23-67` — 8 份常量里 4 对是同一数据的两种写法（`AUTH_TYPE_OPTIONS`/`AUTH_TYPE_MAP`、`REFRESH_TOKEN_MODE_OPTIONS`/`_MAP`、`REPLACED_RANGE_PRESETS`/`_MAP`、`LOGOUT_MODE_PRESETS`/`_MAP`）。可由 OPTIONS 派生 MAP。
- **[低]** `system/dept/-components/dept-toolbar.tsx:46-56` — `COLUMN_LABEL_MAP` 的 10 个标签与 `dept-columns.tsx:109-186` 的 `header` 完全重复；`menu-toolbar.tsx:124-126` 已用 `column.columnDef.header` 兜底，证明该映射多余。
- **[低]** `system/dept/-components/dept-columns.tsx:27`（同 `menu-columns.tsx:43`）— `dark:text-destructive` 与基础 `text-destructive` 同值，深色覆盖无效。
- **[低]** `system/dept/-components/dept-columns.tsx:139` — 三元两分支结果相同（`depth === 0 ? 'font-medium text-foreground' : 'text-foreground'`）。
- **[低]** `open/app/-components/app-reset-secret-dialog.tsx:81` — `dark:bg-amber-600 dark:hover:bg-amber-700` 与亮色值相同；`:77-81` 的 `variant="destructive"` 被 amber 类完全覆盖。
- **[低]** `open/app/-components/app-toolbar.tsx:49,61,71,79,114` — `inline-flex items-center justify-center` 与 `components/ui/button.tsx:6` 的基础类重复；`:51,64,74,82,117` 的 `<span className="leading-none">` 包裹纯文本无作用。
- **[低]** `auth/-components/login-form.tsx:45-48` — 验证码必填在 schema 里是 `z.string().optional()`（`:23`），却在提交时手工 `setError`，同一规则分裂两处。
- **[低]** `open/app/-components/app-form-drawer.tsx:31,155` 与 `app-display.tsx:36` — `expireTime.replace(/-/g, '/')` 日期解析重复 3 次。
- **[低]** `open/app/-components/app-form-drawer.tsx:31`、`auth/-components/captcha-image.tsx:28`、`dashboard/invoice/-components/invoice-paper.tsx:25` — `bg-neutral-50 ... text-neutral-950`（invoice-paper）在暗色主题下不可读。
- **[低]** `system/config/-components/sms/form-drawer.tsx:314-322,369-379,389-400` — `data-invalid` 在同类字段上时有时无（`secretKey`/`weight`/`retryInterval` 的 `Field` 缺 `data-invalid`，无效态样式不生效）。
- **[低]** `system/role/-components/role-form-drawer.tsx:92-100` 与 `107-115` — 同一份 `defaultValues` 字面量写两遍（`user-form-drawer.tsx:97` 的 `EMPTY_FORM` 是正确写法）。
- **[低]** `system/config/-components/config-security.tsx:245,278,310,343,375,407` — `pr-10 transition-none disabled:bg-transparent dark:disabled:bg-transparent` 与 5 处单位后缀 span 重复（`storage/form-drawer.tsx:46` 的 `MB_SUFFIX_CLASS` 是更好写法）。
- **[中]** `lib/api/user.ts:41-44` — 重复定义了与 `lib/api/types.ts:16-19` 完全相同的 `PageResp<T>`，应改为 `import type { PageResp } from './types'`。
- **[低]** `lib/preferences/layout.ts:2-31` 与 `lib/preferences/theme.ts:1-5` — 选项里的 `label` 从未被读取，UI 把同样文案硬编码了一遍（`{ label: 'Floating', value: 'floating' }` vs `layout-controls.tsx:185-187` 的 `Floating`）。要么让 UI 消费 `*_OPTIONS.label`，要么删掉 `label` 只留 `VALUES`。
- **[低]** `lib/api/app.ts:46` — `export interface AppDetailResp extends AppResp {}` 空扩展，应为 `export type AppDetailResp = AppResp`。
- **[低]** `lib/api/option.ts:13` — `category?: 'SITE' | 'PASSWORD' | 'MAIL' | 'LOGIN' | string` 中字面量联合被 `| string` 吞掉，等于没有约束。
- **[低]** `lib/api/option.ts:14,31` — `code?: string[]` 从未被任何调用方传入（四处调用都只传 `{ category }`），而 `http.ts:112` 会用 `String(value)` 把数组拼成 `a,b`，第 31 行的 `as Record<…>` 断言正好掩盖了这一点。
- **[低]** `stores/tabs.ts:4-10,58` — `TabItem.id` 恒等于 `path`（`id: path`），是重复字段，`header-tabs.tsx:172` 的 `key` 直接用 `path` 即可。
- **[低]** `lib/utils.ts:8` — `str.trim().split(/\s+/).filter(Boolean)` 里的 `.filter(Boolean)` 永远不会过滤掉任何元素。
- **[低]** `hooks/use-menu.ts:46,48` — 连续两次调用 `queryClient.getQueryData(MENU_QUERY_KEY)`，应用局部变量复用第一次结果。

---

## 9. 过度设计

- **[中]** `system/menu/-components/icon-picker.tsx:25-393` — 为图标选择器维护 10 个分类 × 关键词表（约 327 行配置），再用 `kebab.includes(kw)` 子串启发式给 1500+ 图标打标签并统计数量。建议只保留「全部 + 搜索 + 常用白名单」，或复用后端图标字典。
- **[中]** `system/role/-components/role-checkable-tree.tsx:76,179` — 通过嗅探 `className?.includes('flex-1')` 推断布局模式（`isFlex1`）。应改为显式 prop（如 `fill?: boolean`）。
- **[中]** `system/config/-components/config-site.tsx:419-617` — 约 200 行预览 mockup 内联在配置面板里（全文件 638 行）。应抽 `site-preview.tsx`（AGENTS.md：「Break each new page into focused components」）。
- **[低]** 骨架组件逐字段硬编码：`app-detail-drawer.tsx:92-137`（10 组固定宽度 Skeleton）、`app-form-drawer.tsx:55-82`、`UserFormSkeleton`、`ClientFormSkeleton`。字段一改即漂移，应按字段数组/schema 生成。
- **[低]** `system/config/-components/sms/table.tsx:56-67`、`client/table.tsx:56-69` — 骨架宽度用 5 层嵌套三元，应改为宽度查表数组。
- **[低]** `routes/(main)/dashboard/patient-monitoring/-components/use-realtime-tick.ts:5-6,10-11` — 两个 tick 间隔常量同为 `100`，却建两个独立 ticker。
- **[低]** `hooks/use-fullscreen-transition.ts`（148 行）— 用 `Object.assign(el.style, {position,top,left,width,height,zIndex,overflow,transition,paddingTop,paddingBottom,opacity})` 直接写 DOM 内联样式、`void el.offsetHeight` 强制重排、`setTimeout` 定时恢复。CSS 类驱动的展开/收起可以更短，也不会与"ref 必须常驻"耦合出同类 bug。
- **[中]** `lib/preferences/preferences-config.ts:32-50` — `definePreference` 与 `defineBootPreference` 两个泛型工厂函数体都只是 `return definition`，只为一个编译期约束复制了整套签名，而该约束并不成立：注释称布局偏好不能进 localStorage，但 `theme_mode`/`theme_preset`/`content_layout`/`navbar_style`（`:53-79`）用的是宽松版 `definePreference`，六项最终都是 `client-cookie`。应只保留一个 `definePreference`，把"引导期可读"做成显式布尔字段。
- **[低]** `lib/api/dept.ts:45-53` — 三个重载 + `'queryKey' in query` 鸭子类型，只为让该函数能直接当 `queryFn`；同仓库 `dept-list.tsx:109` 已经用 `queryFn: () => getDeptTree()` 的写法，可直接删掉重载与探测。

---

## 10. 过度防御

- **[低]** `system/config/-components/sms/form-drawer.tsx:180` — `secretKey: values.secretKey.trim() || undefined!`，非空断言既无意义又绕过 strict 类型。
- **[低]** `system/user/-components/user-assign-roles-dialog.tsx:190` — `user={user!}`，`UserAssignRolesForm` 声明的是必填 `user: UserResp`。
- **[低]** `system/config/-components/client/columns.tsx:129-134`、`client/detail-drawer.tsx:80-82`、`client/form-drawer.tsx:130-132`、`client/auth-type-select.tsx:11,22,39,60` — 一批默认值/可选 prop 永远不会被触发（唯一调用点总是传全量，`disabled` 从不传），如 `const map = authTypeMap ?? AUTH_TYPE_MAP`。
- **[低]** `system/dept/-components/dept-delete-dialog.tsx:46-49` — `handleDelete` 的守卫与渲染守卫 `{!cannotDelete && …}`（`:80`）重复，且 `!dept?.id` 不可达。
- **[低]** `system/dept/-components/dept-form-drawer.tsx:26` — `z.union([z.string(), z.number()])` 已排除 `null/undefined`，`refine` 仍重复校验。
- **[低]** `system/role/-components/role-checkable-tree.tsx:50-54` — 注释「on first load」与实际「每次 data 变化都重置」不符。
- **[低]** 模板示例：`dashboard/-components/analytics-overview.tsx:96-99`（对 DateRangePicker 已约束的范围兜底）、`invoice-paper.tsx:18` 与 `:136`（对同一字段重复 `Number.isFinite`）、`mail/-components/mail.tsx:21-31` 与 `invoice/-components/print-invoice.tsx:9-15`（纯客户端 SPA 却保留 `isMounted` SSR 守卫，AGENTS.md 明确 no SSR guard is needed）。
- **[低]** `lib/utils.ts:2` — 参数已声明 `str: string`，仍做 `typeof str !== 'string'` 运行时判断。
- **[低]** `stores/auth/auth-provider.tsx:18,30-34` — `passwordExpiryNotified` 是永不重置的 `useRef`，因此"密码过期"提示与跳转在整个 SPA 生命周期内最多触发一次：同页面内换账号登录且新账号密码也过期时不会再有提示/跳转。应在 `clearLocalSession`/登录成功时复位（或按用户 id 记录）。

---

## 11. 不满足项目最佳实践

- **[高]** `auth/-components/login-form.tsx:37-38` — 硬编码预填超管账号口令（`admin`/`admin123`）。
- **[中]** 错误态缺失（AGENTS.md 第 12 条要求处理 error）：§4 第 2、3、6 条。
- **[中]** 表单校验方式不统一：4 个表单式配置面板用 `useState` + `toast` 手写校验，8 个抽屉用 `react-hook-form + zod`；且校验覆盖不一致（`PASSWORD_ERROR_LOCK_COUNT` 0-10、`PASSWORD_ERROR_LOCK_MINUTES` 1-1440 在 UI 写了范围却未校验，`config-security.tsx:139-153`）。
- **[中]** `system/config/-components/client/delete-dialog.tsx:51` — 手写 destructive 样式而不用 `variant="destructive"`；`:40` 删除进行中仍可 Esc/点遮罩关闭（另 5 个删除对话框都做了 `isDeleting` 守卫）。
- **[低]** `system/role/-components/role-list.tsx:136` — `isRefreshing={query.isFetching}`，首屏加载也显示「刷新中」；`user-list.tsx:242` 的正确写法是 `query.isFetching && !query.isPending`。
- **[低]** 注释与实现矛盾：`system/user/-components/use-user-detail.ts:24-29` 称「refetchOnMount 保持默认值，这就是点击详情会发请求的原因」，而 `lib/query-client.ts:19` 设的是 `refetchOnMount: false`（真正触发的是 `enabled` 由 false 变 true）；`storage/display.tsx:53` 仍写 "monospaced"（§3.1）。
- **[低]** 导入分组/排序：`user-list.tsx:18-19` 本地导入未按手写排序；`role-checkable-tree.tsx:8-9` 把 `cn` 放在 `@/` 别名导入之后（与 `user-list.tsx:6-7` 相反）。
- **[低]** `auth/route.tsx:23` 与 `auth/login/route.tsx:24-25` — 同一屏中英混排（左栏中文、右栏全英文）。
- **[低]** `system/config/-components/storage/config-storage.tsx:254,265` 与 `storage/group-panel.tsx:66` 的 `title` prop 是本地组件 prop，但命名与 DOM `title` 混淆，建议改名 `label`。
- **[低]** 模板示例的任意值颜色（AGENTS.md 禁止 hex/RGB/HSL/OKLCH 任意值）：`dashboard/logistics/-components/shipment-route-map.tsx:171,174,179,183,184,191`（`bg-[#d4dadc]`、`fill-[#0e0e0e]`、`stroke-[#ebd6d8]`）、`invoice/-components/invoice-paper.tsx:82`（`border-[oklch(0.86_0_0)]`）、`finance/-components/wallet.tsx:108`（`shadow-[0_0_8px_rgba(34,197,94,0.5)]`）。
- **[低]** 开发期噪声：`dashboard/invoice/-components/use-visible-center-position.ts:40` 在 scroll/resize 回调里 `console.log`（有 `import.meta.env.DEV` 门控，故为低）。

**基础层（lib / components / hooks）**

- **[中]** `components/app-shell/index.tsx:48-52` — `loadAppShell` 先 `await ensureMenuLoaded()` 再 `requireAuth`，与它自己 `:44-46` 的注释（"The auth guard runs before the request"）相反；未登录深链会先发出 `GET /auth/user/route`，并在 401 分支里触发刷新/清会话/`POST /auth/logout`（`http.ts:175-195`）后才被守卫重定向。应把 `requireAuth({ location })` 提到 `ensureMenuLoaded()` 之前。
- **[中]** `lib/http.ts:220-221` — 401 时先经 `sessionExpiredHandler` 弹一次提示，紧接着 `fail()` 又对同一条消息再弹一次（`stores/auth/auth-provider.tsx:45`），用户会看到两条一模一样的"登录状态已失效"；叠加 `query-client.ts:21` 的 `retry: 1`，任何失败都会随重试重复弹 toast。会话已由 handler 上报时应传 `silent: true`，或把 toast 收敛到只报最终失败。
- **[低]** `hooks/use-menu.ts:52` — `queryClient.query({ ...menuQueryOptions, staleTime: 0 })` 覆盖了同一 query 自己声明的 5 分钟 `staleTime`（`use-menu.ts:24`），只要 loader 再执行就无条件重新请求 `GET /auth/user/route`。应改用较短的显式阈值或 `invalidateQueries` 后置刷新。
- **[低]** `lib/http.ts:316-334` — `downloadFile` 在刷新后再次 401 时不会走 `handleSessionExpired`，与 `send`（`:217-222`）行为不一致：本地会话不清除，只弹 `STATUS_MESSAGE[401]`。
- **[低]** `lib/cookie.ts:8-18` — 写侧不编码、读侧用 `split('=')[1]`，值里含 `=`、`;`、`,`、`"` 时会读回错误内容；而 `routes/(main)/mail/-components/mail.tsx:68` 正把 `JSON.stringify(sizes)` 交给它。应写入时 `encodeURIComponent`、读取时 `slice(key.length + 1)` 后再 `decodeURIComponent`。
- **[低]** `components/date-range-picker.tsx:44` — 触发器硬编码 `id="date"`，同一页面两个实例就会产生重复 DOM id，且该 id 没有任何引用。应删除或用 `useId()`。
- **[低]** `components/app-shell/header/user-menu.tsx:19` — 头像兜底指向第三方外链 `https://github.com/shadcn.png`，每个无头像用户都会向 GitHub 发一次请求。应改用本地占位图或 `AvatarFallback` 首字母（同文件 `:33` 已实现）。

---

## 12. 低性能

- **[高]** `system/menu/-components/icon-picker.tsx:3` — `import { icons } from 'lucide-react'` 把整个图标库拉进产物（与 `navigation/sidebar/menu-icons.tsx` 的按需策略冲突），叠加 §6 的模块作用域扫描，打开菜单页即付出全量代价。
- **[中]** `navigation/sidebar/menu-icons.ts:132,327` — 同样引入 `icons` 运行时全量对象并按名字索引（`(icons as Record<string, LucideIcon | undefined>)[pascalName]`），破坏 tree-shaking；Lucide 官方明确说明动态加载 "is importing all icons during the build"。应去掉动态查找，只保留 `MENU_ICONS` 映射（后端可下发的名字本就有限）。注意 `:141-300` 约 160 条映射里有 50+ 条与 `toPascalCase` 查找结果完全相同，两处需一起决策（保留映射表则删除 `icons` 查找）。
- **[高]** `system/role/-components/role-user-add-dialog.tsx:50-54,115` — 用户搜索无防抖，每次按键发一次请求（`user-list.tsx:75-82` 对同类搜索做了 300ms 防抖）。
- **[中]** `system/config/-components/sms/config-sms.tsx:164`、`storage/config-storage.tsx:144` — 见 §6（`useCallback` 依赖整个 mutation 对象导致列模型每帧重建）。
- **[中]** `system/config/-components/config-site.tsx:141-145` — base64 图片写进配置项（见 §6）。
- **[中]** `system/config/route.tsx:93-103` — 见 §6（memo 失效）。
- **[低]** `system/role/-components/role-user-drawer.tsx:124,203` — 列定义依赖瞬时状态 `isUnassigning`，每次取消授权都重建整个列模型与全部单元格。
- **[低]** `open/app/-components/app-display.tsx:36` — `ExpireTimeCell` 每次渲染为每行重新解析日期（50 行 = 50 次 `Date` 构造）。
- **[低]** `open/app/-components/app-secret-dialog.tsx:49` — `const masked = value.replace(/./g, '•')` 每次渲染重建（即使当前显示明文）。
- **[低]** `open/app/-components/app-table.tsx:127,130` — 同一次渲染两次调用 `table.getVisibleLeafColumns()`。
- **[低]** 模板示例：`mail/-components/mail-inbox.tsx:17-18` 每次渲染两次 `mails.filter`；`chat/-components/chat-conversation-list.tsx:27-30`、`roles/-components/roles-table/table.tsx:24-40` 在 reduce 内 `find`（O(n²)）；`logistics/-components/shipment-list.tsx:172` 全量渲染 156 行无虚拟化；`analytics-overview.tsx:133` 的 `buildRevenueChartData` 用 `Math.random()`（同日期范围结果不稳定，且未 `useMemo`）。
- **[低]** `components/app-shell/index.tsx:57` 与 `components/app-shell/app-breadcrumb.tsx:129` — `useBreadcrumbTrail()` 在同一次 shell 渲染里被调用两次（前者只为取 `.length > 0`），`findMenuTrail` 遍历菜单树两遍且 `useMemo` 结果不共享。应把 trail 提到 shell 层计算后下传，或由 `AppBreadcrumb` 回传 `hasBreadcrumb`。
- **[低]** `lib/utils.ts:34` — `formatCurrency` 每次调用都新建 `Intl.NumberFormat`，而它在列表/表格行渲染中被反复调用。应按 `locale + currency + digits` 组合缓存 formatter 实例。
- **[低]** `components/app-shell/header/search-dialog.tsx:58-64` — `groupBy` 对每个分组都重新 `filter` 整份列表（O(n·g)），应一次遍历归组。

---

## 13. 整改优先级与批次

### 批次 1：正确性与安全（建议立即）

1. `role-user-drawer` 的 invalidate key（§4-1）—— 用户可见的功能失效。
2. 4 个表单式配置面板补 `isError`（§4-2）—— 否则会静默覆盖后端配置。
3. `client/form-drawer`、`sms/form-drawer` 补编辑态 `isError`（§4-3）。
4. `dept-delete-dialog` 守卫改用原始树（§4-4）。
5. 删除 `login-form.tsx:37-38` 的硬编码账号口令（§11）。
6. `lib/http.ts:220-221` 去掉 401 的重复 toast（§11）。
7. `components/app-shell/index.tsx:48-52` 把 `requireAuth` 提到 `ensureMenuLoaded` 之前（§11）。
8. `lib/cookie.ts:8-18` 补编解码（§11）—— `mail.tsx:68` 传入 `JSON.stringify` 的值会被读回错误内容。

### 批次 2：口径落地

10. 把 §0.1 的三条口径写进 AGENTS.md：`ui/` 的定位是「registry 引入的根组件 + 项目自己的基础组件」；自研复合控件为自身提供的 ARIA 不受 R3 约束；`aria-label` 在 `ui/` 内允许。

### 批次 3：删死代码（零风险、收益最大）

10. 删除 `(legacy)` 4 个目录（25 文件约 3,300 行）与 `dashboard/coming-soon`。
11. 删除 `components/ui/` 14 个未使用文件（1,649 行）——需先与所有者确认"与上游可 diff"与"体积"哪个优先。
12. 删除 `lib/api` 与 `lib/` 的 9 个死导出、`can.tsx`、`storageTypeDescription`、`appLabel`、`findColumnId`/`findTask`、`user/-components/use-fullscreen-transition.ts` 转发模块，以及 §7.7 的 4 个 query key 死键与 store 死状态（`isLoadingUser`、`roles`、`hasAnyPermission`/`hasAllPermissions`）。
13. 清理 §7.5 的恒 false 条件与不可达分支、§7.6 的未使用 props。

### 批次 4：抽公共层（结构性，收益最大）

14. `src/components/data-table/`：表格外壳（三态 + 分页页脚）+ `src/lib/` 放 `getPageNumbers`/`preventPaginationNavigation`/`PAGE_SIZE_OPTIONS`。一次性消掉 7 份表格、8 份工具栏、6 份删除对话框的重复。
15. `CopyField` / `useCopyToClipboard`：消掉 6 份剪贴板实现。
16. `TableEmptyState`（内部用 `ui/empty.tsx`）/ `TableErrorState` / `RetryHint`：消掉 17+ 处手写空状态与 7 处错误重试。
17. `useDebouncedKeyword` / `usePageBoundsCorrection` / `TableFullscreenContainer`：消掉列表页三处逐字复制的状态逻辑。
18. `dept` / `menu` 合并为一个泛型树表模块（`TreeDataTable` + `TreeTableToolbar` + `useTreeKeywordFilter` + `useTreeExpandAll`），顺带修掉两模块已分叉的行为。

### 批次 5：规则收敛（需所有者先定口径）

19. **R3 口径**：先决定 `aria-invalid` 保留还是删除（§3.3），再批量处理 33 处 `aria-label` 与 8 处 DOM `title=`（统一换 `Tooltip`/`sr-only`）。
20. **R4**：18 处原生 `<button>` → `Button`/`ToggleGroup`；`config-site` 的上传与 `<img>` 抽包装组件；`config-mail` 改用 `PasswordInput`；`captcha-image` 改用 `Spinner`。
21. `system/menu/-components/icon-picker.tsx` + `navigation/sidebar/menu-icons.ts:132,327`：去掉两处 `import { icons }` 运行时全量索引，`icon-picker` 改惰性 + 按需，删掉 327 行关键词分类启发式。
22. `search-dialog.tsx:131-133` 改用 `ui/kbd.tsx`；`nav-main.tsx:86`、`support-card.tsx:17,21` 的裸 `<a>` 改用 `Link`；清理 `simple-icon.tsx:17-18`、`support-card.tsx:27`、`header-tabs.tsx:162`、`nav-main.tsx:72,228` 这 4 处 R3 属性。

---

## 14. 未发现问题的方面

- **R1**：业务代码 164 文件 `font-mono` 零命中；7 处全部在豁免的模板示例代码内。
- **R2 的其余部分**：`components/ui/**` 无 `'use client'` 残留（`1979956` 已清 19 个文件）；`733dc87` 的 61 文件纯格式化属授权操作。
- **`any` 与类型抑制**：业务代码与模板示例代码均无 `any`、`as any`、`@ts-ignore`、`@ts-expect-error`、lint 抑制注释。
- **TanStack Query**：queryKey 全部走工厂（`lib/query-keys.ts`）；`invalidateQueries` 前缀与 key 结构一致（唯一例外见 §4-1）；抽屉详情 `enabled: open && isEdit` 懒加载；无请求瀑布（各抽屉内查询并行发起）；`placeholderData` 保留旧页；重复订阅由 React Query 去重。
- **TanStack Table v9**：统一 `dataTableFeatures` 注册；服务端分页屏正确使用 `manualPagination + rowCount + pageCount + autoResetPageIndex:false`；客户端分页屏（role 列表）依赖内置 paginated row model；`getRowId` 与列可见性重置齐备；`table.FlexRender` 用法正确。
- **性能的其余部分**：列定义、树索引、树数据转换、id 映射表均已 `useMemo`；模块级常量（`HIDDEN_BY_DEFAULT`、`STATUS_OPTIONS`、`PAGE_SIZE_OPTIONS`、`EMPTY_ROWS` 等）均在模块作用域；`storage/config-storage.tsx:43,100`、`sms/config-sms.tsx:45,174`、`client/config-client.tsx:53,221` 用稳定空数组避免每帧重建；zustand 无「订阅整个 store」问题。
- **表单校验**：`zod` schema 与后端 `RegexConstants` 的对应关系在注释中说明清楚（`user-form-drawer.tsx:40-67`），`zodResolver` + `Controller` 用法一致。
- **路由与布局**：`(app)/route.tsx`（25 行）只做 AppShell + Outlet 组合；`(app)/$.tsx` 菜单未命中时回退 `NotFound` 而非误报"施工中"；`auth/route.tsx` 的 `h-dvh` 用于自身根容器（不在 AppShell 内）正确。
- **登录安全**：`login-form.tsx:60` 的开放重定向防护成立（`startsWith('/')` 拦下绝对地址；`//evil.com` 经 `@tanstack/history` 的 `normalizeProtocolRelative` 规范为内部路径）。
- **主题令牌**：业务代码无任意 hex/rgb/hsl/oklch 颜色；`emerald/sky/amber` 等均为 Tailwind 具名调色板。
- **配置面板渲染**：`config/route.tsx:140-147` 的 `visibleTabs.map()` 不会一次性挂载 7 个面板（Base UI `Tabs.Panel` 的 `keepMounted` 默认 `false`），无并发请求瀑布。

**基础层（lib / hooks / stores / navigation / components）**

- **R1**：`lib/**`、`hooks/**`、`stores/**`、`navigation/**`、`components/**`（含 `app-shell`、`calendar`）内 `font-mono` 零命中。
- **R2**：`components/calendar/event-calendar-views.tsx` 的 `aria-*`/`role=`/`title=`/`font-mono`/原生 `<button>`/`<input>` 全部零命中；`components/ui/**` 的上游改动见 §3.2（仅 4 处经确认的有意偏离）。
- **zustand 订阅**：`layout-controls.tsx:16`、`theme-switcher.tsx:12`、`app-sidebar.tsx:24` 都用 `useShallow`，`header-tabs.tsx:105-109`、`auth-provider.tsx:70-73`、`use-permission.ts:22`、`can.tsx:22`、`user-menu.tsx:23` 都用原子选择器，**未发现"订阅整个 store 导致全量重渲染"**。
- **HTTP 层的并发与重试语义正确**：`refreshAccessToken` 是单飞（`http.ts:165-173`）；`send` 用 `isRetry` 保证刷新后最多重试一次（`:217,232`）；`handleSessionExpired` 用 generation + 一次性标记防止旧会话的迟到 401 清掉新会话（`:175-181`）。
- **`use-fullscreen-transition` 本体无泄漏**：定时器有清理（`:138`）、`Escape` 监听随 `isActive` 挂卸（`:125-136`）、过渡结束后复位内联样式（`:56-69`）。
- **TanStack Query 新 API 用法正确**：`hooks/use-menu.ts:52,58` 的 `queryClient.query()` 与 `staleTime: 'static'` 经核对 `@tanstack/query-core@5.104.2` 源码为正式新增 API（`fetchQuery`/`prefetchQuery`/`ensureQueryData` 的 `@deprecated` 注释正是指向它），不是缺陷。
- **`data-table-features.ts`**：显式注册 features/rowModels/filterFns/sortFns 与 v9 要求一致，`DataTableFeatures` 类型被 20+ 个表格文件使用。
- **`crypto.ts` / `auth-session.ts` / `menu-cache.ts` / `auth-guard.ts`**：未发现密钥泄漏、竞态或未清理的缓存路径（`clearSession` 会同步 `clearCachedMenu`）。

---

## 附：本次审计未覆盖

- 未执行 `pnpm build`（产物体积、tree-shaking 效果未实测；`icon-picker` 的 `import { icons }` 影响为静态推断）。
- 未做运行时/视觉验证（无浏览器交互），暗色主题与响应式断点的实际表现未验证。
- 后端契约一致性（字段、权限码、枚举）不在本次范围。
