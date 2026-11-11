# continew-ui-next 前端代码审计清单

- 审计时间：2026-11-10；基线提交：`e844991`；方式：只读静态审计，未改动业务代码。
- 基线检查：`pnpm lint`（oxlint）、`pnpm typecheck`（tsc --noEmit）均无报错。
- 范围：`src/` 下全部 `.ts/.tsx/.css`。`components/ui/` 中的 shadcn 上游组件不审内部实现，只核对调用方用法；自研的 `ui/tree.tsx`、`ui/tree-select.tsx` 纳入审计。`routeTree.gen.ts` 为生成文件，不审。
- 路径约定：`(app)/` 表示 `src/routes/(main)/(app)/`，其余路径相对 `src/`。
- 标记：
  - **【已核实】**：已逐行复核代码。
  - **【有意为之】**：经确认属产品设计意图，不按问题处理。
  - **【待确认】**：结论依赖后端行为或运行时验证。
  - 未标记：审计时读过代码并给出行号，但未做第二轮复核。
- 严重度：**P1** 缺陷、安全问题或明显性能问题；**P2** 明显的维护性或一致性问题；**P3** 小优化。
- 判定原则：使用原生 HTML、有额外 class、没用 memo、文件较大，这些本身都不算问题。只有存在可替代的 shadcn 组件、有实际重复、或有可推理的代价时才列入。

---

## 一、正确性与安全缺陷（审计中发现）

### P1

- [x] **【已核实】树级联勾选漏掉祖先节点**：`components/ui/tree.tsx:273-284`。`ancestorsMap` 中的顺序是从根到父（见 `:88`），向上补齐时先判断根节点，此时直接父节点还没加入 `nextChecked`，根节点因此被判为未全选。以 R→P→L 单链为例，勾选 L 后结果为 {L, P}，R 显示半选，提交的 menuIds/deptIds 会缺少上层节点。建议改为从父节点向根逆序遍历（`ancestors.toReversed()`）。**2026-11-10 复核：已修复**，现按“最近父 → 根”逆序补齐，级联逻辑抽至 `lib/tree-check.ts`，回归用例见 `tests/tree-cascade.test.ts`。
- [ ] **【已核实】站点配置缓存不会刷新**：`hooks/use-site-options.ts:16-24`、`lib/query-client.ts:18-22`、`(app)/system/config/-components/use-option-form.ts:70,92`。`initialData` 读自 localStorage，又没有设置 `initialDataUpdatedAt`，再叠加全局 `refetchOnMount:false`，只要本地有缓存就不会发请求。保存配置时也只失效了 `optionKeys.list`。结果是修改标题、Logo、版权后，侧栏和登录页一直显示旧值。建议给该查询加 `initialDataUpdatedAt: 0`（或改用 `placeholderData`），保存 SITE 分类时同时失效 `siteOptionKeys.all`。
- [ ] **【已核实】菜单编辑读到旧缓存，保存会覆盖上次修改**：`(app)/system/menu/-components/menu-form-drawer.tsx:178-185,164`。详情用的是裸 `useQuery`，继承 5 分钟 staleTime 和 `refetchOnMount:false`；保存后只失效了 `menuKeys.trees()`。5 分钟内再次编辑同一菜单，表单回填的是修改前的数据。建议改用 `useDetailQuery`，并失效 `menuKeys.all`。
- [ ] **【已核实】【待确认后端是否净化】公告 HTML 未净化即渲染**：`components/rich-text-editor.tsx:29-34`。`RichTextContent` 直接用 `dangerouslySetInnerHTML` 渲染后端内容，调用点为 `(app)/system/notice/-components/notice-view-drawer.tsx:58`。只要有人绕过编辑器直接调接口写入 `<img onerror>`，就构成存储型 XSS。建议用 DOMPurify 净化，或改用 `editable:false` 的 tiptap 渲染。
- [ ] **【已核实】个人资料页把 mock 数据当作用户数据展示**：`(app)/dashboard/profile/-components/profile-record.ts:70-97`、`profile-data.ts:61-133`。`user` 为 null 时整份返回 mock；字段为空时回退为他人的头像、邮箱、电话和英文简介。文档 tab 是假数据，按钮也没有 onClick；状态固定显示"启用"。建议字段缺失时显示 `EMPTY_PLACEHOLDER`，删除没有数据来源的字段和 tab。

### P2

- [ ] **【已核实】数字框删空后立即被回填**：`(app)/system/config/-components/sms/form-drawer.tsx:446,474,508,535`、`storage/form-drawer.tsx:697`（`NaN → 1/0`）；`(app)/system/dept/-components/dept-form-drawer.tsx:248`、`role-form-drawer.tsx:262`、`menu-form-drawer.tsx:410`（`valueAsNumber || 1`）。删空后马上变成 1，接着输入 5 就成了 15，`min(1)` 校验也永远触发不到。`client/form-drawer.tsx:31-35` 已有正确写法：值存字符串，用 zod 校验，提交时再转数字。建议统一改成这种写法。
- [ ] **【已核实】标签页右键"重新加载"无效**：`components/app-shell/header/header-tabs.tsx:171-179`。该操作只调用了 `router.invalidate()`，而只有 `(app)/route.tsx` 和 `(app)/$.tsx` 定义了 loader，页面数据都走 TanStack Query，所以当前页不会刷新。建议失效当前页的 query，或通过改变 key 让页面重挂载。
- [ ] **【已核实】套餐表单提交中可以点取消**：`(app)/tenant/package/-components/package-form-drawer.tsx:334`。取消按钮在 `form.Subscribe` 外，读取的 `form.state.isSubmitting` 不是响应式的，`onClick={onClose}` 也绕过了 `canClose`。建议照 `tenant-form-drawer.tsx:506-524` 把取消按钮放进 Subscribe。
- [ ] **【已核实】会话过期时提示弹两次**：`lib/http.ts:240-248`、`stores/auth/auth-provider.tsx:47-48`。`handleSessionExpired` 触发的 handler 先 toast 一次，随后 `fail(..., silent)` 再 toast 一次。建议 `throwSessionExpired` 改为构造 `notified=true` 的 `ApiError`，不再重复 toast。
- [ ] **【已核实】公告查看把更新时间当作发布时间**：`(app)/system/notice/-components/notice-view-drawer.tsx:51-53`。代码显示 `updateTime || createTime`，而 `NoticeResp.publishTime` 已经存在。建议改用 `publishTime`，并加上标签。
- [ ] **【已核实】无头像时显示第三方头像**：`components/app-shell/header/user-menu.tsx:19,32,39`。回退地址是 `https://github.com/shadcn.png`，`AvatarFallback` 的首字母永远不会出现，还多发一个外部请求。建议去掉这个回退。
- [ ] **【已核实】编辑抽屉的详情不强制刷新**：`(app)/system/dept/-components/dept-form-drawer.tsx:59`、`(app)/system/config/-components/client/form-drawer.tsx:194-204`、`sms/form-drawer.tsx:142-146`、`storage/form-drawer.tsx:267-271`。这些地方用裸 `useQuery` 加 `id!`，可能拿到最长 5 分钟前的数据，与 `useDetailQuery`（打开即刷新）的约定不一致。建议统一改用 `useDetailQuery`。
- [ ] **存储配置列表请求失败时显示为空**：`(app)/system/config/-components/storage/group-panel.tsx:50-58`、`config-storage.tsx:191-209`。组件没有错误分支，失败时显示"暂无配置"，也没有重试入口。建议传入 `isError`/`onRetry`，失败时渲染 `QueryState`。
- [ ] **套餐详情关闭动画期间闪出骨架屏**：`(app)/tenant/package/-components/package-detail-drawer.tsx:40-50`。关闭时 id 置 null，查询变成 pending。建议照 `tenant-detail-drawer.tsx:47-49` 用 `useLastRecord` 保留上一条数据。
- [ ] **表单抽屉关闭动画期间标题和字段错位**：`(app)/tenant/management/-components/tenant-form-drawer.tsx:123,227,232,319`、`(app)/tenant/package/-components/package-form-drawer.tsx:106,237`、`(app)/schedule/job/-components/job-form-drawer.tsx:174,362`。target 置 null 后 `isCreate` 变成 true，标题从"修改"跳成"新增"，租户表单还会多渲染出仅新增时才有的字段。建议保留上一次的 target 来计算 `isCreate`。
- [ ] **邮件配置被隐藏字段的校验拦住**：`(app)/system/config/-components/config-mail.tsx:40,182-201`。`MAIL_SSL_PORT` 只在 SSL 开启时渲染，但 schema 始终要求它必填，关闭 SSL 后提交会失败且看不到错误。建议在 `superRefine` 中按 `MAIL_SSL_ENABLED` 决定是否校验。
- [ ] **图片上传没有大小限制**：`(app)/system/config/-components/image-upload-field.tsx:37-47`。图片转成 base64 后写进配置，还会缓存到 localStorage，可能超出配额。另外 input 的 value 没有清空，同一文件无法再次选择。建议加大小上限，并在处理后执行 `event.target.value = ''`。
- [ ] **菜单/部门搜索过滤后，删除判断用的是裁剪后的子节点**：`(app)/system/menu/-components/menu-list.tsx:36-44`、`menu-delete-dialog.tsx:14`、`(app)/system/dept/-components/dept-list.tsx:40-44`、`dept-delete-dialog.tsx:14-17`。父节点命中而子节点未命中时，`children.length===0`，弹窗会放行删除。**【待确认】** 后端是否会拒绝删除有子节点的记录。建议按 id 到原始树中取子节点数。
- [ ] **触屏上无法修改字典**：`(app)/system/dict/-components/dict-manager.tsx:230`。操作菜单只在 hover 或 focus-within 时可见，右侧面板也没有"修改"入口。建议让按钮常驻，或在面板中补上修改入口。
- [ ] **xl 以下无法按文件类型筛选**：`(app)/system/file/-components/file-storage-card.tsx:68-70`。类型导航是 `hidden xl:flex`，小屏上没有替代入口。
- [ ] **用户/角色页没有前端权限控制**：`(app)/system/user/-components/user-list.tsx:174-185`、`user-columns.tsx:73-97`、`(app)/system/role/-components/role-list.tsx:110`、`role-columns.tsx:58-75`。dept/menu 页面用 `hasPermission` 控制按钮显隐，user/role 页面完全没有。建议统一使用 `Can`/`usePermission`。
- [ ] **退出后重新登录不再提示密码过期**：`stores/auth/auth-provider.tsx:23,36-42`。`passwordExpiryNotified` 置 true 后从不复位，同一标签页换账号登录时不会提示。
- [ ] **改了字典项，其他页面的字典选项不刷新**：`(app)/system/dict/-components/dict-item-form-drawer.tsx:86`、`dict-delete-dialog.tsx:42`。没有失效 `dictKeys.code(code)`。**【待确认】** 后端字典缓存的清除时机。
- [ ] **【待确认】关闭“父子联动”后套餐仍补齐祖先菜单**：`(app)/tenant/package/-components/package-form-drawer.tsx:119-130`。`menuCheckStrictly=true` 时树只勾叶子，但提交前 `selectedMenuIds()` 仍补全所有祖先；级联修复后这段对非 strict 模式也是冗余。同一文件还为兜底单独 `buildTreeIndex` 了一次（`:113`），与 `CheckableTree` 内部重复。建议确认后端是否强制要求祖先 id，再决定删除或只在非 strict 时补。
- [ ] **【待确认】回跳地址校验不严**：`(main)/auth/-components/login-form.tsx:77`、`(main)/social/callback/route.tsx:41`。只校验了 `startsWith('/')`，`//evil.com` 也能通过。`hooks/use-site-options.ts:11` 已经排除了 `//`。建议抽一个共用的 `isSafeRedirect`。
- [ ] **【待确认】任意 403 都会整页跳转**：`lib/http.ts:293-295,358-360`。按钮操作、字典这类次要请求返回 403 也会跳到 `/unauthorized`，用户会丢失当前页面状态。
- [ ] **【待确认】短信 Secret Key 明文提交**：`(app)/system/config/-components/sms/form-drawer.tsx:157`。存储配置会先 `encryptByRsa`，短信这里没有。同时 `undefined!` 绕过了类型检查。
- [ ] **【待确认】在线用户默认只显示近 7 天**：`(app)/monitor/online/-components/online-user-list.tsx:25`。登录超过 7 天的长效会话默认不显示。

