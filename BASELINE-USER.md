# BASELINE-USER.md — 用户管理页代码质量基线

审计对象：`src/routes/(main)/(app)/system/user/**`（15 文件 / 约 2,420 行）及其直接引用的共享层
（`components/status-cell.tsx`、`components/password-input.tsx`、`components/ui/{tree,tree-select}.tsx`、
`lib/api/{user,dept}.ts`、`lib/{data-table-features,query-keys,query-client,constants}.ts`、`hooks/use-fullscreen-transition.ts`）
审计基线：工作区（`59d3dac` 之后）
方法：3 个只读子代理分片深审（页面壳与状态层 / 列定义与选择器层 / 表单与对话框层）+ 机械扫描（原生元素、属性、class 覆盖、色值）+ 对争议结论回源码复核
限制：**未做运行时与视觉验证**（未跑 dev、未在浏览器操作）。所有"视觉后果"判断基于组件默认 class 串的静态比对。

本文件的定位：**用户管理是"质量基线"的第一个样本**。§8 的检查项清单可直接复用到其他页面。

维护约定：只描述**当前状态**。已修复的问题直接删除，不保留删除线、批注或修订记录（与 `AUDIT.md` 同一约定）。

---

## 1. 总体结论

**工程质量明显高于项目平均**：合规面（R1–R4）几乎干净，状态覆盖（loading/empty/error/disabled/overflow）齐全，TanStack Table v9 与 Query v5 的关键用法都对。问题集中在三类：

1. **共享层的越权覆盖**（`password-input.tsx` 改了 InputGroup 的高度，全局所有密码框都受影响）；
2. **"内联回调 + 根组件 state" 造成的整表重渲染**；
3. **同一件事写多遍**（常量、query 定义、表格外壳工具、错误重试块、字段块）。

| 维度 | 结论 | 关键证据 |
|---|---|---|
| 1 优雅性 | **中** — 拆分与命名尚可，但有 561 行单文件、5 组「id state + open state」、5 层嵌套三元 | `user-form-drawer.tsx`(561) / `user-list.tsx:58-68` / `user-table.tsx:54-68` |
| 2 冗余 | **中偏差** — 重复定义成片 | `LOOKUP_STALE_MS`×4、query 定义×3、表格外壳工具×8、`userLabel`×2、`Field` 字段块×10 |
| 3 库/框架最佳实践 | **中** — v9/Query 主用法正确，但 `meta` 未用、无 `useMutation`、无 `validateSearch` | `user-columns.tsx:101`（`meta` 未用） |
| 4 低效 | **中** — 搜索重渲染整表；该 memo 的没 memo | `user-list.tsx:53,242-250` |
| 5 性能 | **中** — 服务端分页 + 稳定行标识 + 稳定空数组都对；风险同上 | `user-list.tsx:39,100,176` |
| 6 原生 html 元素 | **3 处违规**（同一模式） | `user-form-drawer.tsx:470`、`user-assign-roles-dialog.tsx:177`、`user-role-select.tsx:77` |
| 7 shadcn class 覆盖 | **无典型违规**，但有 2 处纯冗余、3 类应收口 | 见 §6 |

合规面速览：`font-mono` **0**（R1 ✅）；`ui/**`、`calendar/**` 无改动（R2 ✅）；任意 hex/rgb/hsl/oklch **0** ✅；`title=`/`role=` **0** ✅。

---

## 2. 必修（高）

### 2.1 搜索框 state 在页面根，每敲一个键重渲染整张表

`user-list.tsx:53` 的 `searchInput` state 与 `:270-278` 的 `<InputGroupInput onChange={...}>` 都在 `UserList` 内。每次按键 → `UserList` 重渲染 → 整个 `tableSection`（最多 50 行 × 14 列 ≈ 700 个单元格）全部重渲染。

雪上加霜的是 `:242-250` 传给 `UserToolbar` 的 8 个回调全是内联箭头（`onCreate={() => {...}}`、`onRetry={() => void query.refetch()}`…），且 `UserToolbar`/`UserTable` 都没有 `React.memo` → 即使加了 memo 也拦不住。

修法：把搜索框拆成 `UserSearchInput`（本地 state + 防抖后回调），并给工具栏/表格的 props 配 `useCallback` + `React.memo`。

