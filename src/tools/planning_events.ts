import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiGet, apiList } from "../api";
import { formatDelete, formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerPlanningEventTools(server: McpServer): void {
  server.registerTool(
    "get_planning_events",
    {
      description: "Get all planning event records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/planning/events", { cursor, per_page });
        void logResponse("get_planning_events", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "planning events");
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
    "get_planning_event",
    {
      description: "Get an planning event record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the planning event to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/planning/events/${id}`);
        void logResponse("get_planning_event", { id }, record);
        return formatShow(record, "planning event");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_planning_event",
    {
      description: "Delete a planning event.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the planning event to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/planning/events/${id}`);
        void logResponse("delete_planning_event", { id }, record);
        return formatDelete(record, "planning event");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
