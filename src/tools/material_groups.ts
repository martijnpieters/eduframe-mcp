import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "../api";
import {
  formatCreate,
  formatDelete,
  formatError,
  formatList,
  formatShow,
  formatUpdate,
  type EduframeRecord,
} from "../formatters";
import { logResponse } from "../response-logger";

export function registerMaterialGroupTools(server: McpServer): void {
  server.registerTool(
    "get_material_groups",
    {
      description: "Get all material group records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/material_groups", { cursor, per_page });
        void logResponse("get_material_groups", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "material groups");
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
    "get_material_group",
    {
      description: "Get a material group record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the material group to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/material_groups/${id}`);
        void logResponse("get_material_group", { id }, record);
        return formatShow(record, "material group");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_material_group",
    {
      description: "Create a material group.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: { name: z.string().describe("Name of the material group where the course is held.") },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/material_groups", body);
        void logResponse("create_material_group", body, record);
        return formatCreate(record, "material group");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_material_group",
    {
      description: "Update a material group.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the material group to update"),
        name: z.string().optional().describe("Name of the material group where the course is held."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/material_groups/${id}`, body);
        void logResponse("update_material_group", { id, ...body }, record);
        return formatUpdate(record, "material group");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_material_group",
    {
      description: "Delete a material group.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the material group to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/material_groups/${id}`);
        void logResponse("delete_material_group", { id }, record);
        return formatDelete(record, "material group");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
