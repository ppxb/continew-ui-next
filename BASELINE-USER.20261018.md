# BASELINE-USER.20261018.md — 用户管理页代码质量基线（2026-10-18 快照）

审计对象：`src/routes/(main)/(app)/system/user/**`（15 文件 / 2,589 行），及直接引用的共享层：
`components/{password-input,status-cell}.tsx`、`lib/api/user.ts`、`lib/{query-keys,query-client,data-table-features,constants}.ts`、
`hooks/use-fullscreen-transition.ts`，以及用于比对默认值的 `src/components/ui/**`。

审计基线：`4259ea4`（2026-10-17）之后的工作区，审计日期 2026-10-18。
方法：逐文件通读 + 对 `ui/**` 默认 class 串做静态比对 + 机械扫描（原生元素、`aria-*`/`title`/`role`、色值、`font-mono`、重复定义、死导出）。
限制：**未做运行时与视觉验证**（未跑 dev、未在浏览器操作）。所有"视觉后果"判断基于 class 串的静态比对。

与旧快照的关系：`BASELINE-USER.md` 写于 2026-10-17 22:52，之后 `system/user` 又落了 `68bba18`、`82e1ce1` 两个提交。
旧稿 §8 的 C10 与 §3.8 引用的 `alwaysRefetch` 选项**在现码中已不存在**，`use-user-detail.ts` 改用 `enabled` + `staleTime: 0`。
本文件是当前状态的独立快照，旧文件保留作历史对照。

维护约定：本文件描述**快照当日**的状态。后续整改若落在同一文件上，直接改写对应条目；若需要新的时间点对照，
另存新日期文件，不改写本文件。

---

## 1. 总体结论

| 维度 | 评级 | 关键证据 |
|---|---|---|
| 1 优雅性 | **中** | `user-form-drawer.tsx` 571 行；10 段逐字重复的字段块；5 层嵌套三元 `user-table.tsx:54-68`；5 组「id state + open state」`user-list.tsx:56-68` |
| 2 冗余 | **中偏差** | `LOOKUP_STALE_MS` ×6；dept 树查询 ×3、role 字典查询 ×4；表格外壳工具 ×7–9；`PASSWORD_PATTERN` ×2 |
| 3 库/框架最佳实践 | **中** | Table v9 / Query v5 主用法正确；但无 `useMutation`、`meta` 未用、无 `validateSearch` |
| 4 低效 | **中** | 搜索框 state 在页根，按键即重渲染整表；该 memo 的没 memo |
| 5 性能 | **中** | 服务端分页、`getRowId`、稳定空数组都对；风险集中在 H1 |
| 6 原生 HTML | **3 处违规** | 同一「重试」模式写三遍：`user-form-drawer.tsx:480`、`user-assign-roles-dialog.tsx:177`、`user-role-select.tsx:77` |
| 7 shadcn class 覆盖 | **0 违规、5 处纯冗余、4 类越权** | 见 §5；无 `border-0`/`bg-transparent`/`focus-visible:ring-0`/`shadow-none` 三件套 |

合规扫描（全部经命令确认）：

- 原生交互元素：3 处 `<button>`，其余 0
- `aria-label`：1 处，`password-input.tsx:23`（在 `ui/**` 之外，**违反 AGENTS.md 的 `aria-label` 规则**）
- `role=` / `title=`：0
- `font-mono`：0
- 任意 hex / rgb / hsl / oklch：0
- `src/components/ui/**`、`src/components/calendar/**` 改动：无（`git status` 干净）

---

## 2. 必修（高）

### 2.1 搜索框 state 在页面根，每敲一个键重渲染整张表

`user-list.tsx:53` 的 `searchInput` state、`:274-278` 的 `<InputGroupInput onChange>`、`:72-79` 的防抖 effect 都在 `UserList` 内。
防抖只限制**请求**，不限制**渲染**：每次按键 → `UserList` 重渲染 → `tableSection`（最多 50 行 × 可见 12–16 列）整体 reconcile。

叠加因素：`:242-250` 传给 `UserToolbar` 的 6 个回调、`:258` 的 `onRetry` 全是内联箭头，而 `UserToolbar`/`UserTable`
都没有 `React.memo`，即使加 memo 也拦不住新 props。`:127-129` 的 `reportPending` 用了 `useCallback`，但消费者未 memo，等于白写。

