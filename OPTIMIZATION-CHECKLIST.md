# OPTIMIZATION-CHECKLIST.md — 优化清单

生成日期：2026-10-19
来源：`AUDIT.md`（项目级，基线 `ce44df6`）＋ `BASELINE-USER.20261018.md`（用户管理页快照，2026-10-18）
核验方式：3 个只读子代理分片回源核验 ＋ 机械扫描独立复算（业务代码 163 文件、相同行占比重算）
**未做运行时与视觉验证**（未跑 dev、未在浏览器操作），所有"视觉后果"类结论均为静态推断。

- 路径口径：相对 `continew-ui-next/`
- 行号口径：**含空行的物理行号**
- 核验标记：**✓** 已回源核实行号 ｜ **△** 结论成立但行号需现场 `grep` 确认 ｜ **✗** 来源报告有误，本文件已按实测修正
- 维护约定：只描述**当前状态**；已完成的项直接删除，不保留删除线或修订记录（与 `AUDIT.md` 同一约定）；编号为稳定标识，删除条目后不重排，以免打断既有引用

---

## 0. 来源报告与相互关系

| 文件 | 定位 | 与当前代码的关系 |
|---|---|---|
| `AUDIT.md` | 项目级审计（581 行，基线 `ce44df6`） | 主体准确，但 **6 处行号/条目有误**（见 §1.2） |
| `BASELINE-USER.20261018.md` | 用户管理页快照（2026-10-18） | **与当前代码一致**（571 行等硬指标全对），但 **13 处行号有误** |
| `BASELINE-USER.md` | 用户管理页旧稿（2026-10-17） | **已过期，不应作为工作依据** |

旧稿过期证据（实测 vs 旧稿）：文件 571 行 vs 561 行；`LOOKUP_STALE_MS` ×6 vs ×4；`FieldLabel` 缺失 9/10 vs 8/10；重试按钮 `user-form-drawer.tsx:480` vs `:470`；其引用的 `use-user-detail.ts` 的 `alwaysRefetch` 选项已不存在（现为 `staleTime: 0` + `skipToken`）。

**结论：本清单只依据 `AUDIT.md` 与 `BASELINE-USER.20261018.md`。**

---

## 1. 对来源报告的评价

### 1.1 复核后认可的部分

| 报告的量化断言 | 复核方式 | 结果 |
|---|---|---|
| 硬规则计数（业务代码 163 文件） | 独立重跑 case-sensitive 扫描 | `font-mono` 0、原生 `<button>` 18、`<input>` 2、`<img>` 6、`<textarea>`/`<select>` 0、`aria-invalid=` 56、DOM `role=` 8、DOM `title=` 13（净 8）——**与 `AUDIT.md` §2.1 完全一致**；仅 `aria-label` 实测 **32** 处（报告写 33，`header-tabs.tsx` 实际 1 处而非 2 处） |
| 表格外壳"94.3%–96.2% 相同" | 按去空行逐行重算相同行占比 | 96.2 / 96.0 / 94.8 / 94.3 —— **四项吻合**；工具栏 79.8%（报告 78）、dept↔menu 列表 70.5%（报告 65.7）、parent-select 67.7%（**完全一致**） |
| 重复项份数 | 逐文件 grep | `getPageNumbers` 7 份、`preventPaginationNavigation` 9 份、`PAGE_SIZE_OPTIONS` 5 份、`TableSkeletonRows` 7 份 —— **份数成立** |
| 正确性缺陷 §4-1～4-4 | 回源逐条验证 | **4/4 成立**，含最关键的 `role-user-drawer` 失效键结构不等 |
| §11 高危 3 条（硬编码口令、401 双 toast、先取菜单后鉴权） | 回源验证 | **全部成立** |
| 死代码：`ui/**` 14 文件、`(legacy)` 25 文件 | 全仓引用扫描 | **14/14 零引用成立**；legacy 仅被 `routeTree.gen.ts` 登记 |
| 用户页快照 16 组断言 | 逐条比对 | 绝大多数成立（571 行、`LOOKUP_STALE_MS` ×6、3 处原生按钮及三种样式、9/10 `FieldLabel` 缺失、分页 4 问题、`isStale` 语义错位等） |

方法学也值得认可：有口径说明（§0）、有误报剔除清单（§1.3）、有 `[已复核]` 标记、明确声明未做运行时验证。

### 1.2 需修正 / 不认可的部分

1. **行号漂移是系统性的**（不是个别笔误）。
   - `AUDIT.md` 6 处：`user-form-drawer.tsx:470`→**480**、`storage/display.tsx:41,46,60`→**39,44,58**、`app-display.tsx:73`→**59**、`menu-list.tsx:259`→**256**、`header-tabs.tsx:200`→**197**、`user-list.tsx:18`→**15**。
   - `BASELINE-USER.20261018.md` 13 处，最严重：`user-delete-dialog.tsx:249`（**该文件仅 102 行**，`isDeleting` 在 `:40`）、`user-assign-roles-dialog.tsx:376`→**190**、`user-role-select.tsx:203`（**该文件没有 `new Map(`**）。
