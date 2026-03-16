import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLeadTools } from "./leads";

const tools: Array<(server: McpServer) => void> = [registerLeadTools];

export function registerAllTools(server: McpServer): void {
  for (const register of tools) {
    register(server);
  }
}
