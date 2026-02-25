#!/usr/bin/env node
/**
 * Radar MCP Server
 *
 * Exposes Radar competitive intelligence functionality as MCP tools
 * for use with Claude Desktop, Cursor, and other MCP-compatible AI clients.
 *
 * Required env vars:
 *   RADAR_URL      - Base URL of your Radar instance (e.g. https://radar.railway.app)
 *   RADAR_API_KEY  - API key / INGEST_API_SECRET configured on the Radar server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Configuration ────────────────────────────────────────────────────────────

const RADAR_URL = process.env.RADAR_URL;
const RADAR_API_KEY = process.env.RADAR_API_KEY;

if (!RADAR_URL) {
  console.error(
    "Error: RADAR_URL environment variable is required.\n" +
    "Set it to the base URL of your Radar instance.\n" +
    "Example: RADAR_URL=https://radar.railway.app"
  );
  process.exit(1);
}

if (!RADAR_API_KEY) {
  console.error(
    "Error: RADAR_API_KEY environment variable is required.\n" +
    "Set it to the INGEST_API_SECRET configured on your Radar server.\n" +
    "Example: RADAR_API_KEY=your_secret_key"
  );
  process.exit(1);
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

async function radarRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = `${RADAR_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${RADAR_API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.ok) {
    const err = data as { error?: string; message?: string };
    throw new Error(
      err?.error || err?.message || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return data;
}

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(err: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
      },
    ],
    isError: true,
  };
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "radar-mcp",
  version: "0.1.0",
});

// ─── Tool: list_competitors ───────────────────────────────────────────────────

server.tool(
  "list_competitors",
  "List all tracked competitors with activity stats (total events, critical/high/medium/low counts, " +
  "latest event date, average priority score). Sorted by threat level (critical + high events). " +
  "Use this to get competitor IDs for other tools.",
  {},
  async () => {
    try {
      const result = await radarRequest("GET", "/api/competitors");
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: get_competitor_profile ─────────────────────────────────────────────

server.tool(
  "get_competitor_profile",
  "Get a full profile for a specific competitor including company details (description, HQ, website, " +
  "founded, employee count, funding, market segments, weaknesses), all executives, products, and battle card.",
  {
    competitor_id: z
      .number()
      .int()
      .positive()
      .describe("Competitor ID — get this from list_competitors"),
  },
  async (input) => {
    try {
      const result = await radarRequest(
        "GET",
        `/api/competitors/${input.competitor_id}/profile`
      );
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: get_battle_card ────────────────────────────────────────────────────

server.tool(
  "get_battle_card",
  "Get the battle card for a competitor. Battle cards contain competitive positioning guidance: " +
  "strengths, weaknesses, win/loss themes, and how to beat them in deals.",
  {
    competitor_id: z
      .number()
      .int()
      .positive()
      .describe("Competitor ID — get this from list_competitors"),
  },
  async (input) => {
    try {
      const result = await radarRequest(
        "GET",
        `/api/competitors/${input.competitor_id}/battle-card`
      );
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: list_executives ────────────────────────────────────────────────────

server.tool(
  "list_executives",
  "List executives for a specific competitor. Returns name, title, LinkedIn, start date, and whether " +
  "they are currently active. Useful for tracking leadership changes and relationship mapping.",
  {
    competitor_id: z
      .number()
      .int()
      .positive()
      .describe("Competitor ID — get this from list_competitors"),
  },
  async (input) => {
    try {
      const result = await radarRequest(
        "GET",
        `/api/competitors/${input.competitor_id}/executives`
      );
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: list_products ──────────────────────────────────────────────────────

server.tool(
  "list_products",
  "List products for a specific competitor. Returns product name, description, category, pricing tier, " +
  "and launch date. Useful for understanding their product portfolio.",
  {
    competitor_id: z
      .number()
      .int()
      .positive()
      .describe("Competitor ID — get this from list_competitors"),
  },
  async (input) => {
    try {
      const result = await radarRequest(
        "GET",
        `/api/competitors/${input.competitor_id}/products`
      );
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: get_latest_digest ──────────────────────────────────────────────────

server.tool(
  "get_latest_digest",
  "Fetch the most recent weekly intelligence digest(s). Each digest contains an AI-generated summary " +
  "of competitor activity, industry news, event counts, and Slack posting status. " +
  "Use limit to retrieve more historical digests.",
  {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(5)
      .describe("Number of digests to return (default 5, max 50)"),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe("Pagination offset"),
  },
  async (input) => {
    try {
      const params = new URLSearchParams({
        limit: String(input.limit ?? 5),
        offset: String(input.offset ?? 0),
      });
      const result = await radarRequest("GET", `/api/digest?${params}`);
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: generate_digest ────────────────────────────────────────────────────

server.tool(
  "generate_digest",
  "Trigger generation of a new weekly intelligence digest. This calls the AI to analyze the past week " +
  "of competitor events and industry news, generates a summary, stores it, and optionally posts to Slack. " +
  "This may take 30-60 seconds. Returns the generated digest.",
  {},
  async () => {
    try {
      const result = await radarRequest("POST", "/api/digest/generate");
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: get_industry_intel ─────────────────────────────────────────────────

server.tool(
  "get_industry_intel",
  "Fetch industry news and intelligence articles. Supports filtering by relevance tier, source, " +
  "read status, and date range. Returns title, summary, source, published date, and relevance tier.",
  {
    tier: z
      .enum(["Critical", "High", "Medium", "Low"])
      .optional()
      .describe("Filter by relevance tier"),
    source: z
      .string()
      .optional()
      .describe("Filter by source name (partial match not supported — use exact source name)"),
    is_read: z
      .boolean()
      .optional()
      .describe("Filter by read status (true = read, false = unread)"),
    date_from: z
      .string()
      .optional()
      .describe("Filter articles published on or after this date (YYYY-MM-DD)"),
    date_to: z
      .string()
      .optional()
      .describe("Filter articles published on or before this date (YYYY-MM-DD)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe("Number of records to return (default 50, max 200)"),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe("Pagination offset"),
  },
  async (input) => {
    try {
      const params = new URLSearchParams();
      if (input.tier) params.set("tier", input.tier);
      if (input.source) params.set("source", input.source);
      if (input.is_read !== undefined) params.set("is_read", String(input.is_read));
      if (input.date_from) params.set("date_from", input.date_from);
      if (input.date_to) params.set("date_to", input.date_to);
      params.set("limit", String(input.limit ?? 50));
      params.set("offset", String(input.offset ?? 0));

      const result = await radarRequest("GET", `/api/industry?${params}`);
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Tool: get_stats ─────────────────────────────────────────────────────────

server.tool(
  "get_stats",
  "Get aggregated statistics across all competitor events: tier distribution (Critical/High/Medium/Low counts), " +
  "theme distribution, competitor activity rankings, event timeline, route distribution, and total event count. " +
  "Use this for high-level competitive landscape analysis.",
  {},
  async () => {
    try {
      const result = await radarRequest("GET", "/api/stats");
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

// ─── Start Server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Radar MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