2. **"逐字重复"有夸大**：`TableSkeletonRows` 7 份里**只有 `menu-table.tsx:10` 与 `dept-table.tsx:10` 一对逐字相同**，其余 5 份列宽各异；`user-form-drawer.tsx` 的"9 段相同骨架""10 段结构相同"实际宽度/结构有差异。方向成立，但按"逐字"设计公共接口会踩空。
3. **2 条"按模式推断"造成的误报，已从清单剔除**：`AUDIT.md` §7.5 的 `user-table.tsx:118` 的 `row.getIsSelected()`（该文件全文无此调用）与 `use-user-detail.ts:36-39` 的 `if (id === null) throw`（已改用 `skipToken`，在 `:29`）。另 `dept-table`/`menu-table` 的 `getIsSelected()` 在 **`:75`** 而非 `:70`。
4. **报告共同的空白（本清单已补）**：`user-list.tsx:110-114` 的 role 字典查询（快照 §3.2 漏列，实际 role 查询共 4 处）。

### 1.3 与报告不同的三点意见

1. `AUDIT.md` §7.1 把"删 `ui/**` 14 文件"称为"零风险"——**不同意**。它与 R2「保持上游原样」直接冲突，`shadcn add` 还会回灌。建议**只标注不删**。
2. **优先级要调**：`AUDIT.md` 批次 1 把"硬编码 `admin/admin123`"排第 5，但它可能是**有意的演示预填**（需所有者确认）；而"配置面板静默把默认值写回后端"这类**数据损坏**项应更靠前——已放进 P0。
3. **抽 `DataTable` 方向认可**（94–96% 是硬证据），但报告把它当"顺手做的批次 4"。实际 `role` 表是客户端分页、`dept/menu` 是树表，**必须先定接口契约**，应作为独立里程碑。

---

## 2. 优化清单

### P0 正确性与数据安全（先做）

| # | 事项 | 文件:行号 | 动作 | 核验 |
|---|---|---|---|---|
| 3 | 编辑态详情加载失败渲染空表单，保存覆盖原记录 | `system/config/-components/client/form-drawer.tsx:147,257`、`sms/form-drawer.tsx:206,230`；范例 `storage/form-drawer.tsx:736` | 照 `storage/form-drawer` 补 `isError` | ✓ |
| 4 | 删除守卫读的是**搜索过滤后**的树，可删含子部门的节点 | `system/dept/-components/dept-delete-dialog.tsx:27`、`dept-list.tsx:51-56,164`；同构 `system/menu/-components/menu-delete-dialog.tsx:27` | 用原始树判定 | ✓ |
| 5 | 导出只把关键词当 `description` 传后端，导出结果 ≠ 当前筛选 | `system/dept/-components/dept-list.tsx:180`（列表匹配 `name` 见 `:38-39`） | 导出参数与筛选口径对齐 | ✓ |
| 6 | 权限树加载失败静默显示空树（`permTree.isError` 从未读取） | `system/role/-components/role-permission-drawer.tsx:105,128-157` | 补错误态＋重试 | ✓ |
| 7 | 401 连弹两条相同 toast（叠加 `retry: 1` 放大） | `src/lib/http.ts:220-221`、`src/lib/query-client.ts:21`、`src/stores/auth/auth-provider.tsx:45` | handler 已上报时传 `silent` | ✓ |
| 8 | 未登录深链先发 `GET /auth/user/route` 再鉴权（与注释相反） | `src/components/app-shell/index.tsx:49-50`（注释在 `:45`） | `requireAuth` 提到 `ensureMenuLoaded` 之前 | ✓ |
| 9 | Cookie 写侧不编码、读侧 `split('=')[1]`，值含 `=`/`;` 会读错 | `src/lib/cookie.ts:10,17`；消费者 `src/routes/(main)/mail/-components/mail.tsx:68` | `encodeURIComponent` ＋ `slice(key.length+1)` ＋ decode | ✓ |
| 10 | 硬编码预填超管账号口令 | `src/routes/(main)/auth/-components/login-form.tsx:37-38` | **先确认是否有意**；再删或改环境变量 | ✓ |
| 11 | `<span>` 直接作 `<ul>` 子元素（HTML 非法） | `system/role/-components/role-user-drawer.tsx:343`、`src/components/ui/pagination.tsx:20` | 包 `PaginationItem` | ✓ |
| 12 | 「展开全部/折叠全部」判定错误（任一展开即视为全展开） | `system/dept/-components/dept-list.tsx:199-207`、`system/menu/-components/menu-list.tsx:198-206` | 按全部节点判定 | ✓ |
| 13 | 展开态被 `data` 身份变化重置，丢弃用户折叠操作 | `system/role/-components/role-checkable-tree.tsx:50-54` | 改用稳定 key 依赖 | ✓ |
| 14 | 日历禁用放宽到"昨天"，zod 要求未来时间 | `open/app/-components/app-form-drawer.tsx:307` vs `:29-33` | 禁用范围与 schema 对齐 | ✓ |
| 15 | `h-dvh` 用在 app-shell 内，多出约一屏滚动 | `src/routes/-components/not-found.tsx:7` | 改屏内高度 | ✓ |
| 16 | `passwordExpiryNotified` 永不重置，换账号不再提示 | `src/stores/auth/auth-provider.tsx:18,30-34` | 清会话/登录成功时复位 | ✓ |
| 17 | `staleTime: 0` 覆盖同 query 自己声明的 5 分钟 | `src/hooks/use-menu.ts:52` vs `:24` | 用短阈值或 `invalidateQueries` | ✓ |
| 18 | 刷新后再 401 不走会话失效，与 `send` 不一致 | `src/lib/http.ts:316-334` vs `:217-222` | 统一走 `handleSessionExpired` | ✓ |
| 19 | 删除对话框手写 destructive 样式；删除中仍可 Esc/遮罩关闭 | `system/config/-components/client/delete-dialog.tsx:51,40` | 用 `variant="destructive"` ＋ `isDeleting` 守卫 | △ |
| 20 | 上传无大小上限、base64 直接写进配置项，而 `uploadFile()` 已存在 | `system/config/-components/image-upload-field.tsx:39-49`、`src/lib/api/common.ts:22` | 改用 `uploadFile()` ＋ 大小校验 | ✓ |