### P3

- [ ] **【已核实】个人中心密码规则提示与实际规则不符**：`(app)/dashboard/profile/-components/password-form.tsx:26-28`。正则要求小写字母，提示语却写"字母"，规则也与 `lib/password.ts` 重复定义。建议直接复用 `lib/password.ts`。
- [ ] **标签数超上限时删掉的是最新标签**：`stores/tabs.ts:67-75`。`slice(0, MAX-1)` 删的是最新的，与注释写的"最旧"相反。
- [ ] **按位置排列的骨架宽度与列错位**：`(app)/open/app/-components/app-list.tsx:153`。隐藏列后错位还会继续加剧。建议改为按列 id 映射。
- [ ] **ul 内放了 span**：`(app)/system/file/-components/file-manager.tsx:319`。`PaginationContent`（ul）里直接放 `<span>`，HTML 结构不合法。
- [ ] **清空时间被强制改回 00:00**：`(app)/system/notice/-components/notice-publish-time-picker.tsx:41-48`。
- [ ] **【待确认】纯图片公告判为空**：`(app)/system/notice/-components/notice-form-drawer.tsx:42-49`。
- [ ] **【待确认】日志 search 只作初始值**：`(app)/schedule/log/-components/job-log-list.tsx:61-64`。URL 中的 search 之后不再同步，同路由内导航后隐藏的 jobId 筛选会残留。
- [ ] **数组查询参数被拼成逗号串**：`lib/http.ts:121-124` 及各 `lib/api/*.ts` 中的 `query as Query`。多字段排序会合并成 `a,asc,b,desc`。建议数组逐个 `append`。
- [ ] **雪花 id 类型标注不准**：`lib/api/types.ts:65,79,97-98`。id 标为 number，但 FLEXIBLE 模式下大 id 会以字符串返回。
- [ ] **导出吞掉了所有异常**：`hooks/use-export.ts:18-20`。`blob()` 失败这类错误没有任何提示。建议改为 `reportError(e)`。
- [ ] **验证码请求有竞态**：`hooks/use-captcha.ts:12-57`。请求不可取消，连续刷新时旧响应可能覆盖新响应。建议改用 `useQuery`。
- [ ] **【待确认】下载受 30s 超时限制**：`lib/http.ts:69,274-282`。超时还会被报成"网络连接失败"。
- [ ] **【待确认】清空字段可能不生效**：`(app)/open/app/-components/app-form-drawer.tsx:106-107`。清空描述时发送的是 `undefined`，取决于后端的更新策略。
- [ ] **【待确认】最后登录时间可能取错**：`(app)/dashboard/profile/-components/profile-status-sidebar.tsx:25-42`。如果 `createUserString` 是模糊匹配，可能命中其他用户的记录。

### 经确认属设计意图（不按问题处理）

- [x] **【有意为之】** 生产包内置登录默认凭据：`(main)/auth/-components/login-form.tsx:29-35`。`DEFAULT_FORM` 预填演示账号和密码，是让生产包开箱即可进入演示环境的有意设计，不需要按环境隔离，也不再列入处理顺序。**2026-11-11 确认：保持现状。**

---

## 二、冗余代码 / 死代码

