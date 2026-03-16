import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "../api";
import { formatDelete, formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCustomRecordTools(server: McpServer): void {
  server.registerTool(
    "get_custom_records",
    {
      description: "Get all custom records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_slug: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ object_slug, cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>(`/custom/objects/${object_slug}/records`, { cursor, per_page });
        void logResponse("get_custom_records", { object_slug, cursor, per_page }, result);
        const toolResult = formatList(result.records, "custom records");
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
    "get_custom_record",
    {
      description: "Get a custom record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_slug: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the custom record to retrieve"),
      },
    },
    async ({ object_slug, id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/custom/objects/${object_slug}/records/${record_id}`);
        void logResponse("get_custom_record", { object_slug, id }, record);
        return formatShow(record, "custom record");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_custom_record",
    {
      description: "Update a custom record",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_slug: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the custom record to update"),
        active: z.boolean().optional().describe("Whether the custom record is active."),
        display_name: z.string().optional().describe("The display name of the custom record."),
        properties: z.record(z.unknown()).optional(),
      },
    },
    async ({ object_slug, id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/custom/objects/${object_slug}/records/${record_id}`, body);
        void logResponse("update_custom_record", { object_slug, id, ...body }, record);
        return formatUpdate(record, "custom record");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_custom_record",
    {
      description: "Delete a custom record",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: {
        object_slug: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the custom record to delete"),
      },
    },
    async ({ object_slug, id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/custom/objects/${object_slug}/records/${record_id}`);
        void logResponse("delete_custom_record", { object_slug, id }, record);
        return formatDelete(record, "custom record");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_custom_record",
    {
      description: "Create a custom record",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_slug: z.number().int().positive().describe("ID of the custom record"),
        active: z.boolean().optional().describe("Whether the custom record is active."),
        display_name: z.string().describe("The display name of the custom record."),
        properties: z.record(z.unknown()),
      },
    },
    async ({ object_slug, ...body }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/custom/objects/${object_slug}/records`, body);
        void logResponse("create_custom_record", { object_slug, ...body }, record);
        return formatShow(record, "custom record");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