### 2.2 `password-input.tsx` 覆盖 InputGroup 高度 → 同表单控件高度不一致（**共享组件，影响全局**）

`src/components/password-input.tsx:15`：`<InputGroup className={cn('h-9', className)}>`，而 `ui/input-group.tsx:15` 的默认是 `h-8`。

| 字段 | 控件 | 实际高度 |
|---|---|---|
| 昵称 / 手机号 / 邮箱 / 描述 | `Input`（`ui/input.tsx:11` = `h-8`） | 32px |
| 性别 / 状态 / 部门 | `SelectTrigger`（= `h-8`） | 32px |
| **密码 / 确认密码** | **`PasswordInput`** | **36px** |

这是"改 shadcn 组件尺寸"最典型的后果，且因为改的是**共享组件**，所有用密码框的表单都有。二选一：删掉 `h-9`（以 h-8 为准），或反过来统一把表单控件都做成 h-9（那要改 `ui/**`，受 R2 约束）。

### 2.3 R4：3 处原生 `<button>` 重试，同一模式写三遍

| 位置 | 代码 |
|---|---|
| `user-form-drawer.tsx:470` | `<button type="button" className="underline" onClick={() => void depts.refetch()}>重试</button>` |
| `user-assign-roles-dialog.tsx:177` | 同上（`detail.refetch()`） |
| `user-role-select.tsx:77` | 同上（`roles.refetch()`） |

三处逐字同构，样式还各不相同（`text-xs text-destructive` / `text-sm text-destructive` / `px-2 py-1.5 text-sm text-destructive`）。应抽一个包装 shadcn `Button variant="link" size="sm"` 的 `QueryErrorRetry`。

⚠️ 同一写法在本目录外还有（`dept-list.tsx:259`、`menu-form-drawer.tsx:227/248/269` 等），只修这 3 处会造成新的不一致 → 整改范围需所有者定。

### 2.4 `status-cell.tsx` 抹掉枚举精度，且非 1 一律显示"禁用"

`src/components/status-cell.tsx:9`：`status?: number | null`，而 `lib/api/user.ts:4` 有 `UserStatus = 1 | 2`。后果：`undefined` / `null` / 将来新增的 `3` 都会静默渲染成"禁用"。

同文件 `user-display.tsx:6` 的 `GENDER_LABELS: Record<number, string>` 同理（`?? '未知'` 兜底会掩盖键名漂移）。对照正确写法：`user-display.tsx:12,17` 的 `genderLabel` 用 `UserResp['gender']`、`userLabel` 用 `Pick<UserResp, 'nickname' | 'username'>`。

---

## 3. 应修（中）

### 3.1 10 个字段里 8 个 `FieldLabel` 与控件无程序化关联

`user-form-drawer.tsx` 的 `:337/347/390/408/426/455/483/500` 都是 `<FieldLabel>昵称</FieldLabel>` + 控件，**既无 `htmlFor` 也无 `id`**。而同文件 `:368`、`user-reset-password-dialog.tsx:132/152`、`user-role-select.tsx:91/98` 都做对了 → 文件内不一致，且这 8 个字段的可访问名不成立。

### 3.2 561 行单文件，且 `Field` 字段块逐字重复 10 次

`user-form-drawer.tsx` 一个文件承担：schema、常量、53 行骨架、10 个字段、提交逻辑、布局。其中 `:336…:519` 的 `<Controller>` + `<Field className="gap-1.5" data-invalid>` + `<FieldLabel>` + 控件 + `<FieldError>` 结构重复 **10 次**，只有 name/label/控件类型不同 → 应抽 `FormFieldRow` 之类的包装。

### 3.3 重复定义（可上移）