- [ ] **【已核实】P2** `components/calendar/event-calendar-views.tsx`（418 行）：没有任何引用。`@fullcalendar/react` 只在这里使用，可以一并移除（`pnpm remove @fullcalendar/react`）。
- [ ] **【已核实】P2** `components/date-range-picker.tsx`：没有引用，只在 `date-range-filter.tsx:25` 的注释中出现，文案还是英文。
- [ ] **【已核实】P2** `styles/flag-icons/flags.css`（约 200KB）：src 和 index.html 中都没有引用。
- [ ] **【已核实】P2** `(app)/dashboard/profile/-components/profile-employment-details.tsx`、`profile-time-off-details.tsx`：没有引用。`profile-data.ts:24-57` 和 `profile-record.ts` 中对应的字段只被这两个文件使用。
- [ ] **P2** `components/json-viewer/themes.ts`（693 行）及 `json-viewer.tsx:14-18,57-90,159-177,234-247`：唯一调用方没有传 `colorTheme` 等参数，主题系统不会生效，但主题表被打进了包。
- [ ] **【已核实】P2** `(app)/dashboard/$.tsx`：页面是英文 "Page not found."，还绕过了父路由统一的 `notFoundComponent`，文件带 BOM。建议删除。
- [ ] **【已核实】P3** `(app)/system/config/-components/storage/display.tsx:15-17`：`storageTypeDescription` 没有引用。
- [ ] **P3** `lib/api/common.ts:9-28`：`uploadFile` 和 `FileUploadResp` 与 `lib/api/file.ts:57-80` 重复，且没有调用方。
- [ ] **P3** 没有调用方的导出：`lib/utils.ts` 的 `formatCurrency`、`hooks/use-lg.ts` 的 `useIsLg`、`hooks/use-permission.ts:27` 的 `hasAllPermissions`、`lib/api/app.ts:79` 的 `deleteApps`、`lib/api/role.ts:155` 的 `deleteRole`、`lib/api/dict.ts:67,91` 的 `getDict`/`getDictItem`、`lib/api/job.ts:81` 的 `JOB_STATUS_LABELS`、`lib/api/types.ts:21` 的 `AuthType`。另外 `lib/api/auth.ts:18` 的 `tenantCode` 参数从未传入；`lib/api/user.ts:40-44` 重复定义了 `PageResp`。
- [ ] **P3** `stores/auth/auth-store.ts:30-31`：`roles`、`isLoadingUser` 在 store 外没有读取。
- [ ] **P3** `styles/theme-colors.css`：`--destructive-foreground` 定义了 18 处，但没有映射到 `@theme`，也没有使用。
- [ ] **P3** `(app)/system/config/-components/use-option-form.ts:137`：返回的 `submit` 没有使用方。
- [ ] **P3** `components/app-shell/app-breadcrumb.tsx:110-126,138-155`：`items.length === 1` 和 `!firstItem.url` 两个分支不可达。
- [ ] **P3** `components/app-shell/index.tsx:23,29,78,84`：`--dashboard-header-height` 没有被读取；`group-has-[collapsible=icon]:h-12` 与原值相同，过渡不会生效；有未使用的 re-export。
- [ ] **P3** `stores/tabs.ts:6,39-41`：`id` 恒等于 path；"全部不可关闭"分支不可达；路径过滤在 `header-tabs.tsx:140,153` 里又做了一遍。
- [ ] **P3** `lib/auth-guard.ts:5-9`：`PUBLIC_PATHS` 判断在 (app) 路由组内永远为 false。
- [ ] **P3** `(app)/system/file/-components/file-manager.tsx:473-483`：`view === 'list'` 两个分支的渲染内容相同。
- [ ] **P3** `(app)/system/role/-components/role-user-add-drawer.tsx:191`：与随后 `onSuccess` 中的 invalidate 重复。
- [ ] **P3** `(app)/system/role/-components/role-permission-drawer.tsx:36-40`：`PERMISSION_TYPE_LABELS` 与 `lib/api/menu.ts:5` 的 `MENU_TYPE_MAP` 内容相同。
- [ ] **P3** `(app)/system/dept/-components/dept-list.tsx:213`、`menu-list.tsx:218`：没有设置 `placeholderData`，`isPlaceholderData` 永远是 false；keyword 被 trim 了两次。
- [ ] **P3** `(app)/dashboard/index.tsx:29`：`@container/main` 没有被任何容器查询使用。
- [ ] **P3** `(app)/system/user/-components/user-list.tsx:114,178`："导入数据"按钮只会弹"开发中"。
- [ ] **P3** `(app)/system/file/-components/file-upload-dialog.tsx:35-58`：打开时的重置 effect 与 `clearFiles` 是同一段逻辑。
- [ ] **P3** 同一组 filters 在列表查询和导出里各拼了一遍：`(app)/monitor/log/-components/log-list.tsx:88-97,117-124`、`(app)/open/app/-components/app-list.tsx:73-78,101`、`(app)/system/sms/log/-components/sms-log-list.tsx:60,85-90`、`(app)/system/user/-components/user-list.tsx:88-95`。
- [ ] **P3** 表单级 `onDynamic: formSchema` 已经校验，字段级又挂了一遍同一 schema：`(main)/auth/-components/login-form.tsx:52-54,84-85`，以及 tenant、package、job 的表单抽屉。

## 三、过度防御

- [ ] **P3** `components/ui/tree-select.tsx:668-691,817`：用 effect 在关闭时重置搜索、在 disabled 时关闭弹层；`handleClear` 和 `handleSelect` 里的 disabled 判断不可达。建议在 `onOpenChange` 中重置，用 `open && !disabled` 派生。
- [ ] **P3** `components/user-picker.tsx:86-90`：DialogContent 关闭时会卸载，"关闭时清空搜索"的 effect 没有作用。
- [ ] **P3** `lib/end-session.ts:15`：`cancelQueries()` 内部已经 catch 过。
- [ ] **P3** `lib/auth-session.ts:15-40`：自己包了一层 try/catch，与 `lib/local-storage.ts` 重复；同文件的 `isPersisted` 却没有保护，标准前后不一。
- [ ] **P3** 对类型上非空的字段写 `?? ''`、`?? 999`、`?? []`、`?.trim()`：`(app)/system/dept/-components/dept-form-drawer.tsx:29,79,115-119`、`(app)/system/user/-components/user-form-drawer.tsx:100-110,223-225`、`role-form-drawer.tsx:154`、`(app)/schedule/job/-components/job-detail-drawer.tsx:69,75`、`job-form-drawer.tsx:119`、`(app)/open/app/-components/app-form-drawer.tsx:47-54`。
- [ ] **P3** `(app)/system/role/-components/role-user-drawer.tsx:141-145`、`role-user-add-drawer.tsx:106`：`enabled` 已经保证 roleId 非空，queryFn 里又判断了一次。建议用 `skipToken`。
- [ ] **P3** `(app)/open/app/-components/app-delete-dialog.tsx:24-28`、`app-reset-secret-dialog.tsx:38-40,73-75`、`(app)/monitor/online/-components/online-user-kickout-dialog.tsx:41-43,78-80`：有了 `useLastRecord` 后，null 分支不可达；`app-display.tsx:5-7` 的 `appLabel` 是多余的间接层。
- [ ] **P3** `(app)/open/app/-components/app-form-drawer.tsx:29,105`：status 只能来自 Switch，却仍做 `min(1).max(2)` 校验并写 `as AppStatus`。建议 schema 改为 `z.union([z.literal(1), z.literal(2)])`。`storage/form-drawer.tsx:192,204` 是同样的情况。
- [ ] **P3** `(app)/system/config/-components/storage/form-drawer.tsx:465,695`、`client/form-drawer.tsx:141-143`、`client/auth-type-select.tsx:20,22`：外层条件已经包含的判断、必填 props 带默认值。
- [ ] **P3** `(app)/system/notice/-components/notice-form-drawer.tsx:306,309`：Select 根组件和 Trigger 上重复传了 `disabled`。
- [ ] **P3** `(app)/system/file/-components/file-name-dialog.tsx:37-80,120`：`if (!isCreate && !file) return` 之后又写了 `else if (file)`；FieldError 无内容时本来就返回 null，外面又做了一次判断。
- [ ] **P3（有条件）** 先 `validate('submit')` 再 `handleSubmit()`，同一份校验执行两次，全项目共 15 处，例如 `(main)/auth/-components/login-form.tsx:104,127`。`(app)/schedule/job/-components/job-form-drawer.tsx:173,278-281` 的 `submitLockRef` 守的正是这段异步间隙。只有统一为单次 `handleSubmit` 之后才能一并删除，不能单独删锁。

## 四、过度设计

