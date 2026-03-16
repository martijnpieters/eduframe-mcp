import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList } from "../api";
import { formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerTheseTools(server: McpServer): void {
  server.registerTool(
    "get_theses",
    {
      description: "Get all thesis records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/theses", { cursor, per_page });
        void logResponse("get_theses", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "theses");
        if (result.nextCursor) {
          toolResult.content.push({ type: "text", text: `\nNext page cursor: ${result.nextCursor}` });
        }
        return toolResult;
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