| 重复物 | 份数 | 位置 |
|---|---|---|
| `LOOKUP_STALE_MS = 5 * 60_000` | **4 份定义 + 2 处裸字面量** | `dept-tree-select.tsx:9`、`user-role-select.tsx:12`、`user-form-drawer.tsx:73`、`user-assign-roles-dialog.tsx:31`；`user-list.tsx:107,113` 直接写 `5 * 60_000` |
| dept/role 的 `queryKey + queryFn + staleTime` | **3 份** | `user-list.tsx:104-114`、`dept-tree-select.tsx:72-77`、`user-role-select.tsx:33-38` → 抽 `useDeptTree()` / `useRoleDict()` |
| `getPageNumbers` / `preventPaginationNavigation` / `TableSkeletonRows` | **8 份**（跨页面） | `user-table.tsx:25,31,47` 等 7 个 `*-table.tsx` + 2 个 dashboard 文件 |
| `const name = user.nickname \|\| user.username` | 2 份 | `user-columns.tsx:32` 内联重写了 `user-display.tsx:17` 的 `userLabel` |
| `PASSWORD_PATTERN` | 2 份 | `user-form-drawer.tsx:67`、`user-reset-password-dialog.tsx:32` |
| `String(id) ↔ id` 映射 | 3 份 | `user-form-drawer.tsx:242-246`、`user-assign-roles-dialog.tsx:77-80`、`user-role-select.tsx:40-42` |
| 一行转发壳 | 1 份 | `-components/use-fullscreen-transition.ts:1`，唯一使用者 `user-list.tsx:15`，其余 7 个页面直接引 `@/hooks/...` |
| 同一组 6 个查询参数 | 3 遍 | `user-list.tsx:82-98`（key 与 fn 各写一遍）+ `:193`（导出再写一遍） |

### 3.4 列定义层

- **翻页重建全部 16 个列定义**：`createUserColumns(handleRowAction, rowOffset)`（`user-columns.tsx:101` + `user-list.tsx:162`），只为改序号列的 offset。v9 惯用法是模块级 `ColumnDef[]` + 经 `table.options.meta` 传 offset/onAction —— **本项目 `meta` 完全未用**。（澄清：`handleRowAction` 是稳定 `useCallback`，所以**不是**每次 render 重建，只在翻页时。）
- **`accessorKey` 是惰性的**：14 个列的 `cell` 一律读 `row.original.*`，无一处 `getValue()`；表头是纯字符串、无排序入口，服务端固定 `DEFAULT_SORT = 't1.id,desc'`。要么接排序 UI，要么改用 `id` 表达"仅用于可见性"。
- **4 个居中列的表头是左对齐**：`header: '序号'` 是字符串，而 `ui/table.tsx:48` 的 `TableHead` 默认 `text-left`，同列 cell 却写 `text-center`（`user-columns.tsx:105/108`、`123/125`、`132/133`、`157/159`）。`user-columns.tsx:193` 的操作列做对了（header 里包 `<div className="text-center">`）。
- 展示原语分居两个文件：`TextCell`/`NicknameCell` 在 `user-columns.tsx:27,31`，`RoleCell` 在 `user-display.tsx:34`。

### 3.5 分页"不越界"这一条不变量被 4 处同时钳制

`user-list.tsx:175`（`pageCount`）、`:170`（`rowCount`）、`user-table.tsx:89-90`（`Math.max(getPageCount(),1)` + `Math.min(pageIndex+1, pageCount)`）、`user-list.tsx:120-125`（兜底 effect）四处表达同一约束；而兜底 effect 是**先发一次越界请求再纠正**。`user-table.tsx:195` 的高亮还用了未钳制的 `pageIndex`，与 `:90` 不一致 → 越界瞬间无任何页高亮。

### 3.6 `aria-invalid` 11 处（待所有者拍板，非本页局部问题）

`user-form-drawer.tsx:338/355/375/398/416/434/508/529`、`user-reset-password-dialog.tsx:139/159`、`user-role-select.tsx:52`。

它**是功能性的**：`ui/input.tsx:11`、`ui/switch.tsx:16`、`ui/button.tsx:6` 的失效态样式（`aria-invalid:*`）与 `InputGroup` 的 `has-[[data-slot][aria-invalid=true]]` 都依赖它，删掉会同时丢视觉与语义。而 AGENTS.md 原文只点名 `aria-label`。**建议把规则收敛为"禁止 `aria-label`/`role`/`title`，`aria-invalid` 例外"**，并写进 AGENTS.md。整个 `(app)` 路由群都这么写，不是用户管理的问题。

### 3.7 无一处 `useMutation`，"进行中"有两套机制

5 个文件全是手写 `try/catch` + `invalidateQueries` + `toast`；`formState.isSubmitting`（表单）与 `useState(isDeleting)`（`user-delete-dialog.tsx:40`）两种"进行中"表达并存。

### 3.8 抽屉列表状态与 URL