### P1 性能

| # | 事项 | 文件:行号 | 动作 | 核验 |
|---|---|---|---|---|
| 21 | `import { icons }` 全库图标 ＋ 模块作用域全量扫描，打开菜单页即付全量代价 | `system/menu/-components/icon-picker.tsx:3,368-393` | 去运行时索引，改白名单＋按需 | ✓ |
| 22 | 运行时 `icons` 全量对象索引，破坏 tree-shaking | `src/navigation/sidebar/menu-icons.ts:132,327` | 只保留 `MENU_ICONS` 映射 | ✓ |
| 23 | 用户搜索无防抖，每次按键发一次请求 | `system/role/-components/role-user-add-dialog.tsx:51,115`；范例 `system/user/-components/user-list.tsx:75-82` | 复用 300ms 防抖 | ✓ |
| 24 | 搜索框 state 在页根：每敲一键重渲染整表（≤50×16 单元格）；回调全内联且子组件无 `React.memo` | `system/user/-components/user-list.tsx:53,242-250,258,274-278`、`user-toolbar.tsx`、`user-table.tsx` | 抽 `UserSearchInput` ＋ `useCallback` ＋ `memo` | ✓ |
| 25 | `useCallback` 依赖整个 `useMutation` 对象，列模型每帧重建 | `system/config/-components/sms/config-sms.tsx:164`、`storage/config-storage.tsx:144` | 依赖 `mutation.mutate` | ✓ |
| 26 | 两个 `useMemo` 实际每帧重算（`usePermission` 每次返回新闭包） | `system/config/route.tsx:93-103` | 稳定依赖 | ✓ |
| 27 | 列定义依赖瞬时状态 `isUnassigning`，每次取消授权重建整表 | `system/role/-components/role-user-drawer.tsx:124,203` | 移出依赖 | ✓ |
| 28 | 每行重新解析日期 / 每次渲染重建掩码 | `open/app/-components/app-display.tsx:36`、`app-secret-dialog.tsx:49` | 预格式化 / `useMemo` | △ |
| 29 | `formatCurrency` 每次调用新建 `Intl.NumberFormat` | `src/lib/utils.ts:34` | 按组合缓存实例 | △ |
| 30 | `groupBy` 对每个分组重扫整表（O(n·g)） | `src/components/app-shell/header/search-dialog.tsx:58-64` | 一次遍历归组 | △ |
| 31 | `useBreadcrumbTrail()` 同帧调两次，菜单树遍历两遍 | `src/components/app-shell/index.tsx:57`、`app-breadcrumb.tsx:129` | 提到 shell 层下传 | △ |
| 32 | 同帧两次 `getVisibleLeafColumns()` | `open/app/-components/app-table.tsx:127,130` | 提局部变量 | △ |

### P2 结构性重复：抽公共层

