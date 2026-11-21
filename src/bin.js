#!/usr/bin/env node
// dataxapi-mcp: DataXAPI's MCP server on stdio, for MCP clients that start local servers. stdout carries MCP
// messages only; anything else goes to stderr.
import { serve } from './bridge.js';
import { ConfigError, configFromEnv, DEFAULT_MCP_URL } from './config.js';
import { VERSION } from './version.js';

const HELP = `dataxapi-mcp ${VERSION}: DataXAPI's MCP server on stdio. Public data from Douyin, Xiaohongshu,
WeChat, Weibo, Bilibili, Zhihu, Kuaishou, TikTok, X, YouTube and more; paid per call, errors are not charged.
Your MCP client starts it; it forwards every request to ${DEFAULT_MCP_URL}.

  DATAXAPI_API_KEY   your key (dx_...); find, describe and account status work without one

Claude Desktop, Cursor, Cherry Studio and most clients:
  { "mcpServers": { "dataxapi": { "command": "npx", "args": ["-y", "github:data-x-api/dataxapi-mcp"], "env": { "DATAXAPI_API_KEY": "dx_..." } } } }

Docs: https://dataxapi.com/mcp/  ·  中文：https://dataxapi.com/zh/mcp/
`;

async function main(argv) {
  const [first] = argv;
  if (first === '--version' || first === '-v') {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (first === '--help' || first === '-h') {
    process.stdout.write(HELP);
    return 0;
  }
  if (first !== undefined) {
    process.stderr.write(`dataxapi-mcp: unknown argument ${JSON.stringify(first)}; it is set up through environment variables (dataxapi-mcp --help)\n`);
    return 2;
  }
  try {
    const bridge = await serve(configFromEnv(process.env));
    process.stdin.once('end', () => void bridge.close().finally(() => process.exit(0)));
    return 0;
  } catch (err) {
    process.stderr.write(`dataxapi-mcp: ${err instanceof Error ? err.message : String(err)}\n`);
    return err instanceof ConfigError ? 2 : 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