修法：抽 `UserSearchInput`（本地 state + 防抖后回调），工具栏/表格套 `React.memo`，回调用 `useCallback`。

### 2.2 `password-input.tsx:15` 覆盖 InputGroup 高度 —— 共享组件，影响全站

```tsx
<InputGroup className={cn('h-9', className)}>   // ui/input-group.tsx 默认 h-8
```

同表单内 `Input`（`ui/input.tsx:11`，`h-8`）与 `SelectTrigger`（默认 `h-8`，`size="sm"` 为 `h-7`）都是 32px，
只有密码框是 36px。消费者不只本页：`sms-form-drawer.tsx:316`、`storage-form-drawer.tsx:426` 同样受影响。

二选一：删除 `h-9`（以 h-8 为准），或统一把表单控件基线上移到 h-9（需改 `ui/**`，超出当前权限）。

### 2.3 三处原生 `<button>` 重试，同一模式写三遍

| 位置 | 外层样式 |
|---|---|
| `user-form-drawer.tsx:480` | `<p className="text-xs text-destructive">` |
| `user-assign-roles-dialog.tsx:177` | `<p className="text-sm text-destructive">` |
| `user-role-select.tsx:77` | `<p className="px-2 py-1.5 text-sm text-destructive">` |

三处结构逐字相同、样式三样。应抽 `QueryErrorRetry`，内部使用 shadcn `Button variant="link" size="sm"`。
注意：同款写法在本目录外还有（`dept-list.tsx:259`、`menu-form-drawer.tsx` 多处），只改本页 3 处会造成新的不一致，
**整改范围需所有者决定**。

### 2.4 10 个字段里 9 个 `FieldLabel` 与控件无程序化关联

`user-form-drawer.tsx` 的 `:347/359/402/420/438/467/495/512/531` 均为裸 `<FieldLabel>昵称</FieldLabel>`，
既无 `htmlFor` 也无 `id`。全文件只有密码字段 `:378` 做对；`user-reset-password-dialog.tsx:132/152`、
`user-role-select.tsx:98` 也都做对。后果：点标签不聚焦、读屏读不出字段名。
`FieldLabel` 只是渲染 `<label>`（`ui/field.tsx:90`），不会自动关联，必须显式配对。

### 2.5 「有旧数据 + 刷新失败」完全不可见

`user-table.tsx:82-83` 的注释声称 `isStale` 覆盖「a refetch failed」，但实参是 `query.isPlaceholderData`
（`user-list.tsx:257`），它只在占位数据展示期间为 true，与失败无关。而 `:116` 的错误分支只在 `rows.length === 0` 时可达。

所以：某页已成功加载后，刷新/翻页失败 → 旧数据保留、`isError` 被忽略、界面无任何提示。
这是注释与实现脱节造成的真实状态覆盖缺口（AGENTS「处理 loading/empty/error」的第 12 条）。

---

## 3. 应修（中）

### 3.1 571 行单文件，10 段字段块逐字重复

`user-form-drawer.tsx` 一个文件承担：schema、常量、骨架、10 个 `Controller`、提交逻辑、布局。
`:342-543` 的 `<Controller> + <Field className="gap-1.5" data-invalid> + <FieldLabel> + 控件 + <FieldError>`
结构重复 10 次，只有 name/label/控件不同 → 应抽 `FormFieldRow`。同文件 `UserFormSkeleton`（`:127-179`）
也是 9 段相同的两行骨架。

### 3.2 重复定义（均经 grep 确认）

| 重复物 | 份数 | 位置 |
|---|---|---|
| `LOOKUP_STALE_MS = 5 * 60_000` | **6** | 4 份定义：`dept-tree-select.tsx:9`、`user-role-select.tsx:12`、`user-form-drawer.tsx:73`、`user-assign-roles-dialog.tsx:31`；2 处裸字面量：`user-list.tsx:107,113` |
| dept 树查询（key + fn + staleTime） | **3** | `user-list.tsx:104-108`、`dept-tree-select.tsx:72-77`、`user-form-drawer.tsx:209-214` |
| role 字典查询 | **4** | 上述之外加 `user-role-select.tsx:150-155`、`user-assign-roles-dialog.tsx:256-260` |
| `PASSWORD_PATTERN` | **2** | `user-form-drawer.tsx:67`、`user-reset-password-dialog.tsx:32` |
| `String(id)` 映射 Map | **3** | `user-form-drawer.tsx:251-255`、`user-assign-roles-dialog.tsx:263-266`、`user-role-select.tsx:203` |
| `userLabel` | **2** | `user-columns.tsx:32` 又把 `nickname \|\| username` 内联写了一遍 |
| 一行转发壳 | **1** | `-components/use-fullscreen-transition.ts:1`，唯一消费者 `user-list.tsx:15`；其余 7 个页面直接引 `@/hooks/...` |

