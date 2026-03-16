import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList } from "../api";
import { formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerWebhookNotificationTools(server: McpServer): void {
  server.registerTool(
    "get_webhook_notifications_failed",
    {
      description: "Get the failed webhook notifications",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        webhook_id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        start: z.string().optional().describe("Only show failed notifications created after this date and time"),
        end: z.string().optional().describe("Only show failed notifications starting before this date and time"),
      },
    },
    async ({ webhook_id, cursor, per_page, start, end }) => {
      try {
        const result = await apiList<EduframeRecord>(`/webhooks/${webhook_id}/notifications/failed`, {
          cursor,
          per_page,
          start,
          end,
        });
        void logResponse("get_webhook_notifications_failed", { webhook_id, cursor, per_page, start, end }, result);
        const toolResult = formatList(result.records, "webhook notifications");
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