- [ ] **P2** 自研树组件有大量没人用的 props：`components/ui/tree.tsx:48-59,173,451`、`ui/tree-select.tsx:26-44`、`components/checkable-tree.tsx:20-28`。Tree 的 `defaultExpandedKeys/selectableLeafOnly/renderLabel/renderIcon/renderAction/indentRem` 没有调用方使用，其中 `indentRem` 实际不可能生效；TreeSelect、CheckableTree 也有多项 show*/render* props 无人使用。
- [ ] **P2** `components/ui/tree.tsx:9,229,279`：`TreeKey = string | number`，内部又统一转成字符串，只能靠 `Number()` 兜底。数字 id 一旦传入就会查不到子节点。建议收窄为 `string`。
- [ ] **P3** `components/ui/tree.tsx:16,513-524`：`icon` 的类型是 `ComponentType | ReactNode`，需要运行时判断；传字符串时会被当成标签名。
- [ ] **P2** `(app)/system/user/-components/user-form-drawer.tsx:193-219`、`user-assign-roles-dialog.tsx:62-80`：为了把字符串 id 映射回原值，额外请求部门树和角色列表，并建了 Map 和 `flattenDepts`。dept、role 表单都直接提交字符串 id，这层映射没有必要。
- [ ] **P3** `lib/preferences/preferences-config.ts:18-51`、`preferences-storage.ts:10-27`、`layout.ts:2-31`：7 项偏好全部用 cookie，`none`/`localStorage` 两种持久化模式从未使用；`definePreference` 与 `defineBootPreference` 运行时完全相同；`persistByMode` 声明为 async 却是同步逻辑；英文 label 没有被读取。
- [ ] **P3** `lib/data-table-features.ts:31-57`：注册了 faceting、全局过滤、列过滤、排序，项目都没有使用，显式注册也让这些特性无法被 tree-shake。
- [ ] **P3** `navigation/menu-icons.ts:145-327`：约 170 个与 lucide 同名的恒等映射，`DynamicIcon` 本来就能兜底，这些图标却全部打进了主包；React 19 下也不再需要 `forwardRef`。
- [ ] **P3** `components/entity-drawer.tsx:38-40,66`：`closeDisabled` 和 `canClose` 表达的是同一个意图，client、sms、storage 三个表单抽屉同时传了两个。
- [ ] **P3** 只透传 props 的包装组件：`(app)/system/user/-components/user-display.tsx:14-16` 的 `RoleCell`、`(app)/schedule/job/-components/job-detail-drawer.tsx:20-22` 的 `LabelBadge`。
- [ ] **P3** 只为传骨架宽度而存在的 DataTable 包装：`(app)/tenant/package/-components/package-table.tsx`、`(app)/monitor/log/-components/log-table.tsx`、`(app)/monitor/online/-components/online-user-table.tsx`、`(app)/system/sms/log/-components/sms-log-table.tsx`。建议让 DataTable 支持按列 id 传宽度（如 `columnDef.meta.skeletonWidth`）。
- [ ] **P3** 表头写成 `() => <div>标签</div>`，导致 TableToolbar 读不到列名，只能另外维护 labels：`(app)/monitor/log/-components/log-columns.tsx:13-18,88-101`、`(app)/system/sms/log/-components/sms-log-columns.tsx:21-24,81`。建议改为字符串表头。
- [ ] **P3** `(app)/system/user/-components/dept-tree-select.tsx:16-24`：`showPathInTrigger`、`size` 没有调用方使用；传了 `data` 时 `enabled` 也没有意义。
- [ ] **P3** `(app)/system/user/-components/user-form-drawer.tsx:79`：用 `safeParse('')` 推断字段是否必填，不可靠。建议直接写 `<RequiredMark />`。

## 五、未遵循框架 / 库最佳实践

### React 19

- [ ] **P3** 在 effect 里根据 props 或 state 再 setState（派生状态），每次多一轮渲染：
  - `hooks/use-last-record.ts:5-11`（34 个文件在用，建议改为渲染期条件 setState）
  - `(app)/system/dict/-components/dict-manager.tsx:119-138`
  - `(app)/system/notice/-components/notice-publish-time-picker.tsx:41-48`
  - `(app)/schedule/job/-components/job-display.tsx:61-83`（建议改为 `useMutation` 加乐观状态）
  - `(app)/schedule/job/-components/job-list.tsx:70-98,265`
  - `(app)/system/dept/-components/dept-list.tsx:85-89`、`menu-list.tsx:85-89`
  - `(app)/system/role/-components/role-user-drawer.tsx:124-131`、`role-user-add-drawer.tsx:93-101`
  - `(app)/system/config/-components/client/form-drawer.tsx:231-248`
  - `(app)/monitor/log/route.tsx:35-39`
- [ ] **P3** `hooks/use-fill-form-once.ts:42-43`：渲染期写 ref。`components/table-search.tsx:33-55`：用 effect 写 ref 保存回调，又手写了一套防抖。建议用 `useEffectEvent`（React 19.2+），防抖复用 `useDebouncedValue`。
- [ ] **P3** `hooks/use-breakpoint.ts:8-21`：首帧恒为 false，移动端会先按桌面布局渲染一帧。建议改用 `useSyncExternalStore`。
- [ ] **P3** `components/json-viewer/json-viewer.tsx:513-528`：在 state updater 里调用 setState 和 rAF，updater 不是纯函数。
- [ ] **P3** `(app)/system/config/-components/config-panel-header.tsx:37-42,58-86`：用 `clickWithoutSubmit` 绕过 React 复用按钮节点的问题。建议给两组按钮加不同的 `key`。
- [ ] **P2** `stores/preferences/preferences-store.ts:21-27`、`preferences-provider.tsx:40-46`：项目是纯 SPA，boot 脚本已经把偏好写进 DOM，store 却先用默认值初始化，再在 effect 里同步，还加了 `isSynced` 字段掩盖首帧错误。建议直接用 DOM 值初始化 store。
- [ ] **P3** `components/app-shell/sidebar/support-carousel.tsx:67-107`：用 useEffect 加 fetch 取数，`cache:'no-store'` 让 HTTP 缓存失效；自动轮播用 setInterval，悬停时不会暂停。建议改用 `useQuery`。

### TanStack Query

- [ ] **P2** 手写的详情查询与 `hooks/use-detail-query.ts` 等价，应直接复用：`(app)/monitor/log/-components/log-detail-drawer.tsx:117-123`，以及第一节"编辑抽屉的详情不强制刷新"中的 4 处和菜单那处。
- [ ] **P2** `(app)/system/config/-components/sms/config-sms.tsx:72-100`、`storage/config-storage.tsx:103-126`：把 `useMutation` 返回的对象放进 useCallback 依赖，它每次渲染都是新引用，导致列定义每次重建。建议解构出稳定的 `mutate` 作为依赖。
- [ ] **P3** 手写 `isSubmitting` 加 try/catch/finally，没有用 `useMutation`：`(app)/system/role/-components/role-permission-drawer.tsx:73-113`、`role-user-drawer.tsx:157-188`、`role-user-add-drawer.tsx:184-199`、`(app)/system/file/-components/file-recycle-drawer.tsx:86-113`、`(app)/schedule/job/-components/job-trigger-dialog.tsx:33-93`、`(app)/schedule/log/-components/job-log-action-dialog.tsx:36-114`、`(app)/monitor/online/-components/online-user-kickout-dialog.tsx:30-98`、`(app)/open/app/-components/app-reset-secret-dialog.tsx:31-100`。

### TanStack Form

- [ ] **P2** 项目没有使用 `createFormHook`/`useAppForm`。每个字段都重复 invalid、Field、FieldLabel、RequiredMark、控件、FieldError 这一套模板（`storage/form-drawer.tsx` 因此有 903 行），package、job、tenant 三个表单的写法也各不相同。详见第十一节。
- [ ] **P3** `(app)/system/notice/-components/notice-form-drawer.tsx:130,184-187`：用 `submitStatusRef` 给 onSubmit 传状态，这正是 `onSubmitMeta` 要解决的场景。
- [ ] **P2** `(app)/schedule/job/-components/job-form-drawer.tsx:191,286-299,594-598`：`triggerError`、`argsError` 是 schema 之外另加的校验 state。建议用 `superRefine` 收进 schema。
- [ ] **P2** `(app)/system/user/-components/user-form-drawer.tsx:297,331,487`：提交中不禁用字段，也不禁用关闭按钮；`FieldLabel` 没有 `htmlFor`，`role-form-drawer.tsx:192,257,367` 也是如此。

### TanStack Router

- [ ] **P3** `(app)/monitor/log/route.tsx:13-15,30`：search 用 `z.string().optional()` 再手动兜底。建议改为 `z.enum([...]).catch('login')`。
- [ ] **P3** `(app)/$.tsx:26-31`：loader 已拿到跳转目标，却在渲染阶段用 `<Navigate>` 跳转。建议在 loader 中 `throw redirect(...)`；面向开发者的 route.tsx 路径提示只在 DEV 下显示。
- [ ] **P3** 跨路由引用私有 `-components` 目录：`(app)/dashboard/-components/dashboard-notices.tsx:13` 引用了 notice 的组件，`(app)/system/role/-components/role-user-add-drawer.tsx:27` 引用了 user 的组件。建议把被引用的组件移到 `src/components/`。
- [ ] **P3** `hooks/use-menu.ts:45-53`：只要有缓存，每次调用 `ensureMenuLoaded` 都会后台重取一次，`$` 路由的 preload 也会触发；`:46-50` 的 setQueryData 与 initialData 重复。

### zod v4 / Tailwind v4 / TanStack Table

- [ ] **P3** `z.ZodIssueCode.custom` 在 v4 已弃用：`(app)/system/role/-components/role-form-drawer.tsx:51`、`(app)/system/menu/-components/menu-form-drawer.tsx:50,58`、`(app)/system/config/-components/storage/form-drawer.tsx:91-134`、`client/form-drawer.tsx:62,69,76`。建议改为 `code: 'custom'`。
- [ ] **P3** `(app)/system/config/-components/site-preview.tsx:122`：`bg-gradient-to-br` 是 v3 写法，项目其他地方用的是 `bg-linear-to-*`。
- [ ] **【已核实】P2** `styles/globals.css:238-244`：不在任何 layer 中的 `[data-slot=input/textarea/input-group-control]{font-size:.875rem}` 优先级高于 utilities。它覆盖了 shadcn 的 `text-base md:text-sm`（iOS 上聚焦会缩放页面），调用方传 `text-xs` 等字号也会失效。
- [ ] **P3** `components/data-table.tsx:77,114,116`：选中行自己着色，没有利用 `data-state=selected`；用后代选择器给单元格注入 `px-4`。