- `user-list.tsx:58-68`：5 个弹层用「id state + open state」成对表达（靠注释解释语义）→ 可收拢为 `{ id, open }`。
- `route.tsx:5-7` 无 `validateSearch`，筛选/分页/关键词不进 URL，刷新与前进后退丢状态；同项目 `system/config/route.tsx:23`、`dashboard/file-manager/route.tsx:15`、`auth/login/route.tsx:11` 都有。

---

## 4. 轻微（低）

| 项 | 位置 | 说明 |
|---|---|---|
| 纯冗余 class | `user-table.tsx:118` | `hover:bg-muted/50` 与 `ui/table.tsx:35` 默认**逐字相同** |
| 纯冗余 class | `user-table.tsx:120`（骨架 `:53`） | `align-middle` 与 `ui/table.tsx:60` 默认相同（`py-4` 保留） |
| 纯冗余 class | `user-columns.tsx:36` | `<Avatar className="size-8">` 与 `ui/avatar.tsx:17` 默认相同 |
| 纯冗余 class | `user-detail-drawer.tsx:100` | `Skeleton … rounded-md` 与 `ui/skeleton.tsx:4` 默认相同 |
| 纯冗余 class | `user-role-select.tsx:98` | `Label … text-sm` 与 `ui/label.tsx:9` 默认相同 |
| 视觉不一致（同类页面都有，本页缺） | `user-list.tsx:266` / `:267` | `CardHeader` 独缺 `border-b`（dept/app/menu/role/config-storage 6 处都有）；`CardTitle` 独缺 `leading-none`（4 处都有） |
| 无收益的 `useCallback` | `user-list.tsx:127-129` | `reportPending` 只传给未 memo 的 `UserToolbar` |
| 无消费者的导出 | `hooks/use-fullscreen-transition.ts:146` | `closeFullscreen` 全库无引用 |
| 骨架行数不匹配 | `user-table.tsx:50` | 固定 5 行，而默认 `pageSize` 是 10 → 加载前后高度跳变 |
| 命名误导 | `hooks/use-fullscreen-transition.ts:23-25,141` | 返回的 `isFullscreen` 实为 `isActive`（closing 阶段也为 true；`user-list.tsx:284,286` 依赖该行为，属有意，仅命名问题） |
| 命名与注释 | `user-table.tsx:82-83` | `isStale` 实为 `isPlaceholderData`；注释称"refetch failed"但实参只有 placeholderData，且 `:116` 的分支只在无行时展示 → "有旧数据 + 刷新失败"完全不可见 |
| 5 层嵌套三元 | `user-table.tsx:54-68` | 骨架宽度应改查表数组 |
| 可见文案不随状态变化 | `user-toolbar.tsx:102-105` | 图标在 Maximize/Minimize 切换，文案恒为「表格全屏」（R3 下可见文本是唯一标签） |
| 选项用魔法字符串 | `user-list.tsx:42-46` | `{ value: '1', label: '启用' }` + `:185 Number(value) as UserStatus`，应由 `UserStatus` 派生 |
| 预热查询丢弃返回值 | `user-list.tsx:104-114` | 用 `queryClient.ensureQueryData` 语义更明确（`use-menu.ts:52,58` 已有此写法） |
| `rowCount` 与 `pageCount` 二选一 | `user-list.tsx:170-172` | v9 `manualPagination` 推荐 `rowCount` |
| rAF 未取消 | `hooks/use-fullscreen-transition.ts:96-108` | 卸载时未 `cancelAnimationFrame` |
| `href="#"` 当按钮用 | `user-table.tsx:181,193,211` | `Pagination*` 由 `ui/pagination.tsx:39-42` 渲染成 `<a>`，不违反 R4，但语义是锚点 |

---

## 5. 维度 7 专项：shadcn class 覆盖总账

**定量**：范围内 shadcn 组件标签出现 **228 次**，其中 **113 次带 `className`（49.6%）**。

**关键结论：没有"无理由抵消默认样式"的典型违规。** 全目录 grep 未出现 `border-0` / `bg-transparent` / `dark:bg-transparent` / `focus-visible:ring-0` / `shadow-none` 这类"抵消三件套"（唯一一例是 `user-table.tsx:51` 骨架行的 `hover:bg-transparent`，且全项目 8 处一致）。

分类：