React Query 按 key 去重，所以**不是网络重复**；问题是各调用点的 `enabled`/`staleTime` 语义不同
（有的 `enabled: open`、有的默认开），一处改动容易漂移。建议抽 `useDeptTree(options)` / `useRoleDict(options)`。

**文案已在漂移**：`user-form-drawer.tsx:70` 写「至少包含一个小写字母和一个数字」，
`user-reset-password-dialog.tsx:141` 写「至少包含一个字母和一个数字」——正则要求的是小写字母，后者会误导用户。

### 3.3 表格外壳工具在 7–9 个文件里各抄一份

grep 确认：`getPageNumbers` **7 份**、`TableSkeletonRows` **7 份**、`preventPaginationNavigation` **9 份**，
`PAGE_SIZE_OPTIONS` 同类重复。这是项目级问题，需决定是否抽 `DataTable` / `DataTableFooter`。
按 AGENTS「不要预先抽公共」的原则，应由所有表格页共同确认收敛。

### 3.4 无一处 `useMutation`，「进行中」有两套机制

5 个写操作全是手写 `try/catch + invalidateQueries + toast`；「进行中」一边用 `formState.isSubmitting`（4 处），
一边用 `useState(isDeleting)`（`user-delete-dialog.tsx:249`）。Query v5 的 `useMutation` 自带
`isPending`/`onSuccess`/`onError`/`mutateAsync`，可把两套机制归一。

### 3.5 列定义层

- **翻页重建全部 16 个列定义**：`createUserColumns(handleRowAction, rowOffset)`（`user-columns.tsx:101` +
  `user-list.tsx:162`），只为改序号列的 offset。v9 惯用法是模块级 `ColumnDef[]`，offset/onAction 走
  `table.options.meta` —— **本项目 `meta` 完全未用**。
- **`accessorKey` 目前只当 id 用**：14 个列的 `cell` 一律读 `row.original.*`，无一处 `getValue()`；表头无排序入口，
  服务端固定 `DEFAULT_SORT = 't1.id,desc'`。要么接排序 UI，要么改用 `id` 声明"仅用于可见性"。
- **4 个居中列的表头左对齐**：序号/状态/性别/系统内置的 `header` 是字符串，而 `TableHead` 默认 `text-left`，
  cell 却写 `text-center`（`user-columns.tsx:108/125/133/160`）；操作列 `:193` 做对了（header 内包 `<div className="text-center">`）。
- **展示原语分居两处**：`TextCell`/`NicknameCell` 在 `user-columns.tsx`，`RoleCell` 在 `user-display.tsx`。

### 3.6 分页区四个问题

- **越界瞬间无高亮**：`user-table.tsx:90` 钳制了 `currentPage`，但 `:195` 的 `isActive` 用未钳制的
  `table.state.pagination.pageIndex`。
- **先发越界请求再纠正**：`user-list.tsx:120-125` 的兜底 effect 会为越界页发一次请求再回退。
  `rowCount`/`pageCount`（`:170,172`）已能表达边界，在 `onPaginationChange` 里钳制更干净。
- **假 disabled**：`pointer-events-none opacity-50`（`user-table.tsx:183,214`）只挡鼠标，键盘仍可聚焦并回车。
  不是可访问的禁用态。
- **`href="#"` 当按钮**（`:181/194/212`）：语义是锚点，中键/新标签会跳 `#`。`ui/pagination.tsx` 只支持 `<a>`，属上游限制。

### 3.7 筛选/分页不进 URL

`route.tsx:5-7` 没有 `validateSearch`，刷新、前进后退、分享链接都会丢状态。`system/config/route.tsx` 已有先例，
system 下另外 3 个页面同样没有 → 至少是同类页面口径不一致。

### 3.8 5 组「id state + open state」

