import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList } from "../api";
import { formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCustomAssociationTools(server: McpServer): void {
  server.registerTool(
    "get_associations_of_object",
    {
      description: "Get all associations of a system object",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_type: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ object_type, cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>(`/custom/${object_type}/associations`, { cursor, per_page });
        void logResponse("get_associations_of_object", { object_type, cursor, per_page }, result);
        const toolResult = formatList(result.records, "custom associations");
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