### 可访问性与语义

- [ ] **P3** `components/table-pagination.tsx:42-44,104-110`、`pagination-arrow.tsx:17-29`：纯状态切换用了 `href="#"` 的 a 标签，禁用状态靠样式模拟。
- [ ] **P3** `components/entity-drawer.tsx:85`：副标题用的是 `<p>`，没有用 `DrawerDescription`。
- [ ] **P3** `components/ui/tree.tsx:436-441,502-510`：每个节点都是 `tabIndex=0`，可勾选模式下 Checkbox 也能聚焦，权限树会产生上千个 Tab 停靠点；勾选模式用的是 `aria-selected` 而不是 `aria-checked`。
- [ ] **P3** 缺少 aria-label：头部只有图标的按钮（`header/theme-switcher.tsx:39-41`、`fullscreen-toggle.tsx:43`、`layout-controls.tsx:57`）、`components/ui/tree-select.tsx:736-744` 用 span 做的清除按钮、`(app)/system/config/-components/config-mail.tsx:170-177` 的显示密码切换。
- [ ] **P3** `components/json-viewer/json-viewer.tsx:261,315,333,549`：aria-label 和文案是英文。

## 六、低效 / 低性能

- [ ] **【已核实】P2** `(app)/dashboard/-components/dashboard-notices.tsx:28-37`：只为显示日期，就对每条公告单独请求完整详情（N+1），每次进入首页都重新请求，抽屉打开时还会再请求一次。建议后端在 dashboard 接口返回 `publishTime`。
- [ ] **P2** `(app)/system/notice/-components/notice-form-drawer.tsx:122-126,195-209`：打开抽屉就拉 100 个用户，与通知范围无关；列表返回前还会为每个已选 id 各发一次 `getUser`。
- [ ] **P2** `(app)/system/dict/-components/dict-manager.tsx:98-104`：清除缓存时对每个字典各发一次 DELETE，操作前也没有确认。**【待确认】** 后端是否有批量清除接口。
- [ ] **P3** `(app)/tenant/package/-components/package-detail-drawer.tsx:43,84`：每次渲染都新建树数据数组，Tree 内部的索引 memo 因此全部失效。
- [ ] **P3** `components/json-viewer/json-viewer.tsx:47-55,282-288`：每个节点都对子树递归搜索，开销约为 O(节点数×深度)，搜索框也没有防抖。
- [ ] **P3** `components/app-shell/header/search-dialog.tsx:82,98-101`：受控的 query 让每次按键都重新渲染整个对话框并重跑 groupBy。
- [ ] **P3** `components/app-shell/index.tsx:59`、`app-breadcrumb.tsx:104`：`useBreadcrumbTrail` 计算了两遍。
- [ ] **P3** 每一行单元格都调用 `usePermission()`：`(app)/system/notice/-components/notice-columns.tsx:54-58`、`(app)/system/dept/-components/dept-columns.tsx:36`、`(app)/system/menu/-components/menu-columns.tsx:58`。建议在 list 中计算一次后传入。
- [ ] **P3** `(app)/tenant/management/-components/tenant-form-drawer.tsx:127-131`：编辑模式下不显示套餐选择，却仍然请求套餐字典。
- [ ] **P3** `hooks/use-fullscreen-transition.ts:40-52`：对 top/left/width/height 用 `transition: all`，每帧都触发布局。注释称是 FLIP，但实际没有用 transform。
- [ ] **P3【待确认】** `hooks/use-available-height.ts:46-66`：滚动时读写布局交替进行，最多循环 3 轮，造成强制同步布局。
- [ ] **P3** 无效的 memo：`(app)/system/file/-components/file-manager.tsx:140-252` 的 7 个 useCallback 被装进每次渲染都新建的对象；`(app)/system/dict/-components/dict-manager.tsx:140-143` 依赖每次渲染都会变的 query 对象；`(app)/tenant/package/-components/package-form-drawer.tsx:120-130` 只在 onSubmit 中调用一次。
- [ ] **P3** 打包体积：`json-viewer/themes.ts`、`navigation/menu-icons.ts` 的全量静态图标、未使用的 `flags.css` 和 fullcalendar（见第二节、第四节）。

## 七、使用了 HTML 原生组件（有对应的 shadcn 组件）

- [ ] **P2** `components/expiry-picker.tsx:102-112`：清除按钮用原生 `<button>`，没有 aria-label 和焦点样式。建议改为 `Button variant="ghost" size="icon-xs"`。
- [ ] **P2** `(app)/system/dept/-components/dept-columns.tsx:101-113`、`(app)/system/menu/-components/menu-columns.tsx:121-133`：展开按钮用原生 button，没有 `aria-expanded`，两处代码完全相同。建议改为 `Button size="icon-xs"`，并抽成共享的 `TreeNameCell`。
- [ ] **P2** `(app)/system/config/-components/site-preview.tsx:39-54`：用原生 button 手写分段控件。建议改用 `ToggleGroup`。
- [ ] **P2** `(app)/dashboard/-components/dashboard-notices.tsx:67-84`：原生 button，再用 `-mx-2 w-[calc(100%+1rem)]` 抵消内边距。建议改为 `Button variant="ghost"` 或 `Item`。
- [ ] **P3** `(app)/system/menu/-components/icon-picker.tsx:409-426`：图标格子用原生 button。建议改为 `Toggle`。
- [ ] **P3** `(app)/system/file/-components/file-storage-card.tsx:77-89`：类型导航用原生 button。建议改为 `Button variant="ghost"` 或纵向 `ToggleGroup`。
- [ ] **P3** `components/app-shell/app-breadcrumb.tsx:190-194`（`<button>` → Button）、`header/search-dialog.tsx:145-147`（手写 `<kbd>` → `Kbd`）、`components/rich-text-editor.tsx:165,198`（`span w-px bg-border` → `Separator`）、`header/user-menu.tsx:51`（带边框的 span → `Badge variant="outline"`）。
- [ ] **P3** `(main)/auth/-components/captcha-image.tsx:13-21`：可点击的 div 没有 role 和键盘支持，loading 用的是裸 `Loader2Icon`。建议改为 Button 承载图片，loading 用 `Spinner`。
- [ ] **P3** `(main)/auth/login/route.tsx:28-33`：用 Separator、span、Separator 拼出带文字的分隔线。建议改为 `FieldSeparator`。
- [ ] **P3** `<img>` 缺少 alt：`(app)/system/config/-components/image-upload-field.tsx:50`、`site-preview.tsx:90`。其他 `<img>` 没有对应的 shadcn 组件，可以保留。

## 八、多余的 className（与默认值相同、互相重复或不生效）

- [ ] **P3** 给按钮或菜单项里的图标写 `size-4`：Button、DropdownMenuItem、TabsTrigger 已经通过 `[&_svg:not([class*='size-'])]:size-4` 设了默认尺寸，Spinner 默认也是 `size-4`。涉及 `(app)/system/config/route.tsx:39-81,126`、`client/form-drawer.tsx:678`、`sms/columns.tsx:45,53,59`、各 columns 文件中的 `MoreHorizontal className="size-4"`、`(app)/system/dict/-components/dict-item-panel.tsx:111`、`dict-manager.tsx:233`。
- [ ] **P3** 与组件默认值重复：
  - `CardTitle text-base/text-sm`：`(app)/system/file/-components/file-storage-card.tsx:36`、`file-type-chart.tsx:53`、`file-grid.tsx`
  - `TableHead font-medium`：`storage/group-panel.tsx`
  - 单元格逐个写 `text-sm`：`file-table.tsx:18-52`
  - `FieldDescription text-muted-foreground`、Button `h-8`：`(app)/system/menu/-components/menu-form-drawer.tsx:337`、`icon-picker.tsx:524,542,560,609`
  - `TableCell align-middle`：`components/table-skeleton-rows.tsx:37`
  - Checkbox `size-4 shrink-0` 和 `icon-xs` 上的 `size-6`：`components/ui/tree.tsx:489,508`、`components/user-picker.tsx:142`