`user-list.tsx:56-68` 五个弹层用成对 state 表达，靠注释解释 null 的语义。可收拢为 `{ id, open }`
或 `useReducer`，让 open 的语义由类型显式表达。

### 3.9 筛选栏的部门树加载失败后永久不可用

`user-list.tsx:104-108` 预热失败时无任何重试入口；`dept-tree-select.tsx:99` 在 `isError` 时直接
`disabled`，只把 placeholder 换成「部门加载失败」。表单抽屉里有重试按钮（`user-form-drawer.tsx:477-484`），筛选栏没有。

### 3.10 枚举类型被放宽

`status-cell.tsx:9` 用 `status?: number | null`，而 `UserStatus = 1 | 2`；`genderLabel` 的
`Record<number, string> ?? '未知'` 同理。`undefined`、`null`、未来新增的 `3` 都会静默显示成「禁用」。
正例对照：`user-display.tsx:12` 用 `UserResp['gender']`，`userLabel` 用 `Pick<UserResp, 'nickname' | 'username'>`。

---

## 4. 轻微（低）

| 项 | 位置 | 说明 |
|---|---|---|
| 纯冗余 class | `user-table.tsx:118` | `hover:bg-muted/50` 与 `ui/table.tsx:35` 默认逐字相同 |
| 纯冗余 class | `user-table.tsx:120`（骨架 `:53`） | `align-middle` 与 `ui/table.tsx:60` 默认相同（`py-4` 是真覆盖，保留） |
| 纯冗余 class | `user-columns.tsx:36` | `<Avatar className="size-8">` 与 `ui/avatar.tsx:17` 默认相同 |
| 纯冗余 class | `user-detail-drawer.tsx:100` | `Skeleton … rounded-md` 与 `ui/skeleton.tsx:4` 默认相同 |
| 纯冗余 class | `user-role-select.tsx:98` | `Label … text-sm` 与 `ui/label.tsx:9` 默认相同 |
| 穿透选择器 | `user-table.tsx:99` | `**:data-[slot='table-cell']:px-4` 可去掉：`:107/:120` 已直接给 `TableHead`/`TableCell` 传 className，`px-4` 写那儿即可 |
| 双线边框 | `user-table.tsx:103` | `[&_tr]:border-t` 与 `TableHeader` 默认 `[&_tr]:border-b` 叠加 |
| 字重口径 | `user-table.tsx:107`、`user-columns.tsx:160`、`user-role-select.tsx:98` | `font-normal` 抵消默认 `font-medium`，与 base-nova 默认字重不一致，需统一裁决 |
| 同类页缺细节 | `user-list.tsx:266/267` | `CardHeader` 独缺 `border-b`（dept/menu/role/config-storage 4 处都有）；`CardTitle` 有 `text-xl` 却缺 `leading-none` |
| 骨架跳变 | `user-table.tsx:50` | 固定 5 行，默认每页 10 条 → 加载前后高度变化 |
| 骨架尺寸不符 | `user-form-drawer.tsx:134-158` | 骨架统一 `h-9`，实际 `Input` 是 `h-8` |
| 5 层嵌套三元 | `user-table.tsx:54-68` | 骨架宽度应改查表数组 |
| 文案不随状态变 | `user-toolbar.tsx:102-105` | 图标在 Maximize/Minimize 间切换，文案恒为「表格全屏」 |
| 魔法字符串 | `user-list.tsx:42-46` + `:185` | `Number(value) as UserStatus`，应由枚举派生 |
| 无意义三元 | `user-list.tsx:180` | `value ? value : undefined` → `value \|\| undefined` |
| 非空断言 | `user-assign-roles-dialog.tsx:376` | `user!` 掩盖了 `UserResp \| null` 的收窄 |
| 死导出 | `hooks/use-fullscreen-transition.ts:146` | `closeFullscreen` 全库无外部引用 |
| 多余导出 | `dept-tree-select.tsx:36` | `toDeptTreeNodeData` 无外部消费者（`dept-parent-select.tsx` 的同名函数是另一个） |
| rAF 未取消 | `hooks/use-fullscreen-transition.ts:96-108` | 卸载只清 timer，未 `cancelAnimationFrame` |
| 英文 aria | `ui/pagination.tsx:52/65` | 「Go to previous page」出现在中文界面（上游问题） |

---

## 5. 维度 7 专项：shadcn class 覆盖

