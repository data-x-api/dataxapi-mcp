"""DataXAPI's MCP server on stdio: forwards to the hosted server at https://api.dataxapi.com/mcp.

Run it with ``uvx dataxapi-mcp`` (or ``pipx run dataxapi-mcp``). The key comes from DATAXAPI_API_KEY;
find, describe and account status work without one. Paid per call; errors are not charged.
"""

from __future__ import annotations

import os
import sys
import uuid
from contextlib import AsyncExitStack

import anyio
import mcp.types as types
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from mcp.server.lowlevel import NotificationOptions, Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server

__version__ = "0.1.0"
DEFAULT_MCP_URL = "https://api.dataxapi.com/mcp"
KEYS_URL = "https://dataxapi.com/console/keys/?ref=dataxapi-mcp-pypi"
CALL_TIMEOUT_SECONDS = 180


def _key_needed(tool: str) -> str:
    return (
        f"{tool} needs a DataXAPI API key, and dataxapi-mcp was started without one: nothing was charged. "
        f'Add DATAXAPI_API_KEY to the "env" of the dataxapi server in your MCP client\'s config (make a key at {KEYS_URL}; '
        "free trial: up to 333 calls, no card), then restart the client. find, describe and account status work without a key."
    )


def _error(text: str) -> types.CallToolResult:
    return types.CallToolResult(content=[types.TextContent(type="text", text=text)], isError=True)


async def _serve() -> None:
    url = os.environ.get("DATAXAPI_MCP_URL", "").strip() or DEFAULT_MCP_URL
    key = os.environ.get("DATAXAPI_API_KEY", "").strip()
    headers = {"User-Agent": f"dataxapi-mcp/{__version__} python", "X-Source": "dataxapi-mcp-pypi"}
    if key:
        headers["Authorization"] = f"Bearer {key}"

    async with AsyncExitStack() as stack:
        read, write, _ = await stack.enter_async_context(streamablehttp_client(url, headers=headers))
        remote = await stack.enter_async_context(ClientSession(read, write))
        hello = await remote.initialize()

        server: Server = Server(hello.serverInfo.name, version=hello.serverInfo.version, instructions=hello.instructions)

        @server.list_tools()
        async def list_tools() -> list[types.Tool]:
            return (await remote.list_tools()).tools

        @server.call_tool(validate_input=False)
        async def call_tool(name: str, arguments: dict) -> types.CallToolResult:
            args = dict(arguments or {})
            # The hosted server answers these with 401 when there is no key, and the Python client's transport ends
            # the whole session on a 401; say what to do here instead, before anything is sent.
            if not key and (name in ("call", "read_more") or (name == "account" and args.get("what") != "status")):
                return _error(_key_needed(name))
            if name == "call" and "idempotency_key" not in args:
                args["idempotency_key"] = str(uuid.uuid4())  # resend with it to get a lost answer, charged once
            try:
                with anyio.fail_after(CALL_TIMEOUT_SECONDS):
                    return await remote.call_tool(name, args)
            except Exception as error:  # the hosted server refused or did not answer
                text = str(error)
                if "401" in text and not key:
                    return _error(_key_needed(name))
                if name != "call":
                    return _error(f"dataxapi-mcp got no usable answer ({text}). {name} is free: try again.")
                return _error(
                    f"dataxapi-mcp got no usable answer ({text}). The call may have run. To get its result without "
                    f"paying twice, send the same call again with idempotency_key \"{args['idempotency_key']}\"."
                )

        async with stdio_server() as (stdin, stdout):
            await server.run(
                stdin,
                stdout,
                InitializationOptions(
                    server_name=hello.serverInfo.name,
                    server_version=hello.serverInfo.version,
                    capabilities=server.get_capabilities(NotificationOptions(), {}),
                    instructions=hello.instructions,
                ),
            )


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] in ("--version", "-v"):
        print(__version__)
        return
    if len(sys.argv) > 1:
        print(__doc__)
        return
    try:
        anyio.run(_serve)
    except KeyboardInterrupt:
        pass