- [ ] **P3** `components/ui/tree-select.tsx:755-756`：PopoverContent 上的 `isolate z-50 rounded-lg shadow-md ring-1 ...` 都是默认样式。
- [ ] **P3** `components/checkable-tree.tsx:113,121`：InputGroup 上的 `h-8` 是默认值。
- [ ] **P3** `components/app-shell/app-breadcrumb.tsx:143,171,178,207,224`、`sidebar/nav-main.tsx:229`：与 BreadcrumbLink 默认值重复；菜单项里加 `gap-2` 改变了默认间距。
- [ ] **P3** `components/app-shell/header/header-tabs.tsx:275-298`：每个 Item 都重复写 `text-xs`；图标加 `mr-2`，与默认 gap 叠加。
- [ ] **P3** `components/app-shell/header/user-menu.tsx:36,38`：`rounded-lg` 与默认值重复；`space-y-1` 改变了菜单项间距；Avatar 上的 `rounded-lg` 不生效。
- [ ] **P3** `components/app-shell/header/layout-controls.tsx:41-216`：7 处 `Label font-medium` 是默认值，而且这些 Label 没有关联任何控件。
- [ ] **P3** `(app)/system/dept/-components/dept-form-drawer.tsx:265`、`role-form-drawer.tsx:310`、`(app)/system/menu/-components/menu-form-drawer.tsx:263,464`：horizontal Field 上的 `items-center justify-between` 被组件自身的选择器覆盖，不生效。
- [ ] **P3** `(app)/system/dept/-components/dept-parent-select.tsx:57-61`、`(app)/system/menu/-components/menu-parent-select.tsx:75-81`：传了 TreeSelect 的默认 props，`w-full` 也重复。
- [ ] **P3** `(app)/open/app/-components/app-display.tsx:40-41`（`icon-sm` 加 `size-6`，等于 `icon-xs`）、`app-secret-dialog.tsx:44,59`（`icon-sm` 加 `size-7`）、`(app)/system/config/-components/sms/columns.tsx`（`size="icon"` 加 `size-8`）。
- [ ] **P3** `(app)/dashboard/profile/-components/profile-header.tsx:50,87-88`：只包了一个子元素的 flex 容器。
- [ ] **P3** `components/json-viewer/json-viewer.tsx:567-597`：Badge 上的 `rounded-full px-2 py-0.5 font-medium` 是默认值。

## 九、在 shadcn 组件上额外叠加样式

- [ ] **【已核实】P2** `components/table-search.tsx:64,69`：默认 `h-7`，19 处调用全部传 `h-8` 改回来；`text-sm` 覆盖了 Input 的 `text-base md:text-sm`。建议默认改为 InputGroup 的高度，并删掉调用方的覆盖。
- [ ] **【已核实】P2** `components/password-input.tsx:15`：默认 `h-9`，相邻的 Input、SelectTrigger 都是 `h-8`，密码框高出一截。
- [ ] **【已核实】P2** `DialogContent` 传了不带断点的 `max-w-*`，移动端的 `max-w-[calc(100%-2rem)]` 被替换掉，弹窗贴边；桌面端仍由 `sm:max-w-sm` 生效，传入的宽度不起作用：`(app)/system/notice/-components/notice-user-picker.tsx:54`、`(app)/tenant/management/-components/tenant-admin-password-dialog.tsx:82`、`(app)/system/menu/-components/icon-picker.tsx:550`。建议改为 `sm:max-w-*`。
- [ ] **【已核实】P2** `Field className="gap-1.5"`（72 处）、`FieldGroup className="gap-4"`：在调用点重写组件间距，同一表单里有的覆盖有的不覆盖，例如 `(app)/system/config/-components/sms/form-drawer.tsx:267-526`。如果设计上就要这个间距，应统一修改组件默认值，或封装进字段组件。
- [ ] **【已核实】P2** `DrawerFooter className="flex-row justify-end gap-2 border-t p-4"`：17 处逐字复制，其中 `gap-2`、`shrink-0` 与默认值重复。见第十一节 `FormDrawerFooter`。
- [ ] **P2** `(app)/open/app/-components/app-reset-secret-dialog.tsx:68,82-85`：先设 `variant="destructive"`，再用 `bg-amber-600 ...` 全部覆盖。建议增加 warning variant 或使用 `status-warning` token。
- [ ] **P2** `(app)/system/menu/-components/menu-list.tsx:188`、`(app)/system/dict/-components/dict-toolbar.tsx:33`：在 outline Button 上叠加了同一串硬编码的 amber 类。
- [ ] **P2** `components/ui/tree-select.tsx:812-830`："全部"选项用 ghost Button 加十几个类覆盖，去模仿树节点。
- [ ] **P2** `components/ui/tree-select.tsx:763-783`、`json-viewer/json-viewer.tsx:607-628`：搜索框是 Input 加绝对定位图标手拼的，且覆盖了 `border-0 bg-transparent focus-visible:ring-0`。建议改用 `InputGroup`。
- [ ] **P2** `components/app-shell/header/github-help.tsx:18-42`：直接用 PreviewCard 原语，手写了 HoverCardContent 的整套默认样式，还少了进出场动画。建议改用 `HoverCard`。
- [ ] **P2** `components/status-cell.tsx:10-56`、`components/data-badge.tsx:10-75`：Badge 上覆盖了 `py-1`（Badge 固定 `h-5`，py-1 只会挤压内容）、`py-0.5`、`font-normal`、`px-1.5 py-0`，三处写法不一样。
- [ ] **P3** `(app)/system/dict/-components/dict-item-panel.tsx:90`、`dict-manager.tsx:221`：内置标记 Badge 覆盖了 `px-1 py-0 text-[10px]`。角色页的同一概念用的是 `FlagBadge`。
- [ ] **P3** `(app)/monitor/log/-components/log-display.tsx:29-41`、`(app)/open/app/-components/app-display.tsx:20-22`：在 Badge 上覆盖背景色和字号。建议改用 `StatusBadge` 的 tone。
- [ ] **P3** `components/app-shell/header/search-dialog.tsx:138-142`：用 `variant="link"` 再加 `hover:no-underline px-0!` 抵消 link 样式。
- [ ] **P3** `(app)/tenant/management/-components/tenant-form-drawer.tsx:439-446`：Button link 加 5 个覆盖类，硬改成行内链接。建议直接用 `<Link>`。
- [ ] **P3** `(app)/system/config/-components/image-upload-field.tsx:11-12,66,73-88`：在默认 variant 的 `icon-lg` Button 上覆盖尺寸、圆角、背景和边框；遮罩硬编码为 `bg-black/45`；用 shadcn Input 渲染一个隐藏的 file input。
- [ ] **P3** Avatar 用了档位外的尺寸，字号也是任意值：`components/user-picker.tsx:126-160`（`size-7`、`text-[11px]`）、`(app)/system/role/-components/role-user-add-drawer.tsx:303-383`（`size-6` 加 `text-[10px]`，等同于 `size="sm"`；还在每个 TableCell 上重复写 `py-2.5`）、`header/user-menu.tsx`（`size-9`）。
- [ ] **P3** `(app)/system/file/-components/file-grid.tsx:21-36`：`Card size="sm"` 自带 `py-3`，缩略图上方有空白（**【待确认】** 是否是设计意图）；骨架高度 `h-28` 与实际的 `h-36` 不一致，加载完会跳动。

## 十、UI 样式和风格不统一

- [ ] **【已核实】P2** 硬编码的调色板颜色共 62 处，没有使用项目已有的 `status-*`、`type-*` 语义 token：
  - `components/json-viewer/json-viewer.tsx`（语法色、搜索高亮）
  - `components/copy-button.tsx:60`（`text-green-600`）
  - `header/user-menu.tsx:34`（`bg-green-600`）
  - `(app)/open/app/-components/app-secret-dialog.tsx`、`app-reset-secret-dialog.tsx`（amber）
  - `(app)/system/dict/-components/dict-toolbar.tsx:33` 与 `(app)/system/menu/-components/menu-list.tsx:188`（同一串 amber）
  - `(app)/system/menu/-components/menu-form-drawer.tsx:87-115`（sky/emerald/purple）
  
  其中同一个"菜单类型"，表单用 sky/emerald/purple，`menu-columns.tsx:37-41` 的 TypeBadge 用 blue/teal/violet，两边色系对不上。搜索高亮也有两种：Tree 用 `bg-primary/20`，JSON 用 amber。`site-preview.tsx` 的窗口红黄绿圆点属于模拟窗口装饰，可以保留。