| 类别 | 数量 | 代表 |
|---|---|---|
| **合法**（布局/尺寸/定位适配，或用组件自带 prop） | 多数 | `SelectTrigger size="sm"`、`SelectContent alignItemWithTrigger={false}`（用 prop 而非改类，**正面样板**）、`DialogContent max-h-[calc(100dvh-2rem)] overflow-y-auto`、`Pagination className="mx-0 w-auto justify-start md:justify-end"`、`Card className="pb-0"` + `CardContent px-0`（表格通栏）、`CardHeader has-data-[slot=card-action]:grid-cols-1 md:…`（响应式，**合法**） |
| **纯冗余**（写的值与默认逐字相同） | **5 处** | 见 §4 前 5 行 |
| **可疑**（覆盖默认但全项目一致 / 有对齐理由） | 6 类 | `TableHead font-normal`（抵消 `font-medium`，全项目 7 处）、`InputGroup h-7`（与 `size="sm"` 的 h-7 对齐，全项目 6 处）、`PopoverContent gap-0 p-1`（默认 `gap-2.5 p-2.5`，`tree-select.tsx:182` 有先例）、`Label/Badge/Button font-normal`（抵消 `font-medium`）、`Skeleton rounded-full`（模拟徽章形状）、`DrawerHeader/DrawerFooter` 的主轴与内边距覆盖 |
| **穿透选择器** | 2 处 | `user-table.tsx:99` 的 `**:data-[slot='table-cell']:px-4`（全项目 8 处同写法）、`user-table.tsx:103` 的 `[&_tr]:border-t`（与默认 `[&_tr]:border-b` 叠加成双线） |
| **违规** | **0** | — |

**一个系统性信号**：`font-normal` 覆盖 `font-medium` 至少 **3 处**（`TableHead` / `Label` / `Badge`），说明本页（乃至全项目）的设计意图与 base-nova 默认字重不同。这是**口径问题**：要么承认并统一，要么去掉这些覆盖 —— 需所有者裁决。

`user-table.tsx:99` 的穿透其实可以去掉：既然 `:107`/`:120` 已经给 `TableHead`/`TableCell` 直接传了 className，`px-4` 写在那里即可，不必用 `**` 全局穿透。

---

## 6. 做得好的地方（基线正面样板）

| 项 | 位置 | 为什么好 |
|---|---|---|
| 用组件自带变体而不是改类 | `user-list.tsx:221`、`user-table.tsx:158`（`SelectTrigger size="sm"`）、`user-list.tsx:225`（`SelectContent alignItemWithTrigger={false}`） | 这正是"定制只能在调用点用 props/className"的正确形态 |
| `invalid` prop 而非 `aria-invalid` | `dept-tree-select.tsx:100` | 把 aria 留给 `ui/` 内部，是 R3 想要的做法（与 `user-role-select.tsx:52` 形成正反对照） |
| v9 表格用法 | `user-list.tsx:164-177`（`manualPagination`/`rowCount`/`pageCount`/`autoResetPageIndex:false`/`getRowId`/受控 `state`）、`user-table.tsx:108,121`（`<table.FlexRender />`） | 关键项全对 |
| Query 细节 | `user-list.tsx:39-40`（`EMPTY_ROWS` 稳定空数组）、`:100`（`placeholderData: previous => previous` 翻页保留上一页）、`:176`（`getRowId`） | 避免行模型重建与闪空 |
| 模块级纯函数/常量 | `user-table.tsx:25,31,47`、`user-columns.tsx:27,31,45`（cell 渲染器全模块级）、`GENDER_ITEMS` 模块级 | 无 per-render 组件身份变化 |
| 不重复维护列标题映射 | `user-toolbar.tsx:81` 直接复用 `column.columnDef.header` | dept/menu 各有一份平行 `COLUMN_LABEL_MAP`（反例） |
| 精确失效 | `user-reset-password-dialog.tsx:93-95` 只失效 `userKeys.detail(user.id)` 并写明理由 | 比 `userKeys.all` 精准 |
| 组件归位 | `status-cell.tsx`/`password-input.tsx` 被多特性复用 → `src/components/`；`dept-tree-select.tsx`/`user-role-select.tsx` 仅本路由用 → `-components/` | 符合"复用即上移" |
| 状态覆盖齐全 | 骨架 `user-table.tsx:126-127`、空态 `:141`、错误+重试 `:131-138`、禁用 `user-toolbar.tsx:62,66`、overflow（`ui/table.tsx:6` + 抽屉 `overflow-y-auto overscroll-contain`） | AGENTS.md 第 12 条要求 |
| 编辑态查询失败**有** `isError` 分支 | `user-form-drawer.tsx:553-554` | 不会渲染默认值空表单覆盖原记录（该缺陷只在 `client/sms-form-drawer` 存在） |
| 全屏 FLIP 单 DOM 树 | `hooks/use-fullscreen-transition.ts:9-15,27-138` | 依赖数组正确、Escape 与定时器都有清理 |
| 路由极简 | `route.tsx`（7 行） | 只做组合 |

