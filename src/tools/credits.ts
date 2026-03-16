import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList } from "../api";
import { formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCreditTools(server: McpServer): void {
  server.registerTool(
    "get_credits",
    {
      description: "Get all credit records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        student_id: z.number().int().optional().describe("Filter results on student_id"),
      },
    },
    async ({ cursor, per_page, student_id }) => {
      try {
        const result = await apiList<EduframeRecord>("/credits", { cursor, per_page, student_id });
        void logResponse("get_credits", { cursor, per_page, student_id }, result);
        const toolResult = formatList(result.records, "credits");
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
