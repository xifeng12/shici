# 诗词寻览

一个无构建链的静态诗词搜索界面，接入 `https://poetry.palemoky.com` 的公开 API。

## 本地运行

```powershell
cd E:\cs\shici
python -m http.server 5173
```

打开 `http://localhost:5173`。

线上 API 当前没有返回跨域响应头，所以从 `localhost` 打开时浏览器可能会拦截远程请求。页面会显示演示数据和明确提示；同源部署到 API 域名，或在本地给 `/api` 配一个代理并设置 `window.SHICI_API_BASE = ""` 后，会使用真实 API。

## 功能

- 搜索诗词、作者、标题和正文
- 朝代、作者、体裁筛选
- 随机诗词
- 简体/繁体切换
- 分页、复制正文、查看原始 JSON

## 说明

第一版优先使用线上实际可用接口：

- `/api/search`
- `/api/poems/random`
- `/api/stats`

仓库 README 中的 `/api/v1/*` 本地 Docker 接口暂未做适配。
