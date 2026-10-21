# 前端代码审计 Checklist

> 最后同步：2026-10-21。原始 35 条全部保留；新增 12 条（36–47）。另有 11、13、27、28、31 按复查结果扩面，不另计条目。  
> 状态：`[x]` 已修复；`[ ]` 待处理。

共 **47 条**：P1 3 条（01、02、03 已修复）、P2 21 条、P3 23 条。当前待处理 23 条。**P1 优先修复，P2 功能或工程风险，P3 维护与样式优化建议。**

本次为静态审计，覆盖业务管理页、共享组件、请求与状态层，以及部分仪表盘页面；未进行运行时性能测试。原生 HTML、必要的异常处理和合理的 `className` 扩展本身不算问题。文件行号对应当前代码。

- [x] **01 · P1｜旧会话的刷新结果可能覆盖新会话。［已修复 2026-10-21］** 刷新写回前校验 auth generation；单飞刷新按 generation 隔离；重试携带原世代；登录换号时 `setSession` 推进世代。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:143](<E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:143>)；[E:/ppxb/continew-next/continew-ui-next/src/lib/auth-session.ts:104](<E:/ppxb/continew-next/continew-ui-next/src/lib/auth-session.ts:104>)

- [x] **02 · P1｜用户信息请求可能在退出后恢复旧用户状态。［已修复 2026-10-21］** `loadUser()` 现在按 generation 分组单飞，响应写回前校验 generation；`clearLocalSession` 和无 token 分支会使旧请求失效；登录新会话先清空旧身份。旧请求即使返回 200 也不会覆盖新会话，也不会被新登录复用。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:68](<E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:68>)；[E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:111](<E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:111>)；[E:/ppxb/continew-next/continew-ui-next/src/lib/auth-session.ts:104](<E:/ppxb/continew-next/continew-ui-next/src/lib/auth-session.ts:104>)

- [x] **03 · P1｜会话过期退出遗漏查询缓存清理。［已修复 2026-10-21］** 过期回调与手动退出现在共用 `endSession`：取消在途查询、清 Auth Store、重置页签、跳登录页、清空 React Query 缓存；过期路径保留 `redirect`。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-provider.tsx:43](<E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-provider.tsx:43>)；[E:/ppxb/continew-next/continew-ui-next/src/hooks/use-logout.ts:19](<E:/ppxb/continew-next/continew-ui-next/src/hooks/use-logout.ts:19>)；[E:/ppxb/continew-next/continew-ui-next/src/lib/end-session.ts:14](<E:/ppxb/continew-next/continew-ui-next/src/lib/end-session.ts:14>)

- [x] **04 · P2｜退出时不再等待后端撤销。［已修复 2026-10-21］** `/auth/logout` 改为发起后立即本地清理并跳转：会话失效路径用 `keepalive` 背景请求；手动退出同样先发请求、立即清 Store/页签并导航。后端撤销失败不影响本地登出，30 秒超时只作用于后台请求。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:186](<E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:186>)；[E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:118](<E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:118>)；[E:/ppxb/continew-next/continew-ui-next/src/lib/end-session.ts:14](<E:/ppxb/continew-next/continew-ui-next/src/lib/end-session.ts:14>)

- [x] **05 · P2｜下载请求二次 401 未复用会话失效流程。［已修复 2026-10-21］** 下载刷新后再次 401 现在与普通请求共用 `throwSessionExpired`：校验 generation、读取错误消息、清会话并抛错；不会保留无效会话。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:225](<E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:225>)；[E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:322](<E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:322>)

- [x] **06 · P2｜菜单图标解析 eager 引入 Lucide 全量图标。［已修复 2026-10-21］** `menu-icons` 改为静态常用映射 + `DynamicIcon` 按名称动态加载，不再导入全量 `icons`；`icon-picker` 改为懒加载组件，完整目录只在打开菜单表单时加载。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/navigation/sidebar/menu-icons.ts:334](<E:/ppxb/continew-next/continew-ui-next/src/navigation/sidebar/menu-icons.ts:334>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-form-drawer.tsx:23](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-form-drawer.tsx:23>)；[icon-picker.tsx:3](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/icon-picker.tsx:3>)