---

## 7. 需要所有者裁决（按优先级）

1. **`aria-invalid` 口径**（11 处）：它是 `ui/**` 失效态样式的功能钩子，删掉会丢视觉与语义。建议在 AGENTS.md 写成"禁止 `aria-label`/`role`/`title`，`aria-invalid` 例外"。（全项目性问题）
2. **表单控件高度基准**：以 `h-8` 为准（删 `password-input.tsx:15` 的 `h-9`），还是以 h-9 为准（要动 `ui/**`）？同表单现在 32px/36px 混排。
3. **`font-normal` 覆盖 `font-medium`**（TableHead/Label/Badge 等 ≥3 处）：承认并统一，还是去掉？
4. **穿透选择器**（`user-table.tsx:99` 的 `**`、`:103` 的 `[&_tr]:border-t`，全项目 7–8 处一致）：判为需整改就要全局统一。
5. **原生 `<button>` 整改范围**：只修本页 3 处，还是按目录统一（`dept-list.tsx:259`、`menu-form-drawer.tsx:227/248/269` 等同款）？
6. **列排序**：接服务端排序（加 handler + 改用 `row.getValue`），还是承认 `accessorKey` 只当 id 用？
7. **`route.tsx` 是否加 `validateSearch`**：筛选/分页/关键词进 URL（同类页面已有先例）。
8. **8 处重复的表格外壳**是否抽 `DataTable`：与 AGENTS「不要预先抽公共」的取舍。
9. **分页禁用用 `pointer-events-none opacity-50` 模拟**、`PaginationLink` 用 `href="#"`：接受现状，还是给 `ui/pagination.tsx` 加上 disabled 能力（触碰 R2，需上游化）？

---

## 8. 质量基线检查项（可复用到其他页面）

> 用法：新页面/新模块 review 时逐条过。每条都标注了本页的**反例**，便于对照。

**A. 共享组件**
- [ ] A1 共享组件里是否覆盖了 shadcn 组件的**尺寸/圆角/边框/背景/焦点环**？→ 反例 `password-input.tsx:15` 的 `h-9`
- [ ] A2 共享组件里是否有 `aria-label`（它不在 `ui/**` 内就不豁免）？→ 反例 `password-input.tsx:23`

**B. class 覆盖（`ui/**` 只能在上游改，调用点只做适配）**
- [ ] B1 有没有与组件默认值**逐字相同**的冗余类？→ 反例 `user-table.tsx:118,120`、`user-columns.tsx:36`、`user-detail-drawer.tsx:100`、`user-role-select.tsx:98`
- [ ] B2 有没有 `**:data-[slot=…]` / `[&_tr]:…` 这类穿透？能否改为直接传 className？→ 反例 `user-table.tsx:99,103`
- [ ] B3 覆盖字重/字号（`font-normal`、`text-xs`）是否有统一口径？→ 反例 `user-table.tsx:107`
- [ ] B4 能用组件自带 prop/变体（`size`、`align`、`variant`）就不改类？→ 正例 `SelectTrigger size="sm"`

