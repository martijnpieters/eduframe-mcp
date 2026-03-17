import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateConfig } from "./api";
import { registerAllTools } from "./tools";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const server = new McpServer({
  name: "eduframe-mcp",
  version,
});

registerAllTools(server);

async function main(): Promise<void> {
  validateConfig();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