| # | 事项 | 文件:行号 | 动作 | 核验 |
|---|---|---|---|---|
| 33 | 7 份表格外壳（相同行 94.3–96.2%，已复算吻合） | `system/user/-components/user-table.tsx`、`open/app/-components/app-table.tsx`、`system/role/-components/role-table.tsx`、`system/config/-components/client/table.tsx`、`sms/table.tsx`、`system/dept/-components/dept-table.tsx`、`system/menu/-components/menu-table.tsx` | 建 `src/components/data-table/` 泛型外壳；**先定接口契约** | ✓ |
| 34 | 表格工具散落：`getPageNumbers` 7 份、`preventPaginationNavigation` 9 份、`PAGE_SIZE_OPTIONS` 5 份、`TableSkeletonRows` 7 份（仅 `menu-table.tsx:10`＝`dept-table.tsx:10` 逐字） | 5 个 `*-table.tsx` 的 `:23,25,31,47/48`；另 2 份在 `src/routes/(main)/dashboard/users/-components/users-table.tsx:25`、`dashboard/tasks/-components/tasks.tsx:39`；内联 1 份 `dashboard/crm/-components/opportunities-section.tsx:82-91`；已共享范例 `dashboard/ecommerce/-components/recent-orders-table/formatters.ts:29` | 提到 `src/lib/`；`TableSkeletonRows` 按列宽参数化 | ✓ |
| 35 | 8 份工具栏（user↔role 79.8%） | user / role / app / client / sms / storage / dept / menu 的 `-toolbar.tsx` | 抽 `DataTableToolbar` ＋ 插槽 | ✓ |
| 36 | 6 份删除对话框，loading 三种写法（`useState`×5、`useMutation`×1） | `user/role/app/client/sms/storage` 的 `*-delete-dialog.tsx` | 抽 `ConfirmDeleteDialog` | △ |
| 37 | 6 份剪贴板实现（各写 `COPIED_FEEDBACK_MS`，`sms/columns` 那份无 try/catch） | `open/app/-components/app-display.tsx:14`、`app-detail-drawer.tsx:16`、`app-secret-dialog.tsx:28`、`system/user/-components/user-detail-drawer.tsx:16`、`system/config/-components/client/detail-drawer.tsx:22`、`sms/columns.tsx:56` | 抽 `CopyField` / `useCopyToClipboard` | ✓ |
| 38 | 列表页状态逻辑逐字复制（防抖/越界回退/全屏容器） | `open/app/-components/app-list.tsx:58-65,88-93,222-226` vs `system/user/-components/user-list.tsx:75-82,123-128,288-292` | 抽 `useDebouncedKeyword` / `usePageBoundsCorrection` / `TableFullscreenContainer` | ✓ |
| 39 | 空状态手写 17+ 处，而 `ui/empty.tsx` 全项目只用 1 次 | 6 个表格 ＋ `system/config/-components/sms/table.tsx:138`、`storage/group-panel.tsx:158`、`system/user/-components/user-role-select.tsx:82` 等 | 抽 `TableEmptyState`（内部用 `ui/empty.tsx`） | △ |
| 40 | `dept` 与 `menu` 是双胞胎模块（列表 70.5%、parent-select 67.7%），且已分叉 | `system/dept/-components/dept-list.tsx` ↔ `system/menu/-components/menu-list.tsx`、`dept-parent-select.tsx` ↔ `menu-parent-select.tsx`；分叉证据 `menu-form-drawer.tsx:170` vs `dept-form-drawer.tsx:150` | 合并为泛型树表模块 | ✓ |
| 41 | 基础层重复：21 条路由标题表、`matchMedia` 两套、`closeAllTabs`＝`resetTabs`、主题清单两份、预设标签构建两遍 | `app-shell/app-breadcrumb.tsx:27-49` ↔ `app-shell/header/header-tabs.tsx:19-41`；`src/hooks/use-lg.ts:5-19` ↔ `use-mobile.ts:5-19`；`src/stores/tabs.ts:103-107,109-111`；`app-shell/header/theme-switcher.tsx:8` ↔ `src/lib/preferences/theme.ts:7`；`app-shell/header/layout-controls.tsx:33-46,83-95` | 收口到 `src/navigation/`、`useMediaQuery` 等 | △ |
| 42 | config 面板内部剩余重复：选项→label map ×5、client 字段格式化 ×2、`queryKey`＋`queryFn` 各写一遍（表单式 4 个面板的 option→form 同步与保存/恢复逻辑现由 `-components/use-option-form.ts` 提供） | `system/config/-components/client/config-client.tsx:112-142`、`sms/config-sms.tsx:96-102,106-118`、`storage/config-storage.tsx:94-95`、`client/detail-drawer.tsx:119-165` ↔ `client/columns.tsx:255-322` | 抽格式化器 | △ |
| 43 | 用户页内部重复：`LOOKUP_STALE_MS` ×6、dept 树查询 ×3、role 字典查询 ×4、`PASSWORD_PATTERN` ×2、`String(id)` Map ×3、`userLabel` ×2、一行转发壳 | `system/user/-components/dept-tree-select.tsx:9,72-77`、`user-role-select.tsx:12,33-38`、`user-form-drawer.tsx:67,73,209-214,217,251,253`、`user-assign-roles-dialog.tsx:31,70-74,77-80`、`user-list.tsx:104-114`、`user-reset-password-dialog.tsx:32`、`user-display.tsx:18`、`user-columns.tsx:32`、`-components/use-fullscreen-transition.ts` | 抽 `useDeptTree()` / `useRoleDict()`，常量上移 | ✓ |
| 44 | 密码提示文案漂移（一处"小写字母"，一处"字母"） | `system/user/-components/user-form-drawer.tsx:70` vs `user-reset-password-dialog.tsx:141` | 由同一常量派生 | ✓ |
| 76 | 4 个表单式面板的头部操作区（修改/保存/重置/取消）与「恢复默认」确认框逐字重复（约 55 行 × 4） | `system/config/-components/config-{site,security,login,mail}.tsx` 的头部按钮区与末尾 `AlertDialog` | 抽 `ConfigPanelHeader` ＋ `ConfigResetDialog`（**新增建议，待裁决**） | ✓ |
| 79 | 站点面板内联约 200 行预览 mockup（含 3 处原生 `<img>`，均用于预览 mockup；AUDIT §9 / §3.4） | `system/config/-components/config-site.tsx`（mockup 部分） | 抽 `site-preview.tsx`；原生 `<img>` 只留在包装内部 | △ |
| 80 | 必填标记 `*` 仍在 6 个表单抽屉里硬编码（约 29 处） | `system/config/-components/{client,sms,storage}/form-drawer.tsx`、`system/{dept,menu}/-components/*-form-drawer.tsx`、`open/app/-components/app-form-drawer.tsx` | 统一用 `system/config/-components/required-mark.tsx` 的 `RequiredMark`，规则由各表单 schema 派生 | ✓ |
| 82 | 把 `TableSearch` 推广到其余表页（7 处搜索框），并顺带修掉其中的 `dept-list.tsx` 原生 `<button title="清空搜索">` 与 `app-list.tsx` 的 `aria-label="清空搜索"`（即 #53/#56 的实例） | `system/dept/-components/dept-list.tsx`、`open/app/-components/app-list.tsx`、`system/menu/-components/menu-list.tsx`、`system/role/-components/role-list.tsx`、`dashboard/users/-components/users.tsx`、`system/config/-components/storage/config-storage.tsx`、`system/config/-components/sms/config-sms.tsx` | 逐个替换为 `@/components/table-search`，需要清空按钮的传 `clearable` | ✓ |
| 83 | 表页共享件推广（`TablePagination` 与 `TableSkeletonRows` 均已抽出，用户管理已接入）：6 个骨架变体的 `TableRow`/`TableCell` 类名**完全一致**，迁移只需传列宽数组（dept/menu 另传 `rowCount={6}`），零视觉风险；app/role-table 的页脚与共享组件**逐字节相同**，一行替换即可；dept/menu-table 的页脚是另一套写法（无「每页 N 条」下拉与「共 N 条」，用 `table.getPageCount()` 内联），需先按基线统一；dashboard 的 users-table 与 tasks 仍是短版（tasks 为 demo 遗留） | `(app)/open/app/-components/app-table.tsx`、`system/{dept,menu,role,user}/-components/*-table.tsx`、`dashboard/{tasks,users}/**` | 抽到 `src/components/`（骨架组件用"列宽模式"参数），删掉重复副本 | ✓ |
| 84 | 用户页细节：5 个弹层用 10 个 `useState`（可收敛为 `{ open, user }`）、查询参数对象在 key 与 queryFn 里写了两遍、`isStale` 实为 `isPlaceholderData`（名不符实且注释不准确）、`use-fullscreen-transition.ts` 只有 1 行纯 re-export、`导入数据` 仅 toast「功能开发中」、7 处 `size-4` 的取舍、分页禁用用 `pointer-events-none opacity-50`（宜 `aria-disabled`）、`CardAction` 长类名、骨架的嵌套三元、`NicknameCell` 未复用 `userLabel` | `system/user/-components/user-list.tsx`、`user-table.tsx`、`user-columns.tsx`、`use-fullscreen-transition.ts` | 逐项处理；`user-form-drawer.tsx` 的 TanStack Form 迁移见 #78 | ✓ |
| 85 | 三个同类详情 hook 口径不一：`use-app-detail.ts` 的 `alwaysRefetch` 无调用方（app 抽屉 1 分钟内重开不刷新，与"每次打开取最新"冲突）；`use-role-detail.ts` 由调用方显式传 `alwaysRefetch: true`，但其 `isPending` 门控会先渲染缓存值、随后 `form.reset` 落地（可能覆盖用户刚开始的编辑）；`use-user-detail.ts` 的 `staleTime: 0` + `fetchStatus === 'idle'` 门控是三者中唯一既保证最新又不覆盖编辑的写法 | `open/app/-components/use-app-detail.ts`、`app-form-drawer.tsx`、`app-detail-drawer.tsx`、`system/role/-components/use-role-detail.ts`、`role-form-drawer.tsx`、`role-permission-drawer.tsx` | 统一到用户页的契约（`staleTime: 0` + 等 `fetchStatus` 归 idle 再建表单），并删掉无人使用的 `alwaysRefetch` | ✓ |

