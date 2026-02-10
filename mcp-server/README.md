# pumpclaw-mcp

MCP (Model Context Protocol) server for [PumpClaw](https://pumpclaw.com) — the free token launcher on Base (Uniswap V4).

Connect any MCP-compatible AI agent (Claude, GPT, OpenClaw, etc.) to deploy and manage tokens on Base blockchain.

## Features

- 🔍 **list_tokens** — Browse all tokens launched on PumpClaw
- 📊 **get_token** — Get detailed info for any token (metadata, trade links)
- 📈 **get_stats** — Protocol statistics (total tokens, unique creators, fees)
- 🚀 **deploy_token** — Launch a new token (free, 0 ETH cost)

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pumpclaw": {
      "command": "npx",
      "args": ["-y", "pumpclaw-mcp"]
    }
  }
}
```

### With private key (for deploying tokens)

```json
{
  "mcpServers": {
    "pumpclaw": {
      "command": "npx",
      "args": ["-y", "pumpclaw-mcp"],
      "env": {
        "BASE_PRIVATE_KEY": "your-private-key-here"
      }
    }
  }
}
```

### OpenClaw / Clawdbot

```json
{
  "mcpServers": {
    "pumpclaw": {
      "command": "npx",
      "args": ["-y", "pumpclaw-mcp"]
    }
  }
}
```

## Tools

### list_tokens

List all tokens launched on PumpClaw with trade links.

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max tokens to return (default: all) |
| `offset` | number | Starting offset (default: 0) |

### get_token

Get detailed info about a specific token.

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Token contract address (0x...) |

### get_stats

Get protocol statistics. No parameters.

Returns: total tokens, unique creators, chain info, fee structure, contract addresses.

### deploy_token

Deploy a new token on Base via Uniswap V4. **Free — 0 ETH cost.**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Token name (e.g. "My Cool Token") |
| `symbol` | string | Ticker symbol (e.g. "MCT") |
| `imageUrl` | string? | Token logo URL |
| `websiteUrl` | string? | Project website URL |
| `totalSupply` | string? | Total supply in tokens (default: 1,000,000,000) |
| `initialFdv` | string? | Initial FDV in ETH (default: 20) |
| `creator` | string? | Creator address for fee attribution |

Requires `BASE_PRIVATE_KEY` environment variable.

## Resources

The server also exposes a `pumpclaw://info` resource with protocol documentation.

## Why PumpClaw?

| Feature | PumpClaw | Clanker |
|---------|----------|---------|
| Launch cost | **Free** | Free |
| Creator fee share | **80%** | 40% |
| DEX | **Uniswap V4** | Uniswap V3 |
| LP locked | **Forever** | Forever |
| Agent integration | **MCP + CLI + API** | Farcaster only |
| On-chain registry | ✅ | ❌ |

## Links

- 🌐 [pumpclaw.com](https://pumpclaw.com)
- 📦 [npm: pumpclaw-cli](https://www.npmjs.com/package/pumpclaw-cli)
- 🔗 [API: tokens.json](https://pumpclaw.com/api/v1/tokens.json)
- 💻 [GitHub](https://github.com/clawd800/pumpclaw)

## License

MIT
