// The bridge: an MCP server on stdio whose tools are DataXAPI's hosted MCP server's tools. tools/list and
// tools/call go to https://api.dataxapi.com/mcp as they are, with the key in Authorization; the server's
// name, version and instructions are the hosted server's. Every tool call answers with a tool result: a
// failure becomes text written for the agent, saying whether anything was charged and what to do next.
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, CallToolResultSchema, ListToolsRequestSchema, ListToolsResultSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { KEYS_URL, remoteHeaders } from './config.js';
import { VERSION } from './version.js';

// The hosted server may try more than one route before it answers a call.
export const CALL_TIMEOUT_MS = 180_000;
const CONNECT_TIMEOUT_MS = 30_000;

const toolError = (text) => ({ content: [{ type: 'text', text }], isError: true });

export function reason(err) {
  if (err instanceof StreamableHTTPError) return err.code > 0 ? `HTTP ${err.code}` : err.message;
  if (err instanceof McpError) return err.message.replace(/^MCP error -?\d+: /, '');
  if (err instanceof Error) return err.cause?.code ? `${err.message} (${err.cause.code})` : err.message;
  return String(err);
}

// What a paid call that got no answer should do: resend with the same key, which returns the first result
// and charges once.
export function noAnswer(config, tool, args, why) {
  const head = `dataxapi-mcp got no usable answer from ${config.url.href} (${why}).`;
  if (tool !== 'call') return `${head} ${tool} is free: try again.`;
  return `${head} The call may have run. To get its result without paying twice, send the same call again with idempotency_key ${JSON.stringify(args.idempotency_key)}.`;
}

export const keyNeeded = (tool) =>
  `${tool} needs a DataXAPI API key, and dataxapi-mcp was started without one: nothing was charged. ` +
  `Add DATAXAPI_API_KEY to the "env" of the dataxapi server in your MCP client's config (make a key at ${KEYS_URL}; ` +
  'free trial: up to 333 calls, no card), then restart the client. find, describe and account status work without a key.';

// A call without an idempotency_key gets one, so an answer lost on the way can be fetched again unpaid.
export function withIdempotencyKey(tool, args = {}) {
  return tool === 'call' && !('idempotency_key' in args) ? { ...args, idempotency_key: randomUUID() } : { ...args };
}

export async function connectRemote(config) {
  const transport = new StreamableHTTPClientTransport(config.url, { requestInit: { headers: remoteHeaders(config) } });
  const client = new Client({ name: 'dataxapi-mcp', version: VERSION });
  try {
    await client.connect(transport, { timeout: CONNECT_TIMEOUT_MS });
  } catch (err) {
    await client.close().catch(() => undefined);
    throw new Error(`could not reach ${config.url.href}: ${reason(err)}`);
  }
  return client;
}

export async function forwardCall(remote, config, params, signal) {
  const args = withIdempotencyKey(params.name, params.arguments);
  try {
    return await remote.request({ method: 'tools/call', params: { ...params, arguments: args } }, CallToolResultSchema, { timeout: CALL_TIMEOUT_MS, signal });
  } catch (err) {
    if (err instanceof StreamableHTTPError && err.code === 401 && !config.apiKey) return toolError(keyNeeded(params.name));
    if (err instanceof McpError && err.code > -32001) return toolError(reason(err));
    return toolError(noAnswer(config, params.name, args, reason(err)));
  }
}

// Starts the stdio server. Returns something to close it with.
export async function serve(config, transport = new StdioServerTransport()) {
  const remote = await connectRemote(config);
  const info = remote.getServerVersion() ?? { name: 'dataxapi', version: VERSION };
  const server = new Server(
    { name: info.name, version: info.version },
    { capabilities: { tools: {} }, instructions: remote.getInstructions() },
  );
  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) =>
    remote.request({ method: 'tools/list', params: request.params }, ListToolsResultSchema, { signal: extra.signal }),
  );
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => forwardCall(remote, config, request.params, extra.signal));
  await server.connect(transport);
  return {
    async close() {
      await server.close().catch(() => undefined);
      await remote.close().catch(() => undefined);
    },
  };
}
