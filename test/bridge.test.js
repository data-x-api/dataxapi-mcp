// Starts dataxapi-mcp the way a client does, over stdio, against the live hosted server, with no key:
// tools/list and the free `find` must work; a paid `call` must come back as a tool error saying how to add
// a key and that nothing was charged. Free: nothing here spends money.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { configFromEnv, ConfigError } from '../src/config.js';
import { withIdempotencyKey } from '../src/bridge.js';

const BIN = fileURLToPath(new URL('../src/bin.js', import.meta.url));

test('settings: the hosted server by default, the key optional, a bad address refused', () => {
  assert.equal(configFromEnv({}).url.href, 'https://api.dataxapi.com/mcp');
  assert.equal(configFromEnv({}).apiKey, null);
  assert.equal(configFromEnv({ DATAXAPI_API_KEY: ' dx_1 ' }).apiKey, 'dx_1');
  assert.throws(() => configFromEnv({ DATAXAPI_MCP_URL: 'ftp://x' }), ConfigError);
});

test('a call gets an idempotency key unless it has one; other tools are left as they are', () => {
  assert.match(withIdempotencyKey('call', { capability: 'x' }).idempotency_key, /^[0-9a-f-]{36}$/);
  assert.equal(withIdempotencyKey('call', { idempotency_key: 'k' }).idempotency_key, 'k');
  assert.deepEqual(withIdempotencyKey('find', { query: 'q' }), { query: 'q' });
});

test('over stdio against the hosted server, with no key', { timeout: 90_000 }, async () => {
  const env = { ...process.env };
  delete env.DATAXAPI_API_KEY;
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [BIN], env }));
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['account', 'call', 'describe', 'find', 'read_more']);
    assert.ok(tools.every((t) => t.title), 'every tool has a title');
    assert.match(client.getInstructions() ?? '', /DataXAPI/);

    const found = await client.callTool({ name: 'find', arguments: { query: '小红书笔记评论' } });
    assert.ok(!found.isError);
    assert.match(found.content[0].text, /xiaohongshu\.notes\.comments\.list/);

    const paid = await client.callTool({ name: 'call', arguments: { capability: 'douyin.trends.list' } });
    assert.ok(paid.isError);
    assert.match(paid.content[0].text, /DATAXAPI_API_KEY/);
    assert.match(paid.content[0].text, /nothing was charged/);
  } finally {
    await client.close();
  }
});
