# Radar MCP Server

Exposes the [Radar](../README.md) competitive intelligence app as MCP tools for use with Claude Desktop, Cursor, and other MCP-compatible AI clients.

## Tools

| Tool | Description |
|------|-------------|
| `list_competitors` | List all tracked competitors with activity stats and threat levels |
| `get_competitor_profile` | Full profile: company details, executives, products, battle card |
| `get_battle_card` | Competitive positioning guidance for a specific competitor |
| `list_executives` | Leadership team for a competitor (tracks changes over time) |
| `list_products` | Product portfolio for a competitor |
| `get_latest_digest` | Fetch recent weekly intelligence digests |
| `generate_digest` | Trigger AI generation of a new weekly digest |
| `get_industry_intel` | Industry news filtered by tier, source, date range, or read status |
| `get_stats` | Aggregated stats: tier distribution, themes, competitor rankings, timeline |

## Setup

### 1. Build

```bash
cd mcp-server
npm install
npm run build
```

### 2. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RADAR_URL` | Yes | Base URL of your Radar instance (e.g. `https://radar.railway.app`) |
| `RADAR_API_KEY` | Yes | API key — set `INGEST_API_SECRET` on the server to the same value |

### 3. Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "radar": {
      "command": "node",
      "args": ["/absolute/path/to/Radar/mcp-server/dist/index.js"],
      "env": {
        "RADAR_URL": "https://your-radar-instance.railway.app",
        "RADAR_API_KEY": "your_ingest_api_secret"
      }
    }
  }
}
```

### 4. Or via `.mcp.json` (Claude Code)

The project root `.mcp.json` is pre-configured. Just set the env vars:

```bash
export RADAR_URL=https://your-radar-instance.railway.app
export RADAR_API_KEY=your_ingest_api_secret
```

## Auth Note

The MCP server sends `Authorization: Bearer <RADAR_API_KEY>` on every request. On the Radar server, set the `INGEST_API_SECRET` environment variable to the same value to enforce authentication on ingest and generate endpoints. Read-only endpoints (competitors, stats, industry, digest GET) are currently public by default.