- [x] **07 · P3｜图标列表滚动时持续累积 DOM。［已修复 2026-10-21］** 网格改为 `@tanstack/react-virtual` 行虚拟化，只渲染视口附近行；移除 `visibleLimit` 与“加载更多”；滚动容器使用 `scroll-fade`。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/icon-picker.tsx:449](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/icon-picker.tsx:449>)；[滚动容器:471](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/icon-picker.tsx:471>)；[E:/ppxb/continew-next/continew-ui-next/package.json:35](<E:/ppxb/continew-next/continew-ui-next/package.json:35>)

- [x] **08 · P2｜客户端保存中仍可关闭抽屉。［已修复 2026-10-21］** 表单迁移到 TanStack Form 后只有一个 `isSubmitting`（`useSelector(form.store, …)`）：抽屉 `onOpenChange`、右上 X、取消与保存四处共用它，不再出现 `mutate()` 同步返回后状态提前复位的分叉。同类写法已推广到其余抽屉与弹窗。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:234](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:234>)；关闭按钮 [:246](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:246>)；底部按钮 [:610](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:610>)

- [x] **09 · P2｜客户端详情加载失败后仍显示可提交的默认表单。［已修复 2026-10-21］** 增加详情错误分支：失败时只渲染「加载失败，请稍后重试」，表单不再出现，默认值无法提交到现有记录。client 与 sms 抽屉已统一。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:142](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:142>)

- [x] **10 · P2｜清空有效期输入框会被自动转换成“不限制”。［已修复 2026-10-21］** `activeTimeout`、`timeout`、`refreshTokenTimeout`、`maxLoginCount` 改为以文本保存（`integerText`），清空后保持为空而不是被写成 `-1`/`0`；提交时再 `Number()` 转换。`-1` 仍是合法业务值，空值由字段校验报「请输入有效整数」。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:369](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:369>)；[activeTimeout:334](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:334>)；[maxLoginCount:531](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:531>)

- [x] **11 · P2｜保存失败会重复弹出错误提示。［已修复 2026-10-21］** `ApiError` 增加 `notified` 标记，`fail()` 在非 `silent` 时置位；新增 `reportError(err, fallback)`：已提示过的错误不再重复，本地失败与 `silent` 接口（`login`、`updatePassword`）仍由调用方提示。  
  迁移涉及的表单与菜单/部门/客户端/短信/Option 的重复 `onError` toast 已全部改为 `reportError`。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:221](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:221>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/use-option-form.ts:70](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/use-option-form.ts:70>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-list.tsx:184](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-list.tsx:184>)

- [x] **12 · P2｜过度兜底把查询失败伪装成成功空数据。［已修复 2026-10-21］** 10 处 `.catch(() => [])` 已移除（`useNoticeDicts` 4、`useSiteOptions` 1、`config-client` 4、`config-sms` 1），失败重新变成 reject，`isError` 与查询层重试恢复作用；展示层的默认值与 `FALLBACK_*` / `*_PRESETS` 保持不变。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/use-notice-dicts.ts:35](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/use-notice-dicts.ts:35>)；[E:/ppxb/continew-next/continew-ui-next/src/hooks/use-site-options.ts:13](<E:/ppxb/continew-next/continew-ui-next/src/hooks/use-site-options.ts:13>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/config-client.tsx:84](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/config-client.tsx:84>)；[config-sms.tsx:86](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/sms/config-sms.tsx:86>)

- [x] **13 · P3｜搜索防抖不一致。［已修复 2026-10-21］** 新增 `useDebouncedValue` + 共享常量 `SEARCH_DEBOUNCE_MS = 300`，7 处手写 `setTimeout` 全部替换、6 份重复常量删除；menu/dept 本地过滤改为即时（`keyword = searchInput.trim()`，不再白等 250ms）；notice-user-picker 改为停手 300ms 后再请求，避免每键一次 `listUsers`。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:38](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:38>)；[E:/ppxb/continew-next/continew-ui-next/src/components/table-search.tsx:47](<E:/ppxb/continew-next/continew-ui-next/src/components/table-search.tsx:47>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-list.tsx:98](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-list.tsx:98>)；[dept-list.tsx:98](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dept/-components/dept-list.tsx:98>)

