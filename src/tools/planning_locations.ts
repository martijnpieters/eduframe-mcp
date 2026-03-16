import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList } from "../api";
import { formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerPlanningLocationTools(server: McpServer): void {
  server.registerTool(
    "get_planning_locations",
    {
      description: "Get all locations that are available",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/planning/locations", { cursor, per_page });
        void logResponse("get_planning_locations", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "planning locations");
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