**C. React / Query / Table**
- [ ] C1 输入框 state 是否放在会重渲染大列表的组件里？→ 反例 `user-list.tsx:53`
- [ ] C2 传给子组件的回调是否内联箭头 + 子组件未 memo？→ 反例 `user-list.tsx:242-250`
- [ ] C3 关于"什么时候会重新取数"的注释，是否与 `lib/query-client.ts` 的全局开关一致？（三个自动重取开关全为 false，别把刷新归功于它们）
- [ ] C4 表单回填若用 effect + `reset`，是否满足两条：① 数据稳定前不渲染表单；② 已填过一次就不再覆盖？（更彻底的做法是 RHF `values` 或 `key` 重挂载）→ 本页现状 `user-form-drawer.tsx:228-246` + `:338`
- [ ] C5 每个 `FieldLabel` 是否与控件有 `htmlFor`/`id`？→ 反例 `user-form-drawer.tsx` 8/10 缺
- [ ] C6 列定义是否随无关状态重建？是否该用 `table.options.meta`？→ 反例 `user-columns.tsx:101`
- [ ] C7 同一"不越界/派生"约束是否在多处重复实现？→ 反例 `user-list.tsx:120-125` 等 4 处
- [ ] C8 是否该用 `useMutation` 而不是手写 `try/catch + invalidate + toast`？
- [ ] C9 `staleTime` 这类常量是否在 ≥3 个文件重复？→ 反例 `LOOKUP_STALE_MS` ×4
- [ ] C10 详情/编辑这类"打开就为了看或改这一条记录"的抽屉，是否用 `enabled: open` + `alwaysRefetch` 在打开时取最新？（全局三个自动重取开关都关着，不这么做就只能一直读第一次的缓存）→ 本页三个消费者已统一：`use-user-detail.ts` 的 `enabled`/`alwaysRefetch`

**D. 硬规则**
- [ ] D1 R1 无 `font-mono`（模板示例代码除外）
- [ ] D2 R2 `ui/**`、`calendar/**` 无改动（`git status --porcelain -- src/components/ui src/components/calendar` 应为空）
- [ ] D3 R3 无 `title` / `role` / `aria-label`（`aria-invalid` 待裁决）
- [ ] D4 R4 无原生 `<button>`/`<input>`/`<select>`/`<img>`/`<textarea>`；"重试"这类也要用 shadcn `Button` → 反例本页 3 处
- [ ] D5 无任意 hex/rgb/hsl/oklch；用语义 token 或 Tailwind 具名调色板

**E. 重复与组织**
- [ ] E1 同一段 JSX 结构（字段块、错误+重试块、骨架）是否重复 ≥3 次？该抽组件 → 反例 `user-form-drawer.tsx` 字段块 ×10
- [ ] E2 单文件是否超 ~400 行且承担多个职责？→ 反例 `user-form-drawer.tsx` 561 行
- [ ] E3 是否残留 1 行转发壳 / 无消费者的导出？→ 反例 `-components/use-fullscreen-transition.ts`、`closeFullscreen`
- [ ] E4 同类页面共有的细节（`CardHeader border-b`、`CardTitle leading-none`）是否漏了？→ 反例 `user-list.tsx:266,267`

**F. 状态与 URL**
- [ ] F1 loading / empty / error / disabled / overflow 五态齐全
- [ ] F2 "有旧数据 + 刷新失败" 是否有可见提示？→ 反例 `user-table.tsx:82-83,116`
- [ ] F3 筛选/分页是否进 URL（`validateSearch`）？→ 反例 `route.tsx`

---

## 附：本次审计的方法与限制

- 三个只读子代理分片通读：①`route.tsx`/`user-list`/`user-toolbar`/`user-table`/`use-user-detail`/`data-table-features`/`hooks/use-fullscreen-transition` ②`user-columns`/`user-display`/`dept-tree-select`/`user-role-select`/`status-cell`/`password-input` ③5 个 drawer/dialog。均未修改任何文件。
- 机械扫描由本报告作者执行：原生元素、`aria-*`/`title`/`role`、色值、`font-mono`，以及"标签名 ↔ shadcn 来源"配对的 class 覆盖扫描（含组件默认 class 串比对）。
- **回源码复核了 2 条争议结论**并已修正：
  1. `user-list.tsx:266` 的 `CardHeader` 覆盖**不是违规**——`has-data-[slot=card-action]` 是 Card 官方暴露的钩子，且用户代码是在加响应式断点（移动端 1 列 / md+ 2 列），与默认的"全宽 2 列"不同，属有意行为变更。
  2. "一帧空表单可提交空值"**降级为"视觉闪烁"**——`useEffect` 在绘制后运行，提交窗口约一帧，不构成实际风险。
- 未做：运行时验证、浏览器视觉验证、`pnpm typecheck/lint/build`（只读审计未运行）。