- [x] **14 · P2｜通知用户查询失败被显示为“未找到用户”。［已修复 2026-10-21］** 渲染增加 `isError` 分支：失败时显示「用户列表加载失败，请稍后重试」和「重新加载」（`refetch`），与 pending、空结果分开；只有查询成功且列表为空才显示「未找到用户」。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:103](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:103>)

- [x] **15 · P2｜通知用户复选框没有关联用户姓名。［已修复 2026-10-21］** 行改为 `Field` + `FieldLabel`，`htmlFor` 指向复选框 id：姓名与部门信息成为复选框的可访问名称，整行点击由原生 label 转发；移除了外层 `div` 的 `onClick`、复选框的 `stopPropagation`，以及只在未选中时出现的手型光标，选中态也保持整行可点。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:121](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:121>)

- [x] **16 · P2｜回收站固定只加载前 100 条，没有后续分页入口。［已修复 2026-10-21］** 改为每页 10 条的服务端分页：`page` 进入 queryKey，抽屉底部新增「第 x / y 页」与上一页/下一页（复用 shadcn `Pagination`，与角色成员抽屉一致）；切页时用 `placeholderData` 保留上一页内容并降低不透明度，关闭抽屉重置页码，还原/删除/清空导致当前页越界时自动回退到最后一页。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:64](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:64>)

- [x] **17 · P2｜部分文件上传成功后再失败，不会刷新列表与统计。［已修复 2026-10-21］** `upload()` 记录本次成功数；失败时只要有文件落库就立即调用 `onUploaded()`（`refreshFiles` 失效 `fileKeys.all`，列表、统计、回收站缓存一起刷新），错误文案改为「已上传 x 个，y 个未完成，请重试」；成功提示也改用实际成功数。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-upload-dialog.tsx:84](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-upload-dialog.tsx:84>)

- [x] **18 · P2｜富文本工具栏没有订阅选区状态。［已修复 2026-10-21］** 工具栏状态改为 `useEditorState` 一次性订阅（`canUndo`/`canRedo`，加粗/斜体/删除线/行内代码/二级标题/无序列表/有序列表/引用），选区变化也会触发重渲染；默认的 `circularDeepEqual` 保证字段没变时不重渲染，编辑器未创建时回退到全 false 的静态状态。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/components/rich-text-editor.tsx:111](<E:/ppxb/continew-next/continew-ui-next/src/components/rich-text-editor.tsx:111>)

- [x] **19 · P2｜富文本撤销和重做按钮没有遵守外部禁用状态。［已修复 2026-10-21］** 撤销/重做改为 `disabled || !toolbarState.canUndo` / `disabled || !toolbarState.canRedo`，与其余工具栏按钮一致；外部禁用时不再执行命令，可用态也随历史变化刷新。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/components/rich-text-editor.tsx:151](<E:/ppxb/continew-next/continew-ui-next/src/components/rich-text-editor.tsx:151>)

- [x] **20 · P2｜短信配置复制操作未完成就提示成功。［已修复 2026-10-21］** Access Key 单元格改为复用 `CopyableText`：`await navigator.clipboard.writeText()` + `try/catch`，成功显示打勾反馈，失败提示「复制失败，请手动选择」，不再提前弹成功 toast；原生 `<button>` 一并换成 `Button` + `Tooltip`。为保留单元格的截断样式，`CopyableText` 增加可选 `className`（仅作用于值文本）。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/sms/columns.tsx:52](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/sms/columns.tsx:52>)；[E:/ppxb/continew-next/continew-ui-next/src/components/copyable-text.tsx:14](<E:/ppxb/continew-next/continew-ui-next/src/components/copyable-text.tsx:14>)

- [x] **21 · P2｜菜单类型用三个原生按钮手写单选控件。［已修复 2026-10-21］** 改为 shadcn `RadioGroup` + 每项 `Label`（整块可点）：radiogroup/radio 语义、`aria-checked`、方向键切换与单一 Tab 停靠点由 Base UI 提供；单选控件本体 `absolute size-0 opacity-0`（不显示也不占位），键盘聚焦时整块卡片显示 focus ring；三项收进 `MENU_TYPE_OPTIONS` 常量映射，重复的三套条件样式只剩各自色板；编辑态整组 `disabled`，不再用 `pointer-events-none` 伪造禁用。选中态视觉上仍以配色区分。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-form-drawer.tsx:291](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-form-drawer.tsx:291>)