- [ ] **P2** 状态和类型徽标有三套色调映射：`components/status-cell.tsx`、`components/data-badge.tsx`、`(app)/system/dict/-components/dict-display.tsx:14-28`。
- [ ] **P2** 空值占位写法不一致：`EMPTY_PLACEHOLDER`（有的加 muted，有的不加）、写死的 `'—'`、`'-'`、`'无'` 混用。涉及 `components/data-badge.tsx:63,85`、`(app)/system/file/-components/file-table.tsx:49,52`、`file-detail-drawer.tsx:47`、`file-storage-card.tsx:88`、`(app)/system/notice/-components/notice-display.tsx:34`、`(app)/system/config/-components/sms/columns.tsx:110-148`、`(app)/dashboard/-components/dashboard-metrics.tsx:10`。`(app)/tenant/management/-components/tenant-display.tsx:4` 还把空值"未设置"标成了 `text-destructive`。
- [ ] **P2** 三种"像输入框的弹出触发器"背景和内边距各不相同：`components/date-range-filter.tsx:45`、`components/expiry-picker.tsx:91`、`components/ui/tree-select.tsx:715-718`。建议参照 SelectTrigger 抽一个共享的 `PickerTrigger` 类。
- [ ] **P2** 行操作菜单写法各不相同：外层对齐方式不同，`DropdownMenuContent` 宽度有 `w-36`、`w-40`、默认三种，Tooltip 的 sideOffset 也不一致。另外 sms 外露了"修改"按钮（`(app)/system/config/-components/sms/columns.tsx:33-66`），在线用户行内直接放了默认尺寸的 destructive 按钮（`(app)/monitor/online/-components/online-user-columns.tsx:53-62`）。
- [ ] **P2** 页面标题有三种写法：`(app)/dashboard/index.tsx:31`、`(app)/monitor/log/route.tsx:48`、`(app)/dashboard/profile/-components/profile-header.tsx:89`。另外 TabsList 固定 `px-4`，而内容区在 md 以上是 `px-6`，左边对不齐：`(app)/monitor/log/route.tsx:47-68`、`(app)/dashboard/profile/route.tsx:30,49`。
- [ ] **P3** 骨架屏高度用 `h-9`，真实控件是 `h-8`，加载完成后会跳动：`(app)/system/dept/-components/dept-form-drawer.tsx:154-158`、`role-form-drawer.tsx:223-227`、`(app)/system/menu/-components/menu-form-drawer.tsx:284-288`、`(app)/tenant/management/-components/tenant-form-drawer.tsx:97`、`(app)/tenant/package/-components/package-form-drawer.tsx:85`。FieldGroup 间距也不统一：dept/menu 用 gap-4，user/role 用默认的 gap-5。
- [ ] **P3** 提交态和文案不统一："修改中…"与 Spinner 加"保存中"并存（`(app)/dashboard/profile/-components/password-form.tsx`）；"添加中"没有 Spinner、"清空"用了主色按钮、部门筛选写"全部部门"而 user-list 写"全部"（`(app)/system/role/-components/role-user-add-drawer.tsx:217,352,421`）；分配角色弹窗保存中按 Esc 也能关闭（`user-assign-roles-dialog.tsx:169-173`）。
- [ ] **P3** 加载指示器不统一：`(main)/social/callback/route.tsx:46` 用 `Loader2Icon size-6`，AuthPending 用 `Spinner size-5`，captcha 也用裸 Loader。
- [ ] **P3** 焦点环不统一：`(app)/system/file/-components/file-manager.tsx:373,397` 用 `ring-2`，项目统一的是 `ring-3 ring-ring/50`；`components/rich-text-editor.tsx:149` 编辑器没有 focus-within 焦点环。
- [ ] **P3** 同一份数据在列表和详情中渲染方式不同：`(app)/system/config/-components/client/detail-drawer.tsx:52,83-85` 用 `Badge outline`，`client/columns.tsx:157-160,211` 用 `TypeBadge`/`FlagBadge`。
- [x] **P3** TreeSelect 与 CheckableTree 的展开/收起按钮文案（"全部展开" / "展开全部"）、图标尺寸（size-3 / size-3.5）、aria-label 不一致：`components/ui/tree-select.tsx:789-805`、`components/checkable-tree.tsx:148-193`。**2026-11-10 已统一**：抽 `TreeExpandActions`，图标统一 `size-3`，文案统一“展开全部 / 折叠全部”，两个调用方均带 aria-label；展开状态抽到 `hooks/use-tree-expansion.ts`。
- [ ] **P3** 同类列表页工具栏的响应式写法不同：`(app)/tenant/management/-components/tenant-list.tsx:157,167` 与 `(app)/schedule/job/-components/job-list.tsx:235,244`；tenant 的序号列和状态列没有居中（`tenant-columns.tsx:126,148`）。
- [ ] **P3** `(app)/dashboard/index.tsx:50-55`：Geo 卡片没有 `h-full`，同一行左右两张卡片底部不齐。
- [ ] **P3** `(app)/system/config/-components/config-panel-header.tsx:52-54`：card 变体的标题和描述排版与其他 tab 不同。
- [ ] **P3** `(app)/system/config/-components/sms/form-drawer.tsx:379,430,493`：固定 `grid-cols-2`，同一表单其他地方是 `grid-cols-1 sm:grid-cols-2`。
- [ ] **P3** `(app)/schedule/job/-components/job-form-drawer.tsx:680-693`：分片参数的删除按钮是 `icon-sm`（size-7），同一行的 Input 是 h-8，高度对不齐。
- [ ] **P3** 选中行颜色：`(app)/system/role/-components/role-user-add-drawer.tsx` 用 `[&_th]:bg-muted`，这种写法在项目中只出现在这里。

## 十一、可复用 / 可优化的代码

跨模块的公共抽取，按收益从高到低排列：

- [ ] **P2 表单字段组件**：用 `createFormHook` 注册 `TextField/NumberField/SelectField/SwitchField/TextareaField` 和 `SubmitFooter`。覆盖全部表单抽屉，重复最多的是 `(app)/system/config/-components/{client,sms,storage}/form-drawer.tsx`（约 30 段相同模板）以及 tenant、job、package、dict、notice 的表单。同目录已有的 `text-field.tsx`、`switch-field.tsx` 可作为起点，`SwitchField` 需要改成受控。
- [ ] **【已核实】P2 `RowActionsMenu`**：16 个 columns/actions 文件重复同一套"更多操作"下拉骨架，抽出后可同时统一宽度、对齐和危险项分组。
- [ ] **【已核实】P2 `FormDrawerFooter` / `EntityDrawerFooter`**：17 处取消、保存加 Spinner 的底栏逐字复制。
- [ ] **P2 `ConfirmDialog`**：在 `components/delete-confirm-dialog.tsx` 基础上增加 tone/variant，替换手写确认弹窗：`online-user-kickout-dialog`、`app-reset-secret-dialog`、`job-trigger-dialog`、`job-log-action-dialog`、`file-recycle-drawer` 的删除和清空。
- [ ] **【已核实】P2 列定义 helper**：`textColumn` 在 10 个 columns 文件中各定义一份，序号列也重复（只有 app 加了 `tabular-nums`）。建议在公共层提供 `textColumn<T>()` 和 `indexColumn()`，dept、role、menu 自写的 `<span>{v || EMPTY_PLACEHOLDER}</span>` 统一改用 `TextCell`。
- [ ] **【已核实】P2 `TextDetail`**：在 5 个详情抽屉中各定义一份。建议移到 `components/detail-field.tsx`。
- [ ] **P2 树表页**：`(app)/system/dept/-components/dept-list.tsx` 与 `menu-list.tsx` 的过滤、展开、高度测量、搜索框几乎逐行相同。建议抽出 `useTreeListTable` 和共享的 `TreeNameCell`；搜索框改用 `TableSearch`（已支持受控和 clearable）；高度改用 `TableFillArea`；`dept-parent-select` 与 `menu-parent-select` 的公共逻辑抽成 hook。
- [ ] **P2 `FormSelect`**：`SelectTrigger w-full` 加 `SelectContent alignItemWithTrigger={false}` 加 map 的写法，在 job（4 处）、tenant、client（4 处）、sms 中重复。
- [ ] **P2 单位后缀输入框**：`(app)/system/config` 下 7 处用 relative 容器加绝对定位 span 手写单位后缀。同目录的 `text-field.tsx`、`config-security.tsx:110` 已经用 `InputGroupAddon` 实现。
- [ ] **P2 `ToneBadge`**：合并 `status-cell`、`data-badge`、`dict-display` 三套色调映射，基于 cva 实现，去掉对 Badge 默认值的覆盖。
- [ ] **P2 骨架宽度按列 id 映射**：`getVisibleLeafColumns().map(...SKELETON_WIDTHS...)` 在 7 处重复。下沉到 DataTable 之后，第四节列出的 4 个包装组件可以删除，`app-list` 的错位问题也会一并解决。
- [ ] **P2 `(app)/system/role/-components/role-user-drawer.tsx:257-305`**：手写表头、行、骨架、错误和空态，等于重写了一遍 `DataTable`。`role-user-add-drawer.tsx` 还自写了 `PaginationFooter`。
- [ ] **P2 文件模块**：
  - `file-type-chart.tsx:22-25,102-111` 直接用 Recharts，Tooltip 写内联样式，注释也过时了。建议改用 `ui/chart` 的 `ChartContainer` 和 `ChartTooltip`。
  - `file-display.tsx` 中的类型、图标映射有三份，`isImageFile` 已存在但仍有两处直接写 `type === 2`。
  - `file-storage-card` 和 `file-type-chart` 各算一遍 `typeStats`。
  - `file-manager` 和 `file-recycle-drawer` 各自手写分页和页码 clamp。
  - `file-recycle-drawer` 的错误态没有用 `QueryState`。
  - `file-name-dialog` 手写校验，没有用 TanStack Form 加 zod。
