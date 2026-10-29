#!/usr/bin/env python3
"""Reuse an existing local Codex MCP credential in memory; never print or persist it."""
import os
from pathlib import Path
import subprocess
import sys
import tomllib


def main():
    config = Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'config.toml'
    try:
        with config.open('rb') as stream:
            servers = tomllib.load(stream).get('mcp_servers', {})
    except (OSError, tomllib.TOMLDecodeError):
        sys.exit('无法读取本机 Codex MCP 配置。也可通过 MCD_MCP_TOKEN 环境变量启动。')
    credential = None
    for server in servers.values():
        if server.get('url', '').rstrip('/') != 'https://mcp.mcd.cn':
            continue
        for name, value in server.get('http_headers', {}).items():
            if name.lower() == 'authorization' and isinstance(value, str) and value.startswith('Bearer '):
                credential = value.removeprefix('Bearer ').strip()
        env_name = server.get('bearer_token_env_var')
        if not credential and env_name:
            credential = os.environ.get(env_name)
        if credential:
            break
    if not credential:
        sys.exit('没有找到已配置的麦当劳 MCP 凭据。请设置 MCD_MCP_TOKEN 后使用 npm run dev。')
    env = os.environ.copy()
    env['MCD_MCP_TOKEN'] = credential
    if '--production' in sys.argv:
        env['NODE_ENV'] = 'production'
    try:
        return subprocess.call(['node', '--import', 'tsx', 'server/index.ts'], env=env, cwd=Path(__file__).resolve().parent.parent)
    except KeyboardInterrupt:
        return 130


if __name__ == '__main__':
    sys.exit(main())