**结论：没有「无理由抵消默认样式」的典型违规。** 全目录无 `border-0` / `bg-transparent` /
`focus-visible:ring-0` / `shadow-none` 这类三件套。问题分四类：

1. **越权改尺寸（1 处，共享影响）**：`password-input.tsx:15` 的 `h-9`，见 §2.2。
2. **用 class 替代不存在的 prop（1 处，合理但需知情）**：`user-list.tsx:270` 的 `InputGroup className="h-7"`——
   `InputGroup` 没有 `size` prop，而 `SelectTrigger size="sm"` 是 h-7，为对齐只能写 class。
   可接受；根治应在 `ui/input-group` 上游补 `size` 变体。
3. **穿透选择器（2 处）**：`user-table.tsx:99` 的 `**`、`:103` 的 `[&_tr]:border-t`，见 §4。
4. **纯冗余（5 处）**：所写值与组件默认逐字相同，见 §4 前五行。

**正面样板**（正确形态）：`SelectTrigger size="sm"`（`user-list.tsx:221`、`user-table.tsx:158`）、
`SelectContent alignItemWithTrigger={false}`（`user-list.tsx:225`）、`Button size="sm" variant="outline"`、
`DrawerContent` 只覆盖 CSS 变量 `[--drawer-content-width:32rem]`（`user-form-drawer.tsx:324`）、
`dept-tree-select.tsx:100` 用 `invalid` prop 而不是手写 `aria-invalid`。

---

## 6. 做得好的地方（基线正面样本）

| 项 | 位置 | 为什么好 |
|---|---|---|
| 表格 v9 关键用法全对 | `user-list.tsx:164-177` | `manualPagination`/`rowCount`/`autoResetPageIndex:false`/`getRowId`/受控 `state` |
| Query 细节 | `user-list.tsx:40`（稳定空数组）、`:100`（`placeholderData: previous => previous`） | 避免行模型重建与翻页闪空 |
| 打开时强制刷新 | `use-user-detail.ts` | 在全局三个自动重取开关全关的前提下，用 `enabled` + `staleTime: 0` 正确实现「打开即取最新」，注释写明了原因 |
| 精确失效 | `user-reset-password-dialog.tsx:95` | 只失效 `userKeys.detail(id)` 并写明理由，比 `userKeys.all` 精准 |
| 组件归位 | `status-cell`/`password-input` 在 `components/`；`dept-tree-select`/`user-role-select` 在 `-components/` | 符合「复用即上移」 |
| 状态覆盖 | 骨架/空态/错误+重试/禁用/overflow 齐全；编辑态有 `isError` 分支（`user-form-drawer.tsx:563`） | 不会用空表单覆盖原记录 |
| 路由极简 | `route.tsx`（7 行） | 只做组合 |
| 模块级纯函数/常量 | `user-table.tsx:25,31,47`、`user-columns.tsx` 的 cell 渲染器、`GENDER_ITEMS` | 无 per-render 组件身份变化 |
| 注释质量 | 全目录 | 解释「为什么」而非「是什么」，明显高于项目平均 |

---

## 7. 需要所有者裁决（按优先级）

1. **`aria-invalid` 口径**：它是 `ui/input`、`ui/switch`、`ui/button` 失效态样式的功能钩子，删掉会同时丢视觉与语义。
   建议把 AGENTS 规则收敛为「禁止 `aria-label`/`role`/`title`，`aria-invalid` 例外」。
2. **表单控件高度基准**：h-8（删 `password-input.tsx:15` 的 `h-9`）还是 h-9（需动 `ui/**`）？
3. **`font-normal` 覆盖 `font-medium`**（≥3 处）：承认并统一，还是去掉？
4. **原生 `<button>` 整改范围**：只修本页 3 处，还是按目录统一？
5. **是否抽 `DataTable` 外壳**（7–9 份重复）：与「不要预先抽公共」的取舍。
6. **`validateSearch`**：筛选/分页/关键词是否进 URL。
7. **列排序**：接服务端排序（加 handler + 改用 `getValue`），还是承认 `accessorKey` 只当 id 用？

---

## 8. 可复用的质量基线检查项

> 用法：新页面/新模块 review 时逐条过。每条标注本页的**反例**，便于对照。

**A. 共享组件**
- [ ] A1 共享组件里是否覆盖了 shadcn 的尺寸/圆角/边框/背景/焦点环？→ 反例 `password-input.tsx:15` 的 `h-9`
- [ ] A2 共享组件里是否有 `aria-label`？（不在 `ui/**` 内就不豁免）→ 反例 `password-input.tsx:23`

