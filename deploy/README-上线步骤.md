# Myself 上线操作指引（GitHub Pages + Cloudflare Worker）

> 前提：已安装 Node.js；有一个 GitHub 账号。全程免费。

## 第一步：上传代码到 GitHub（约 10 分钟）

1. 在 `Myself 0.2` 文件夹里右键 → 「在终端打开」（或用 Git Bash）：
   ```
   git init
   git add .
   git commit -m "Myself 0.2 上线版"
   ```
   （`.gitignore` 已配好，密钥、备份、日志不会上传）
2. 打开 github.com → 右上角 + → New repository → 名字填 `myself`（不要勾选任何初始化文件）→ Create。
3. 按页面提示执行（把 `你的用户名` 换成你的 GitHub 用户名）：
   ```
   git remote add origin https://github.com/你的用户名/myself.git
   git branch -M main
   git push -u origin main
   ```
4. 仓库页面 → Settings → 左侧 Pages → Source 选 `main` 分支、目录选 `/ (root)` → Save。
   等 1~2 分钟，你的网址就是：`https://你的用户名.github.io/myself/`

## 第二步：部署 Cloudflare Worker 中转（约 20 分钟）

1. 打开 dash.cloudflare.com 注册（免费，邮箱即可）。
2. 电脑安装 wrangler 命令行（只需一次）：
   ```
   npm install -g wrangler
   wrangler login
   ```
   （会弹浏览器授权，点 Allow）
3. 创建数据统计用的 KV 空间：
   ```
   cd "H:\Myself\版本留存\Myself 0.2\deploy"
   wrangler kv namespace create MYSELF_KV
   ```
   命令会输出一行 `id = "xxxx..."`，把它填进 `wrangler.toml` 末尾（把那三行注释去掉，`id` 换成你的）。
4. 打开 `wrangler.toml`，把 `ALLOWED_ORIGINS` 里的 `你的用户名` 改成你的 GitHub 用户名。
5. 设置密钥（执行后粘贴你的 DeepSeek 密钥，不会显示在屏幕上）：
   ```
   wrangler secret put DEEPSEEK_KEY
   ```
6. 部署：
   ```
   wrangler deploy
   ```
   成功后会给一个地址，类似 `https://myself-relay.xxx.workers.dev`

## 第三步：接通前端（约 2 分钟）

1. 打开 `Myself 0.2\deploy-config.js`，把 Worker 地址填进引号里：
   `window.MYSELF_API_BASE='https://myself-relay.xxx.workers.dev';`
2. 提交更新：
   ```
   git add . && git commit -m "接入线上服务" && git push
   ```
3. 等 1 分钟，用手机浏览器打开 `https://你的用户名.github.io/myself/` 就能玩了。
   手机浏览器菜单里选「添加到主屏幕」，桌面会出现 Myself 图标，点开是全屏 App 体验。

## 日常使用

- **看埋点数据**：双击桌面的「Myself 数据看板」快捷方式，填入 Worker 地址即可（免密）；或直接打开 `https://myself-relay.xxx.workers.dev/api/stats`。
- **改了人设/规则/服务端逻辑后**：在 `Myself 0.2` 目录执行 `node deploy/build-worker.cjs`，然后 `cd deploy && wrangler deploy` 重新发布。
- **费用**：Cloudflare 免费额度内；DeepSeek 按 token 计费，已有每人每天 30 轮、全局每天 500 轮的限流保护（wrangler.toml 里可调）。

## 常见问题

- 手机打开显示「线上服务尚未配置完成」→ deploy-config.js 没填或没 push。
- 聊天报「密钥验证失败」→ 第 5 步的 DEEPSEEK_KEY 没设对，重新 `wrangler secret put`。
- 改完代码手机没变化 → GitHub Pages 有 1~2 分钟缓存，稍等刷新；PWA 图标缓存更久，可卸载重装。