- [ ] **22 · P2｜图标清除控件嵌套在另一个按钮内。** DialogTrigger 的 Button 内部又放置可聚焦的 `span role="button"`；只处理 Enter，没有 Space，还把键盘事件强转为鼠标事件。应拆成独立清除按钮。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/icon-picker.tsx:492](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/icon-picker.tsx:492>)

- [ ] **23 · P2｜分页的禁用状态只改变透明度。** 到达首尾页后，上一页/下一页仍是可聚焦、可触发的链接，没有表达真实禁用状态。4 个复制表格改用 `pointer-events-none`，但键盘仍可触发。应统一禁用语义、事件处理和视觉状态。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/components/table-pagination.tsx:92](<E:/ppxb/continew-next/continew-ui-next/src/components/table-pagination.tsx:92>)

- [ ] **24 · P2｜树组件的“全选”忽略节点禁用状态。** 单节点操作支持 `disabled`，但全选直接提交 `index.allKeys`。这是共享组件契约不一致，应明确禁用节点在批量选择中的处理规则。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:65](<E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:65>)

- [ ] **25 · P3｜通过解析 class 字符串推断组件布局。** `className.includes('flex-1')` 将布局行为绑定到字符串，`md:flex-1` 也会触发所有断点的伸展布局。应通过明确属性或容器样式表达布局。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:77](<E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:77>)

- [ ] **26 · P3｜树数据更新会重置用户的展开状态。** 注释写“首次加载展开全部”，但 effect 随索引变化重复执行。应只初始化一次，或在数据更新时保留仍然有效的展开键。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:50](<E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:50>)

- [ ] **27 · P3｜业务表格实现分裂为四套。［复查扩面］** 15 张 TanStack 表中，9 张使用共享分页，4 张（app/client/sms/role，224–226 行）各自复制整套分页和骨架，menu/dept 又复制骨架；dict/file 另有两套自定义表。建议抽 `DataTableShell` 和共享分页，先迁移 4 张大表。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-table.tsx:22](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-table.tsx:22>)；[open/app/-components/app-table.tsx:31](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/open/app/-components/app-table.tsx:31>)；[client/table.tsx:32](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/table.tsx:32>)；[dict-table.tsx:13](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dict/-components/dict-table.tsx:13>)

- [ ] **28 · P3｜详情字段与复制逻辑大量重复。［复查扩面］** `DetailField` 至少 8 处重复；复制逻辑分布在 9 个文件，`COPIED_FEEDBACK_MS` 出现 6 次；已有 `CopyableText` 只被 4 个详情页使用。成功反馈也不一致。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-detail-drawer.tsx:20](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-detail-drawer.tsx:20>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/detail-drawer.tsx:19](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/detail-drawer.tsx:19>)；[E:/ppxb/continew-next/continew-ui-next/src/components/copyable-text.tsx:12](<E:/ppxb/continew-next/continew-ui-next/src/components/copyable-text.tsx:12>)

- [ ] **29 · P3｜业务表格重复添加底层已有的 class。** 例如 `TableRow` 的 `hover:bg-muted/50`、`TableCell` 的 `align-middle`、`TableHead` 的 `whitespace-nowrap` 均已有默认实现，可删除调用处的重复声明。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-table.tsx:37](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-table.tsx:37>)；[E:/ppxb/continew-next/continew-ui-next/src/components/ui/table.tsx:30](<E:/ppxb/continew-next/continew-ui-next/src/components/ui/table.tsx:30>)

- [ ] **30 · P3｜通过额外样式重新定义 shadcn Button 尺寸。** “清空”按钮使用 `size="sm"`，又覆盖 `h-6 px-2 text-xs`；本地已有接近该规格的 `size="xs"`。应优先使用已有尺寸变体，减少样式覆盖。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:150](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:150>)

- [ ] **31 · P3｜聊天页单独覆盖共享滚动条宽度。［复查扩面］** 通过深层选择器将滚动条改为 `w-1.5`，与共享 ScrollArea 的 `w-2.5` 规格不同；dict/storage/kanban 又使用 4px/h-1。建议统一滚动条规格，或在 `globals.css` 定义紧凑工具类。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/chat/-components/chat-conversation-list.tsx:82](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/chat/-components/chat-conversation-list.tsx:82>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dict/-components/dict-table.tsx:14](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dict/-components/dict-table.tsx:14>)