### P3 死代码与恒假分支

| # | 事项 | 文件:行号 | 动作 | 核验 |
|---|---|---|---|---|
| 45 | `ui/**` 14 文件零引用（1,649 行） | `src/components/ui/`：questionnaire / combobox / menubar / carousel / attachment / navigation-menu / input-otp / accordion / native-select / hover-card / slider / radio-group / aspect-ratio / direction | **建议只标注不删**（与 R2 冲突，`shadcn add` 会回灌） | ✓ |
| 46 | `(legacy)` 4 目录 25 文件（约 3,300 行）＋ `coming-soon` 无任何引用 | `src/routes/(main)/dashboard/(legacy)/`、`dashboard/coming-soon/route.tsx`（仅 `routeTree.gen.ts` 登记） | 删（零引用） | ✓ |
| 47 | `lib/api` 9 个死导出 | `src/lib/api/common.ts:22,31`、`app.ts:83`、`role.ts:137,160`、`menu.ts:5,11`、`src/lib/cookie.ts:20`、`src/lib/local-storage.ts:11` | 删或接上（`uploadFile` 应被 #20 用起来） | ✓ |
| 48 | 组件/工具死代码 | `src/components/can.tsx`、`system/config/-components/storage/display.tsx:17-19`、`open/app/-components/app-display.tsx:16-18`、`dashboard/kanban/-components/utils.ts:8,13`、`system/user/-components/use-fullscreen-transition.ts`、`src/routes/(main)/(app)/$.tsx:38-39` | 删（转发壳删除后统一导入 `@/hooks/`） | △ |
| 49 | query key 与 store 死键 | `src/lib/query-keys.ts:25,33,34,35`、`src/stores/auth/auth-store.ts:23,24,38,62,73`、`src/hooks/use-permission.ts:27-28` | 删 | ✓ |
| 50 | 恒 false / 不可达分支 | `system/dept/-components/dept-list.tsx:231`、`system/menu/-components/menu-list.tsx:230`、`open/app/-components/app-table.tsx:118`、`system/role/-components/role-table.tsx:116`、`system/dept/-components/dept-table.tsx:75`、`system/menu/-components/menu-table.tsx:75`、`system/role/-components/use-role-detail.ts:26-28`、`open/app/-components/use-app-detail.ts:26-28`、`open/app/-components/app-secret-dialog.tsx:96-100`、`system/role/-components/role-delete-dialog.tsx:26,46`、`src/lib/preferences/preferences-storage.ts:12-21`、`src/stores/tabs.ts:72-75` | 清理。**已剔除 2 条误报**：`user-table.tsx:118`、`use-user-detail.ts:36-39`（不存在） | ✓/✗ |
| 51 | 无调用方传入的 props（过度设计的配置面） | `system/role/-components/role-checkable-tree.tsx:19-25,40-41`、`system/user/-components/dept-tree-select.tsx:21,61`、`open/app/-components/use-app-detail.ts:13,21,33`、`auth/-components/captcha-image.tsx:6,13` | 删 props | ✓ |

