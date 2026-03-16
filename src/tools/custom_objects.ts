import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList } from "../api";
import { formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCustomObjectTools(server: McpServer): void {
  server.registerTool(
    "get_custom_objects",
    {
      description: "Get all custom objects",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/custom/objects", { cursor, per_page });
        void logResponse("get_custom_objects", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "custom objects");
        if (result.nextCursor) {
          toolResult.content.push({ type: "text", text: `\nNext page cursor: ${result.nextCursor}` });
        }
        return toolResult;
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "get_custom_object_by_object_slug",
    {
      description: "Get a custom object by the object slug",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the custom object to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/custom/objects/${object_slug}`);
        void logResponse("get_custom_object_by_object_slug", { id }, record);
        return formatShow(record, "custom object");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
