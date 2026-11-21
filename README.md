# DataXAPI MCP server

Public data from Douyin, Xiaohongshu (RedNote), WeChat Official Accounts and Channels, WeChat Search, Weibo, Bilibili, Zhihu and Kuaishou, plus Douyin's trend index, Xiaohongshu PGY and Douyin Xingtu creator data, TikTok, X, YouTube, Instagram, Reddit and more, for Claude, Cursor, Cherry Studio, Cline, Gemini CLI and any MCP client.

- **No platform account, cookie or QR login.** One DataXAPI key.
- **Pay per call, errors are not charged.** Every result states what it cost and the balance left. `find`, `describe` and `account` are free, and `find` and `describe` need no key, so an agent can check whether the data exists and what it costs before anyone signs up.
- **Free trial: up to 333 calls, no card.** Top up from $10; the balance does not expire.

Two ways to connect: the hosted server directly (no install), or this package, for clients that only start local servers.

中文说明在下面：[中文](#中文)

## Hosted server (no install)

```
https://api.dataxapi.com/mcp
```

Send `Authorization: Bearer <your key>`, or sign in with OAuth (ChatGPT, Claude). Claude Code:

```bash
claude mcp add --transport http --scope user dataxapi https://api.dataxapi.com/mcp --header "Authorization: Bearer $DATAXAPI_API_KEY"
```

## This package: the same server on stdio

```json
{
  "mcpServers": {
    "dataxapi": {
      "command": "npx",
      "args": ["-y", "github:data-x-api/dataxapi-mcp"],
      "env": { "DATAXAPI_API_KEY": "dx_..." }
    }
  }
}
```

Python instead of Node: `"command": "uvx", "args": ["--from", "git+https://github.com/data-x-api/dataxapi-mcp#subdirectory=python", "dataxapi-mcp"]`.

The npm and PyPI packages are not out yet; until they are, these commands run the same code straight from this repository.

That block goes in:

| Client | Where |
|---|---|
| Claude Desktop | Settings → Developer → Edit Config (`claude_desktop_config.json`) |
| Cursor | `~/.cursor/mcp.json` |
| Cherry Studio | Settings → MCP servers → Add → Import from JSON |
| Cline, Roo Code | MCP Servers → Configure → `cline_mcp_settings.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| VS Code | `.vscode/mcp.json`, under `"servers"` |
| Gemini CLI | `gemini extensions install https://github.com/data-x-api/dataxapi-mcp` |
| Codex | `~/.codex/config.toml`: `[mcp_servers.dataxapi]` with `command = "npx"`, `args = ["-y", "github:data-x-api/dataxapi-mcp"]`, `env = { DATAXAPI_API_KEY = "dx_..." }` |

Get a key: <https://dataxapi.com/console/keys/?ref=dataxapi-mcp>. Without one, `find`, `describe` and `account` status still work; a paid call answers with how to add a key, and nothing is charged.

The package only forwards: tools, their descriptions and every answer come from the hosted server, so it never falls behind the catalog. A `call` without an `idempotency_key` gets one, so an answer lost on the way can be fetched again without paying twice.

## Tools

| Tool | What it does | Cost |
|---|---|---|
| `find` | The endpoint for a need in plain words, English or Chinese, with its parameters, price and a ready call | free, no key |
| `describe` | One to five endpoints in full: every parameter and value, fields, paging, price, examples | free, no key |
| `call` | One page of data from one endpoint | that endpoint's price; errors are not charged |
| `read_more` | The rest of a long result, or it in another view | free |
| `account` | Balance, receipts, usage by day or endpoint, which endpoints are up | free |

Ask in plain words, for example:

- “这个小红书关键词最近一周最火的 20 篇笔记，按点赞排，列出标题、作者和链接”
- “Get the comments on this Douyin video and sort them into praise and complaints”
- “比较这三个公众号最近 10 篇文章的阅读数”
- “What has this keyword's Douyin search index done over the last 90 days?”

Every endpoint and its price: <https://dataxapi.com/apis/>. Recorded answers and runnable scripts per platform: [douyin-api](https://github.com/data-x-api/douyin-api), [wechat-api](https://github.com/data-x-api/wechat-api).

## 中文

在 Claude、Cursor、Cherry Studio、Cline、Gemini CLI 等任何 MCP 客户端里，取抖音（含巨量算数、星图）、小红书（含蒲公英）、公众号、视频号、微信搜一搜、微博、B站、知乎、快手，以及 TikTok、X、YouTube 等平台的公开数据。

- **不用平台账号、不用 Cookie、不用扫码**，一把 DataXAPI Key。
- **按次付费，出错不收费。**每次结果写明扣了多少、还剩多少。`find`、`describe`、`account` 免费，前两个不用 Key。
- **免费试用，最多 333 次，不用绑卡。**最低充 $10，余额不过期；支付宝、微信支付、银行卡都能付。

能直接连远程地址的客户端，用 `https://api.dataxapi.com/mcp` 加 `Authorization: Bearer <你的 Key>` 就行，不用装任何东西。只能启动本地服务的客户端，把上面那段 `mcpServers` 配置贴进去（Node 用 `npx -y github:data-x-api/dataxapi-mcp`，Python 用 `uvx --from "git+https://github.com/data-x-api/dataxapi-mcp#subdirectory=python" dataxapi-mcp`；npm 和 PyPI 包还没发布，发布前这两条直接从本仓库运行同一份代码）。

拿 Key：<https://dataxapi.com/zh/console/keys/?ref=dataxapi-mcp>。全部接口和价格：<https://dataxapi.com/zh/apis/>。

## Develop

```bash
npm install
npm test   # starts the package over stdio against the hosted server with no key; spends nothing
```

## License

MIT

<!-- mcp-name: com.dataxapi/mcp -->