### P4 口径裁决（**必须先定，再批量改**）

| # | 待裁决 | 文件:行号 | 建议 | 核验 |
|---|---|---|---|---|
| 52 | `aria-invalid` 56 处：保留还是删 | 13 文件，如 `system/user/-components/user-form-drawer.tsx:348,365,385,408,426,444,518,539`、`user-reset-password-dialog.tsx:139,159`、`user-role-select.tsx:52` | 保留，并在 `AGENTS.md` 写明例外（它是 `ui/**` 失效态样式的功能钩子） | ✓ |
| 53 | `aria-label` **32** 处 ＋ DOM `title` 净 8 处 ＋ `role=` **6** 处 | `app-shell/header/layout-controls.tsx:113-206`（12）、`system/role/-components/role-checkable-tree.tsx:98-163`（5）、`system/menu/-components/icon-picker.tsx:493`、`src/components/simple-icon.tsx:17-18`、`app-shell/sidebar/nav-main.tsx:72,228`、`system/config/-components/storage/display.tsx:39,44,58`、`open/app/-components/app-display.tsx:59` | 一律换 `Tooltip` / `sr-only`；`role=` 最严重 | ✓ |
| 54 | 表单控件高度基准：`h-8` 还是 `h-9` | `src/components/password-input.tsx:15`（`ui/input-group.tsx:15` 默认 `h-8`；消费者 `system/config/-components/sms/form-drawer.tsx:316`、`storage/form-drawer.tsx:426`） | 删 `h-9`，以 `h-8` 为准（不动 `ui/**`） | ✓ |
| 55 | `font-normal` 覆盖 `font-medium` 的口径 | `system/user/-components/user-table.tsx:107`、`user-columns.tsx:160`、`user-role-select.tsx:98` | 承认并统一（或全局去掉） | ✓ |
| 56 | 原生 `<button>` 18 处的整改范围（`RetryHint` 已存在，位于 `system/config/-components/retry-hint.tsx`，4 个配置面板的错误态已在用；全目录统一时上移到 `src/components/`） | 清单见 `AUDIT.md` §3.4；用户页三处 `system/user/-components/user-form-drawer.tsx:480`、`user-assign-roles-dialog.tsx:177`、`user-role-select.tsx:77` | 用 `RetryHint` **全目录**统一 | ✓ |
| 57 | 穿透选择器 `**:data-[slot=…]` 与 `[&_tr]:border-t`（全项目 7–8 处一致） | `system/user/-components/user-table.tsx:99,103` | 改到调用点直接传 `className` | ✓ |
| 58 | 是否抽 `DataTable` 外壳 | 见 #33 | **做**，但作为独立里程碑，先定接口 | — |
| 59 | `validateSearch` 是否进 URL | `system/user/route.tsx:5-7`（先例 `system/config/route.tsx:23`、`dashboard/file-manager/route.tsx:15`） | 接（同类页面口径已不一致） | ✓ |
| 60 | R2 与删 `ui/**` 死代码的冲突 | 见 #45 | 不删，改标注 | — |
| 61 | 列排序：接服务端排序还是承认 `accessorKey` 只当 id | `system/user/-components/user-columns.tsx:101`、`user-list.tsx:162`（14 列无一处 `getValue()`） | 明确一种并写进口径 | ✓ |
| 62 | `tree.tsx` 自研 ARIA 是否豁免 R3 | `src/components/ui/tree.tsx`、`ui/tree-select.tsx` | 写明"自研复合控件为自身提供 ARIA 不受 R3 约束" | △ |
| 78 | 表单库口径：全仓 `react-hook-form` → **TanStack Form**（配置页 4 个面板已迁移，可作参考实现） | 17 个 RHF 文件：`auth/-components/login-form.tsx`、`dashboard/profile/-components/password-form.tsx`、`system/user/-components/{user-form-drawer,user-reset-password-dialog,user-assign-roles-dialog}.tsx`、`system/{dept,role,menu}/-components/*-form-drawer.tsx`、`open/app/-components/app-form-drawer.tsx`、`system/config/-components/{client,sms,storage}/form-drawer.tsx`、`dashboard/invoice/**`（5 文件） | 逐特性迁移；全部完成后在 `AGENTS.md` 写明表单库口径，并移除 `@hookform/resolvers`；**每个 `<form.Field>` 必须同时带 `validators={{ onSubmit: schema.shape.X }}`**——只把 schema 放在表单级会导致"首次提交后新变非法的字段不再被校验"（`_handleSubmit` 在 `!isFieldsValid` 时提前 return，走不到表单级校验） | — |

