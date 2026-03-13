#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateConfig } from "./api";
import { registerLeadTools } from "./tools/leads";

const server = new McpServer({
  name: "eduframe-mcp",
  version: "0.1.0",
});

registerLeadTools(server);

async function main(): Promise<void> {
  validateConfig();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