- [ ] **P2 配置面板**：
  - `config-login/mail/security/site` 4 个面板逐字重复 header 和 reset dialog 的 props 传递。建议让 `useOptionForm` 直接返回 `headerProps`/`resetDialogProps`；`isRequired`、`nonBlank` 移到公共位置。
  - `config-security.tsx:31-36,140-145` 的 min/max/单位写了两份，已经出现不一致。建议改为一份 `POLICY` 配置，schema 和渲染都从它生成。
  - `client/columns.tsx` 与 `client/detail-drawer.tsx` 重复了时长、登录数的格式化逻辑。
  - `storage/toolbar.tsx:55-63` 重新实现了 `TableToolbar` 的按钮。建议把 TableToolbar 的 `table` 改为可选。
- [ ] **P2 字典选项 hook**：`(app)/system/notice/-components/use-notice-dicts.ts:20-76` 与 `(app)/system/config/-components/use-dict-options.ts` 逻辑相同。建议把 `useDictOptions` 提到 `src/hooks/`。
- [ ] **P2 `PageTabsList` / `PageHeader`**：`(app)/monitor/log/route.tsx:53-65`、`(app)/dashboard/profile/route.tsx:28-46`、`(app)/system/config/route.tsx:126` 三处复制了同一套可横向滚动的 line Tabs。
- [ ] **P3** `STATUS_OPTIONS`（全部/启用/禁用）重复多份：`client/config-client.tsx:49-53`、`storage/config-storage.tsx:48-52`、user-list、package-list、`lib/api/job.ts`。建议放进 `lib/constants`。
- [ ] **P3** `lib/api/job.ts:92-138`、`lib/api/job-log.ts:33-50`：`*_OPTIONS` 可以从 `*_LABELS` 派生。`job-log-columns.tsx:41-42` 用魔法数字 2 和 4/5/6 判断状态，建议导出具名常量。
- [ ] **P3** `/dashboard` 的标题和图标在 `navigation/menu.ts:66-73`、`navigation/route-titles.ts:2-11`、`stores/tabs.ts:14-20`、`header-tabs.tsx:153` 中各写一份。建议收敛成一张静态路由表。
- [ ] **P3** `lib/preferences/theme.ts:6-57`：20 个主题预览色与 `theme-colors.css` 中的 `--primary` 重复维护。
- [ ] **P3** `components/app-shell/header/layout-controls.tsx:104-232`：6 个结构相同的 ToggleGroup，可以抽成 `PreferenceToggle` 并用配置数组渲染。`themeColorItems` 和 SelectItem 中的颜色圆点也重复了。
- [ ] **P3** `components/json-viewer/json-viewer.tsx:142-157,506-511`：3 处复制直接调 clipboard，没有 catch，setTimeout 也不清理。建议复用 `CopyButton` 或抽一个 `useCopy`。`:229-364` 中叶子节点和可展开节点的行结构重复。
- [ ] **P3** 登录与个人中心：`login-form.tsx:133-143` 和 `password-form.tsx` 用的是 `Input type="password"`，建议改用 `PasswordInput`；`password-form.tsx:67-73` 和 `social/callback/route.tsx:51-55` 手写 toast，建议改用 `reportError`；回调页建议复用 `AuthPending`。
- [ ] **P3** `(app)/system/dept/-components/dept-list.tsx:134-140`：导出用 useMutation 加自定义 toast，其他页面用的是 `useExport`。
- [ ] **P3** `(app)/system/dict/-components/dict-manager.tsx:78-79,177-181`：手写的高度计算与 `TableFillArea` 相同。
- [ ] **P3** `components/user-picker.tsx:111,126-160`：空状态是手写的，建议用 `QueryState`；"头像 + 标题 + 描述"的行结构建议改用 `Item`。
- [ ] **P3** `(app)/dashboard/-components/dashboard-distributions.tsx:13-102`、`dashboard-metrics.tsx:51-107`：4 个分布组件和 4 张指标卡结构相同，可以改为配置数组渲染。
- [ ] **P3** `(app)/dashboard/profile/-components/profile-overview.tsx:24-50`、`profile-personal-details.tsx:18-51`：手写的 label/value 块与 `DetailGrid`/`DetailField` 相同。
- [ ] **P3** 表单和详情的骨架屏（tenant、package 各两份）可以抽成公共的 `FormSkeleton` 和 `DetailGridSkeleton`。

## 十二、实现不够优雅

- [ ] **P3** `(app)/schedule/log/-components/job-log-action-dialog.tsx:83-108`：用四分支嵌套三元在"停止"和"重试"之间切换文案。`(app)/system/file/-components/file-recycle-drawer.tsx:247-293` 也有 restore/delete/clean 三层三元。
- [ ] **P3** `(app)/schedule/log/-components/job-log-display.tsx:22-33`：靠 `label === '无'` 字符串比较判断空值。
- [ ] **P3** `(app)/system/file/-components/file-actions.tsx:51-54`、`file-grid.tsx:26,40`：同一张卡片上，点缩略图、点文件名、点菜单"打开"走三套不同逻辑；嵌套三元中调用了 3 次 `isImageFile`。
- [ ] **P3** `(app)/schedule/job/-components/job-detail-drawer.tsx:55,83`、`(app)/tenant/package/-components/package-detail-drawer.tsx:67`：用空 `<div />` 在网格里占位换行。
- [ ] **P3** `(app)/system/user/-components/user-list.tsx:134`：`> 12` 写死了列数，列一变就失效。
- [ ] **P3** `(app)/dashboard/profile/-components/profile-record.ts:85-96`：字段名和内容不符，例如 `pronouns` 存的是性别、`legalName` 存的是昵称、`contractorId` 存的是用户 ID。
- [ ] **P3** `(app)/monitor/online/-components/online-user-kickout-dialog.tsx:35-38`：昵称与用户名相同时拼成"admin(admin)"，半角和全角括号混用。
- [ ] **P3** `(app)/dashboard/-components/dashboard-distributions.tsx:41-44`：为了 Y 轴显示截断了原始数据，tooltip 里也只能看到截断后的名称。建议改用 `tickFormatter`。
- [ ] **P3** `(app)/open/app/-components/app-secret-dialog.tsx:68-111`：关闭时正文内容清空，弹窗高度塌陷。"保留关闭前记录"的写法 app 与 log（`log-list.tsx:73-84`，保留 id 只切换 open）不一致。
- [ ] **P3** `components/app-shell/sidebar/nav-main.tsx:105-107,250`：`isSubmenuOpen` 与 `isItemActive` 逻辑相同；Collapsible 的 render 手抄了 SidebarMenuItem 的属性。
- [ ] **P3【待确认】** `lib/preferences/theme-utils.ts:15-20`：添加 `disable-transitions` 后没有强制样式重算，过渡可能实际没有被禁用。
- [ ] **P3【待确认】** `hooks/use-fullscreen-transition.ts:84-107`：document 级的 Escape 监听可能与全屏容器内弹窗的 Esc 关闭冲突。

---

## 建议的处理顺序

1. 第一节 P1：树级联、站点配置缓存、菜单详情缓存、公告 HTML 净化、个人资料 mock 数据。
2. 第一节 P2 中用户能直接看到的问题：数字框回填、重新加载无效、提交中可取消、重复提示、发布时间显示错误、弹窗宽度。
3. 删除第二节的死代码和无用依赖（fullcalendar、flags.css、json-viewer 主题表），减小包体积。
4. 修正几个默认值：TableSearch、PasswordInput 的高度，`globals.css` 的全局字号规则，Field/DrawerFooter 的间距。改完后可以删掉调用方大量的覆盖 class。
5. 按第十一节逐步抽取公共件，先做 `RowActionsMenu`、`FormDrawerFooter`、`createFormHook` 字段组件，再顺带统一第十节的风格问题。