### P5 用户管理页中低优先

| # | 事项 | 文件:行号 | 动作 | 核验 |
|---|---|---|---|---|
| 63 | 10 个 `FieldLabel` 里 9 个与控件无程序化关联 | `system/user/-components/user-form-drawer.tsx:347,359,402,420,438,467,495,512,531`（正例 `:378`） | 补 `htmlFor` / `id` | ✓ |
| 64 | 571 行单文件，10 段 `<Controller>` 字段块（宽度/结构有差异，非逐字） | `system/user/-components/user-form-drawer.tsx:342-543`、骨架 `:127-179` | 抽 `FormFieldRow` | ✓ |
| 65 | `isStale` 语义与注释不符：「有旧数据＋刷新失败」完全不可见 | `system/user/-components/user-table.tsx:82-83,116,128,131-139`、`user-list.tsx:257` | 传 `isError` 或改名，并加可见提示 | ✓ |
| 66 | 分页四问题：越界无高亮／先发越界请求／假 disabled／`href="#"` | `system/user/-components/user-table.tsx:90` vs `:195`、`:183,214`、`:181,194,212`；`user-list.tsx:120-125` | 统一钳制点；假 disabled 补 `aria-disabled` 或真 disabled | ✓ |
| 67 | 部门树筛选失败后永久不可用（无重试入口） | `system/user/-components/dept-tree-select.tsx:99,101`、`user-list.tsx:104-108,205-215`；范例 `user-form-drawer.tsx:477-484` | 补重试 | ✓ |
| 68 | 枚举精度被抹掉（`undefined`/`null`/未来 `3` 都显示"禁用"） | `src/components/status-cell.tsx:9`、`src/lib/api/user.ts:4`、`system/user/-components/user-display.tsx:13` | 收窄为 `UserStatus` | ✓/✗ |
| 69 | 5 组「id state ＋ open state」靠注释表达语义 | `system/user/-components/user-list.tsx:56-68` | 收拢为 `{ id, open }` | ✓ |
| 70 | 无 `useMutation`；「进行中」两套机制 | 5 个写操作文件；`system/user/-components/user-delete-dialog.tsx:40` | 归一到 `useMutation` | ✓/✗ |
| 71 | 纯冗余 class 5 处（写的值与 `ui/**` 默认逐字相同） | `system/user/-components/user-table.tsx:118,120,53`、`user-columns.tsx:36`、`user-detail-drawer.tsx:100`、`user-role-select.tsx:98` | 删冗余类 | ✓ |
| 72 | 同类页细节缺失（`CardHeader` 缺 `border-b`、`CardTitle` 缺 `leading-none`）；骨架 5 行 vs 每页 10 条；5 层嵌套三元；全屏文案不随状态；魔法字符串；无意义三元；`user!`；死导出；rAF 未取消；无收益 `useCallback`；4 个居中列表头左对齐；列定义翻页重建（`meta` 未用） | `system/user/-components/user-list.tsx:266,267`、`:42-46,180,185,127-129`；`user-table.tsx:50,54-68`；`user-toolbar.tsx:102-105`；`user-assign-roles-dialog.tsx:190`；`src/hooks/use-fullscreen-transition.ts:146,98-108`；`dept-tree-select.tsx:36`；`user-columns.tsx:108,125,133,159` | 逐项小改，随 #33/#58 一并处理 | ✓/✗ |

