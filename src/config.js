// Settings, from the environment only: the key (DATAXAPI_API_KEY, optional: find, describe and account
// status work without one) and where the hosted server is (DATAXAPI_MCP_URL, for testing). The key is never printed.
import { VERSION } from './version.js';

export const DEFAULT_MCP_URL = 'https://api.dataxapi.com/mcp';
export const KEYS_URL = 'https://dataxapi.com/console/keys/?ref=dataxapi-mcp';

export class ConfigError extends Error {}

export function configFromEnv(env) {
  const raw = (env.DATAXAPI_MCP_URL ?? '').trim() || DEFAULT_MCP_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(`${JSON.stringify(raw)} is not a URL; leave DATAXAPI_MCP_URL out to use ${DEFAULT_MCP_URL}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ConfigError(`the server address must be http or https, not ${url.protocol}`);
  return { url, apiKey: (env.DATAXAPI_API_KEY ?? '').trim() || null };
}

export function remoteHeaders(config) {
  return {
    'User-Agent': `dataxapi-mcp/${VERSION} node/${process.versions.node}`,
    'X-Source': 'dataxapi-mcp-npm',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  };
}