- [ ] **32 · P3｜地图配色使用多组硬编码十六进制颜色。** `bg-[#d4dadc]`、`fill-[#fafaf8]` 等绕过主题 token，主题预设变化时仍保持固定配色。应优先采用语义颜色或明确的共享地图色板。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/dashboard/logistics/-components/shipment-route-map.tsx:171](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/dashboard/logistics/-components/shipment-route-map.tsx:171>)

- [ ] **33 · P3｜邮件页面保留挂载后才能显示内容的门禁。** `isMounted + useEffect` 无条件先显示一次 Loading，再渲染实际布局。项目是纯 SPA，可直接初始化所需浏览器状态，减少额外首屏渲染。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/mail/-components/mail.tsx:21](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/mail/-components/mail.tsx:21>)

- [ ] **34 · P3｜完成回调被设计为必填，但调用方只传空函数。** 公告表单和删除弹窗传入 `onCompleted={() => undefined}`，增加了没有实际职责的接口和样板代码。可移除无用回调，或仅在确有扩展需求时设为可选。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-list.tsx:237](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-list.tsx:237>)

- [x] **35 · P3｜同类管理表单使用两套实现体系。［已修复 2026-10-21］** 业务侧 19 个表单与仪表盘 `invoice` 演示页已全部迁到 TanStack Form；`react-hook-form`、`@hookform/resolvers` 已从 `package.json` 移除，项目内不再引用。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx:3](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx:3>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:6](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:6>)

- [ ] **36 · P2｜字典项和通知用户被固定截断在前 100 条。** `dict-panel` 只取 100 个字典项且没有分页；通知表单只用前 100 个用户解析姓名，选择器搜索也最多 100 条。超过后字典项不可见，通知用户只能显示“用户 {id}”。与 16 同类。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dict/-components/dict-panel.tsx:57](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dict/-components/dict-panel.tsx:57>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-form-drawer.tsx:119](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-form-drawer.tsx:119>)；[notice-user-picker.tsx:39](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:39>)

- [ ] **37 · P2｜HeaderTabs 将关闭按钮嵌套在 Link 内。** `<Link>` 内又渲染 `<button>`，属于嵌套交互元素，键盘和读屏语义会混淆；`preventDefault/stopPropagation` 只掩盖了行为，没有修正结构。应把关闭按钮移到 Link 外。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/components/app-shell/header/header-tabs.tsx:197](<E:/ppxb/continew-next/continew-ui-next/src/components/app-shell/header/header-tabs.tsx:197>)

- [x] **38 · P3｜表单回填策略不统一，部分表单会覆盖正在编辑的内容。［已修复 2026-10-21］** client、sms、storage、role、dept、menu 六个表单统一为 `filledForRef` 一次性回填 + `keepDefaultValues`；SMS 的 `supplierOptions` 不再触发重置，菜单按 id 回填，重取详情不会覆盖正在编辑的内容。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:149](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:149>)；[sms/form-drawer.tsx:142](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/sms/form-drawer.tsx:142>)；[user-form-drawer.tsx:320](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx:320>)

- [x] **39 · P3｜必填星号有 29 处绕过 `RequiredMark`。［已修复 2026-10-21］** 29 处全部替换（client 8、storage 9、sms 5、menu 3、dept 3、app-form 1）；`src` 中除 `required-mark.tsx` 自身外已无手写星号。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:265](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/client/form-drawer.tsx:265>)；[storage/form-drawer.tsx:367](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/storage/form-drawer.tsx:367>)；[sms/form-drawer.tsx:243](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/sms/form-drawer.tsx:243>)

- [ ] **40 · P3｜抽屉头与列表页脚手架大量重复。** 26 个抽屉复制同一段 `DrawerHeader` + 关闭按钮 + 宽度变量；17 个列表页复制全屏 spacer + `CardHeader/CardAction`。建议抽 `EntityDrawer` 和 `ListPageCard`，减少宽度、图标、关闭按钮的重复维护。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:106](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:106>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx:353](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx:353>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-list.tsx:272](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/menu/-components/menu-list.tsx:272>)