**B. class 覆盖（`ui/**` 只能上游改，调用点只做适配）**
- [ ] B1 是否有与组件默认值**逐字相同**的冗余类？→ 反例 5 处（§4）
- [ ] B2 是否有 `**:data-[slot=…]` / `[&_tr]:…` 穿透？能否改到调用点？→ 反例 `user-table.tsx:99,103`
- [ ] B3 覆盖字重/字号（`font-normal`、`text-xs`）是否有统一口径？→ 反例 `user-table.tsx:107`
- [ ] B4 能用组件自带 prop/变体（`size`、`align`、`variant`）就不改类？→ 正例 `SelectTrigger size="sm"`

**C. React / Query / Table**
- [ ] C1 输入框 state 是否放在会重渲染大列表的组件里？→ 反例 `user-list.tsx:53`
- [ ] C2 传给子组件的回调是否内联箭头且子组件未 memo？→ 反例 `user-list.tsx:242-258`
- [ ] C3 关于「何时重新取数」的注释，是否与 `lib/query-client.ts` 的全局开关一致？（三个自动重取开关全为 false）
- [ ] C4 表单回填若用 effect + `reset`，是否满足：① 数据稳定前不渲染表单；② 已填过一次不再覆盖？→ 本页 `user-form-drawer.tsx:228-247`
- [ ] C5 每个 `FieldLabel` 是否有 `htmlFor`/`id`？→ 反例 9/10 缺失
- [ ] C6 列定义是否随无关状态重建？是否该用 `table.options.meta`？→ 反例 `user-columns.tsx:101`
- [ ] C7 同一「不越界/派生」约束是否在多处重复实现？→ 反例 `user-list.tsx:120-125` 等 4 处
- [ ] C8 写操作是否该用 `useMutation` 而不是手写 `try/catch + invalidate + toast`？
- [ ] C9 `staleTime` 这类常量是否在 ≥3 个文件重复？→ 反例 `LOOKUP_STALE_MS` ×6
- [ ] C10 详情/编辑抽屉是否用 `enabled: open`（或等价机制）在打开时取最新？→ 本页 `use-user-detail.ts`

**D. 硬规则**
- [ ] D1 无 `font-mono`（模板示例代码除外）
- [ ] D2 `ui/**`、`calendar/**` 无改动
- [ ] D3 无 `title` / `role` / `aria-label`（`aria-invalid` 待裁决）
- [ ] D4 无原生 `<button>`/`<input>`/`<select>`/`<img>`/`<textarea>`；「重试」这类也要用 shadcn `Button` → 反例 3 处
- [ ] D5 无任意 hex/rgb/hsl/oklch；用语义 token 或 Tailwind 具名调色板

**E. 重复与组织**
- [ ] E1 同一段 JSX 结构（字段块、错误+重试块、骨架）是否重复 ≥3 次？该抽组件 → 反例字段块 ×10
- [ ] E2 单文件是否超 ~400 行且承担多个职责？→ 反例 `user-form-drawer.tsx` 571 行
- [ ] E3 是否残留 1 行转发壳 / 无消费者的导出？→ 反例 2 处
- [ ] E4 同类页面共有的细节（`CardHeader border-b`、`CardTitle leading-none`）是否漏了？→ 反例 `user-list.tsx:266,267`

**F. 状态与 URL**
- [ ] F1 loading / empty / error / disabled / overflow 五态齐全
- [ ] F2 「有旧数据 + 刷新失败」是否有可见提示？→ 反例 `user-table.tsx:82-83,116`
- [ ] F3 筛选/分页是否进 URL（`validateSearch`）？→ 反例 `route.tsx`

---

## 附：本次审计的方法与限制

- 通读范围内全部 15 个源文件与直接依赖；对 `ui/**` 的默认 class 串逐项比对；未修改任何源文件。
- 重复项、原生元素、`aria-*`/`title`/`role`、色值、`font-mono`、`closeFullscreen`/`toDeptTreeNodeData` 的消费者、
  `validateSearch` 分布，均由 grep 确认后写入。
- **未做运行时与视觉验证**：`pointer-events` 的键盘行为、骨架高度差这类结论，建议整改时实际验证一次。
