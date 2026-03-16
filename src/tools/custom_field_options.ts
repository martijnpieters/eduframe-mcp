import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "../api";
import { formatDelete, formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCustomFieldOptionTools(server: McpServer): void {
  server.registerTool(
    "get_options_of_custom_field",
    {
      description: "Get all options of a custom field",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_type: z.number().int().positive().describe("ID of the parent resource"),
        field_slug: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ object_type, field_slug, cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>(`/custom/${object_type}/fields/${field_slug}/options`, {
          cursor,
          per_page,
        });
        void logResponse("get_options_of_custom_field", { object_type, field_slug, cursor, per_page }, result);
        const toolResult = formatList(result.records, "custom field options");
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
    "get_option_of_custom_field",
    {
      description: "Get an option of a custom field",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_type: z.number().int().positive().describe("ID of the parent resource"),
        field_slug: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the custom field option to retrieve"),
      },
    },
    async ({ object_type, field_slug, id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/custom/${object_type}/fields/${field_slug}/options/${option_id}`);
        void logResponse("get_option_of_custom_field", { object_type, field_slug, id }, record);
        return formatShow(record, "custom field option");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_option_of_custom_field",
    {
      description: "Update an option of a custom field",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_type: z.number().int().positive().describe("ID of the parent resource"),
        field_slug: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the custom field option to update"),
        value: z.string().optional(),
        enabled: z.boolean().optional().describe("Whether the option can be chosen or not"),
      },
    },
    async ({ object_type, field_slug, id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(
          `/custom/${object_type}/fields/${field_slug}/options/${option_id}`,
          body,
        );
        void logResponse("update_option_of_custom_field", { object_type, field_slug, id, ...body }, record);
        return formatUpdate(record, "custom field option");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_option_of_custom_field",
    {
      description: "Delete an option from custom field",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: {
        object_type: z.number().int().positive().describe("ID of the parent resource"),
        field_slug: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the custom field option to delete"),
      },
    },
    async ({ object_type, field_slug, id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(
          `/custom/${object_type}/fields/${field_slug}/options/${option_id}`,
        );
        void logResponse("delete_option_of_custom_field", { object_type, field_slug, id }, record);
        return formatDelete(record, "custom field option");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "add_option_to_custom_field",
    {
      description: "Add an option to a custom field",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        object_type: z.number().int().positive().describe("ID of the custom field option"),
        field_slug: z.number().int().positive().describe("ID of the custom field option"),
        value: z.string(),
        enabled: z.boolean().describe("Whether the option can be chosen or not"),
      },
    },
    async ({ object_type, field_slug, ...body }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/custom/${object_type}/fields/${field_slug}/options`, body);
        void logResponse("add_option_to_custom_field", { object_type, field_slug, ...body }, record);
        return formatShow(record, "custom field option");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