- [ ] **41 · P3｜空态、错态、加载态与重试入口不统一。** 6 个文件使用 `Empty`，15 张表使用纯 `span` 文案，`DictTable` 又有自定义空态；重试入口有 `Button variant="outline"`、`RetryHint` 的 link、原生下划线 button 三种；mail 还保留英文 `Loading mail...`。建议抽 `QueryState`/`EmptyState`，统一文案和重试规格。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-table.tsx:66](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-table.tsx:66>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:162](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:162>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dict/-components/dict-table.tsx:29](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/dict/-components/dict-table.tsx:29>)；[retry-hint.tsx:8](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/retry-hint.tsx:8>)

- [ ] **42 · P3｜查询函数普遍丢弃 TanStack Query 的 `AbortSignal`。** `http.ts` 支持 `RequestOptions.signal`，但 API 包装和 `queryFn` 都未使用；切换筛选、分页或关闭页面时旧请求仍会跑完，搜索类请求尤其明显。建议 API 层增加可选 `signal`，`queryFn: ({ signal }) => listX({ ..., signal })`。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:56](<E:/ppxb/continew-next/continew-ui-next/src/lib/http.ts:56>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-list.tsx:65](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-list.tsx:65>)；[notice-user-picker.tsx:38](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-user-picker.tsx:38>)

- [ ] **43 · P3｜发票预览滚动定位未节流。** 每次 `scroll` 都调用 `getBoundingClientRect()` 并 `setLayout`，DEV 下还在滚动回调里 `console.log`。建议用 rAF 合并，或改用 `ResizeObserver` 与滚动结束回调。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/dashboard/invoice/-components/use-visible-center-position.ts:19](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/dashboard/invoice/-components/use-visible-center-position.ts:19>)

- [ ] **44 · P3｜部分抽屉关闭按钮没有可访问名称。** file-recycle、user-form、notice-form 的 `DrawerClose` 只有 `<X />`；menu-form、client form 则有 `sr-only` 文本。建议在共享抽屉头里统一处理。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:111](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/file/-components/file-recycle-drawer.tsx:111>)；[user-form-drawer.tsx:358](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-form-drawer.tsx:358>)；[notice-form-drawer.tsx:221](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/notice/-components/notice-form-drawer.tsx:221>)

- [ ] **45 · P3｜地图加载失败没有界面反馈。** `catch` 只 `console.error`，失败后地图只剩背景色，没有错误态或重试；同时 div/svg/rect 三层使用同一背景色，属于冗余。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/dashboard/logistics/-components/shipment-route-map.tsx:156](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/dashboard/logistics/-components/shipment-route-map.tsx:156>)；[三层背景:171](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/dashboard/logistics/-components/shipment-route-map.tsx:171>)

- [ ] **46 · P3｜登录成功后 `getUserInfo` 失败会留下半登录状态。** 登录先写 token 并置为 `authenticated`，再 `await loadUser()`；失败时只提示错误，token 与 `authenticated` 仍保留（旧用户资料已在登录时清空），刷新后会带着 token 进入应用但权限为空。建议在 `loadUser()` 成功后再切换状态，失败时清 token。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:56](<E:/ppxb/continew-next/continew-ui-next/src/stores/auth/auth-store.ts:56>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/auth/-components/login-form.tsx:61](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/auth/-components/login-form.tsx:61>)

- [ ] **47 · P3｜原生控件与 shadcn 控件混用。** 重试链接用原生下划线 button（user-role-select、user-form、user-assign-roles），短信复制用原生 button，checkable-tree 清空用原生 button，树展开按钮也是自定义 20px 控件。部分原生控件（图标格、卡片、文件名）是合理的，需逐项判断，不要机械替换。  
  文件：[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-role-select.tsx:77](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/user/-components/user-role-select.tsx:77>)；[E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/sms/columns.tsx:56](<E:/ppxb/continew-next/continew-ui-next/src/routes/(main)/(app)/system/config/-components/sms/columns.tsx:56>)；[E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:96](<E:/ppxb/continew-next/continew-ui-next/src/components/checkable-tree.tsx:96>)