### P6 文档自身维护

| # | 事项 | 文件 | 动作 |
|---|---|---|---|
| 73 | 修正 `AUDIT.md`：6 处行号/条目（`user-form-drawer:470`→480、`storage/display:41,46,60`→39,44,58、`app-display:73`→59、`menu-list:259`→256、`header-tabs:200`→197、`user-list:18`→15）；删 `user-table.tsx:118` 与 `use-user-detail.ts:36-39` 两条误报；`dept/menu-table:70`→75；`aria-label` 33→32；更新 §2.1 机械计数与 §3.3/§3.4 对应条目（`role=` 8→6、原生 `<input>` 2→0、原生 `<img>` 6→5，且 `config-site` 的引用行号已失效）；并删除 §4-1（`role-user-drawer` 失效键）与 §4-2（配置面板缺 `isError`）两条已修复的缺陷 | `AUDIT.md` | 更正 |
| 74 | 修正新快照 13 处行号（重点 `user-delete-dialog:249`→40、`user-assign-roles-dialog:376`→190、`user-role-select:203` 无此 Map、role 查询两处行号、`user-display:15`→13、`user-columns:160`→159） | `BASELINE-USER.20261018.md` | 更正 |
| 75 | 旧稿已过期，避免后续误用 | `BASELINE-USER.md` | 文件头标注 superseded，指向 `BASELINE-USER.20261018.md` |

---

## 3. 建议的执行顺序

1. **P0 的 #3–#9**（一提交一事，回归验证点：编辑失败不出空表单、过滤状态下不可删父部门、401 只弹一条、未登录深链不发菜单请求）。
2. **P4 口径裁决**（#52–#54、#57、#60、#62）——这几条不定，批量整改会反复返工。
3. **P1 性能**（#21–#24 收益最大）。
4. **P2 结构性**：先 #33＋#34（表格外壳）＋ #58 接口契约，再 #35–#37；#40 单独排期。
5. **P3 死代码**（#46–#49、#51 零风险；#45 按裁决执行）。
6. **P5** 随 #33/#58 的改造一并清理。

---

## 4. 需要所有者裁决（阻塞项）

1. **#52 `aria-invalid`**：保留（写进 `AGENTS.md` 例外）还是按 R3 字面删除 56 处。
2. **#54 表单控件高度基准**：`h-8`（删 `password-input.tsx:15` 的 `h-9`）还是 `h-9`（需改 `ui/**`）。
3. **#10 硬编码 `admin/admin123`**：是否有意的演示预填。
4. **#58 `DataTable` 接口契约**：`role`（客户端分页）与 `dept/menu`（树表）如何纳入。
5. **#45 `ui/**` 死代码**：删还是标注（与 R2 的取舍）。

---

## 5. 本清单未覆盖 / 限制

- 未执行 `pnpm build` / `pnpm lint` / `pnpm typecheck`，未做浏览器视觉验证。
- 标记 **△** 的条目结论来自报告，行号未逐一回源，动手前请先 `grep` 定位。
- 后端契约一致性（字段、权限码、枚举）不在范围内。
- `AUDIT.md` 中标记为"未发现问题的方面"（§14）的结论未被本次核验推翻，本清单不再重复。
