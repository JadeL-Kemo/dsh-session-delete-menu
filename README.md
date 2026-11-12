# dsh-session-delete-menu

给 DeepSeek Harness（DSH）桌面版的会话列表加一个手动「删除会话」菜单项。

DSH 本体只有归档（archive），没有删除；会话文件一直留在磁盘上。这个插件在会话行的 `⋯` 菜单里注入一个红色的「删除会话」，点击确认后调用会话删除接口，把会话目录移入 `.sessions-trash`（24 小时内可恢复），并刷新列表。

## 依赖

- DSH 0.2.2-rc.1（桌面 / web profile）。
- 宿主删除接口 `POST /api/mobile-nav.session.delete`：目前由 `dsh-web-mobile` 插件提供。没有它时点击菜单项会得到 404。

## 安装

从本地目录安装（clone 本仓库后）：

```powershell
dsh plugin --profile desktop add file:<本仓库路径>
```

或把目录复制/软链到 profile 的 `node_modules` 并在 `package.json` 的 `dsh.profile.bundles` 里追加 `dsh-session-delete-menu`。

安装后重启 DSH：会话行的 `⋯` 菜单底部会出现「删除会话」。

## 卸载

```powershell
dsh plugin --profile desktop remove dsh-session-delete-menu
```

## 行为

- 支持普通会话与已归档会话（已归档的会话也能直接删）。
- 删除是软删除：会话目录移入 `<sessions>/.sessions-trash/<时间>-<workspace>-<id>/`，24 小时内可恢复。
- 正在运行的当前会话会返回 `409 session-busy`，提示先切换会话。
- 删除成功后自动刷新会话列表。

## 实现

- 纯客户端插件，无构建步骤：`lib/client.js` 通过官方 `ctx.contextMenus.register({ target: 'session', order: 700 })` 注册菜单项；`lib/index.js` 是空宿主壳（用于加载 bundle）。
- 使用 `ctx.sessions.refresh()` 刷新列表。

## 已知限制

- 依赖 `dsh-web-mobile` 提供的宿主删除接口。
- 只能删除 DSH 启动时已加载进列表的会话；DSH 启动后新写入的会话目录需要重启后才能在线删除。

## License

MIT
