# 企犇牛税务风险速测

面向手机微信扫码传播的税务风险速测页。用户选择行业、完成问卷、查看风险结果，并留下联系方式领取测评报告。客资保存到 Cloudflare D1，销售可通过后台查看和跟进。

## 在线地址

- 网站首页：https://qibenniu-tax-risk.pages.dev/
- 客资后台：https://qibenniu-tax-risk.pages.dev/admin
- 后台账号：由 Cloudflare Pages 环境变量 `ADMIN_USERNAME` 配置。
- 后台密码：不要写入仓库。需要时从项目负责人处获取或在 Cloudflare 环境变量中重置。

## 项目结构

- `index.html`：主测评页面结构。
- `admin.html`：客资后台页面结构。
- `assets/app.js`：首页、答题、结果页、领取报告交互。
- `assets/data.js`：行业、问题、选项和行动建议数据。
- `assets/scoring.js`：评分和结果计算逻辑。
- `assets/site.css`：全站样式，移动端适配重点在这里。
- `assets/hero-risk-dashboard.png`：首页右侧功能预览图。
- `functions/api/leads.js`：领取报告提交接口，写入 D1。
- `functions/api/admin/`：后台登录、退出、读取客资接口。
- `schema.sql`：D1 `leads` 表结构。
- `test/`：Node 内置测试，覆盖提交接口、后台登录和评分逻辑。
- `scripts/deploy-cloudflare.sh`：Wrangler 部署脚本。注意当前本机 Wrangler 登录可能不可用，见下方部署流程。

## 本地开发

安装依赖：

```sh
npm install
```

本地预览：

```sh
python3 -m http.server 4185
```

然后打开：

```text
http://127.0.0.1:4185/index.html
```

本地预览时，前端会把 `/api/leads` 指向生产域名，方便直接验证线上接口；修改 `assets/app.js` 里的 `productionApiOrigin` 时要谨慎。

## 验证命令

每次改动后至少运行：

```sh
node --check assets/app.js
node --check functions/api/leads.js
sh -n scripts/deploy-cloudflare.sh
npm test -- --runInBand
```

移动端是重点。上线前至少用 390px 手机视口走一遍：

1. 打开首页。
2. 点击“开始测评”。
3. 选择行业。
4. 答完 10 道题。
5. 检查结果页无横向滚动。
6. 检查“领取完整报告”入口能跳到联系方式表单。
7. 检查未勾选授权时复选框区域高亮并抖动。
8. 检查提交成功弹窗。

## Cloudflare 配置

生产项目：

- Cloudflare Pages project：`qibenniu-tax-risk`
- 生产域名：`https://qibenniu-tax-risk.pages.dev`
- D1 数据库名称：`qibenniu-tax-risk-db`
- D1 绑定名：`DB`

后台相关环境变量在 Cloudflare Pages 项目中配置：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

不要把 Cloudflare token、account id、数据库 UUID、后台密码、真实客资写入仓库。

## 部署流程

优先尝试：

```sh
npm run deploy
```

如果本机 Wrangler 没有登录或账号不对，使用 Codex 的 Cloudflare API MCP 发布。流程如下：

1. 通过 Cloudflare API 获取 Pages upload token。
2. 创建临时目录 `.tmp-pages-upload`。
3. 复制以下文件到临时目录：
   - `index.html`
   - `admin.html`
   - `_headers`
   - `assets/`
   - `admin/index.html`，内容复制自 `admin.html`
4. 用 Wrangler 的 direct upload 上传临时目录并生成 `.tmp-pages-manifest.json`。
5. 调 Cloudflare Pages Create deployment 接口，multipart 表单包含：
   - `manifest`
   - `branch=main`
   - `commit_dirty=true`
   - `_headers`
   - `_worker.js`
6. `_worker.js` 必须保留这些路由：
   - `/api/leads`
   - `/api/admin/auth/challenge`
   - `/api/admin/auth/login`
   - `/api/admin/auth/logout`
   - `/api/admin/leads`
   - `/admin` 和 `/admin/`
7. 部署完成后删除 `.tmp-pages-upload` 和 `.tmp-pages-manifest.json`。

### 重要路由坑

Cloudflare Pages 会把 `admin.html` 和 `admin/index.html` 规范化成 clean URL。如果 Worker 里用 `env.ASSETS.fetch()` 去取 `/admin.html` 或 `/admin/index.html`，可能导致：

```text
ERR_TOO_MANY_REDIRECTS
```

正确做法：

- 上传 `admin/index.html`。
- Worker 中 `/admin` 和 `/admin/` 应该请求目录路径 `/admin/`。
- 部署后必须验证：

```sh
curl -sS -D - -o /dev/null https://qibenniu-tax-risk.pages.dev/admin
curl -sS -D - -o /dev/null https://qibenniu-tax-risk.pages.dev/admin/
```

两者都应返回 `200`，不能返回重复 `308`。

## 2026-06-08 开发记录

今天完成了这些上线工作：

- 首页从展示型页面改为移动端测评入口，首屏突出“开始测评”。
- 用 AI 生成的高级感产品预览图替换首页右侧旧卡片。
- 修复结果页风险项里出现 `undefined` 的问题。
- 删除测评结束后的“复制测评报告”功能。
- 接入 Cloudflare D1 保存客资。
- 增加后台登录页和客资列表页。
- 修复本地预览提交接口返回 HTML 导致 JSON 解析失败的问题。
- 修复只填微信号也能提交客资。
- 修复后台登录后刷新丢会话的问题。
- 未勾选授权时，改为复选框区域高亮并抖动。
- 提交成功改成弹窗反馈。
- 结果页评分图改成浅色环形评分卡。
- 结果页增加“领取完整报告”入口和手机底部吸附按钮，减少用户滑不到表单就退出的问题。
- 修复 `/admin` clean URL 重定向循环。

上线后验证过：

- `npm test -- --runInBand`：7 个测试通过。
- 线上 `/admin` 和 `/admin/` 返回 `200`。
- 后台登录成功后可以读取客资。
- 线上领取报告接口返回 JSON 且写入 D1；测试客资已删除。
- 手机 390px 结果页无横向滚动，领取入口能跳到表单。

## 运维注意

- 后台读取最近 200 条客资。
- 如需清理测试客资，只能删除明确带测试标记的记录，例如测试姓名和测试微信号都匹配时再删。
- 不要删除或覆盖用户真实客资。
- 如果部署后接口异常，优先检查 `_worker.js` 是否仍包含 API 路由和 D1 绑定 `DB`。
- 如果后台打不开，优先检查 clean URL 规则和 `/admin` 是否返回 `200`。
