# Continew Admin UI Next

WIP.

Anyway, thanks for the tokens, [莫愁](https://github.com/zk020106).

## 1Panel 部署

- 前端地址：https://continew.ruanruyi.cn
- 后端地址：https://continew-api.ruanruyi.cn
- 前端通过同源 `/api/` 访问后端，OpenResty 转发时去掉 `/api` 前缀，并校验上游 HTTPS 证书。
- 静态目录：`/opt/1panel/www/sites/continew.ruanruyi.cn/index`。
- OpenResty 配置：`deploy/1panel/continew.ruanruyi.cn.conf`；部署到 `/opt/1panel/www/conf.d/continew.ruanruyi.cn.conf`。
- SPA 路由回退到 `index.html`；带哈希的静态资源长期缓存，入口页面不强缓存。

在已有依赖的前端目录构建（Bash）：

```bash
VITE_API_BASE_URL=https://continew-api.ruanruyi.cn VITE_API_PREFIX=/api VITE_BASE_PATH=/ pnpm build
```

环境变量仅覆盖本次构建，不改动 `.env.development` 或 `.env.production`。不要直接部署未覆盖 API 参数的旧构建包。后续发布只替换静态目录；修改 OpenResty 配置前先备份，并通过 `nginx -t` 后再重载。

本次部署通过 SSH 上传静态文件、配置 HTTPS 并绑定 1Panel 网站与证书；未启用 1Panel 公共 API。网站 ID 为 `15`，证书 ID 为 `14`，证书自动续期已启用，由 1Panel 更新关联网站的证书文件并重载 OpenResty。私钥只保留在服务器，不纳入源码。

2026-11-18 验证：HTTPS 首页和入口脚本、登录页、深层路由、验证码 API 返回正常；缺失的静态资源返回 404；浏览器登录页展示验证码，初始化请求没有失败。未执行账号登录或业务写入操作。

本次备份：本地 `backups/deploy-1panel-20261118-144657/`，服务器 `/opt/1panel/backup/continew-frontend-20261118-144657/`。旧的 `dist.zip` 未改动，不代表本次部署产物。

Commit message: `deploy: publish frontend to 1Panel with HTTPS API proxy`

# LICENSE

[MIT](./LICENSE)
