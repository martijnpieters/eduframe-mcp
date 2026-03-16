import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiList, apiPatch, apiPost } from "../api";
import { formatCreate, formatDelete, formatError, formatList, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const materialUseTypeEnum = z.enum(["reservable", "consumable"]);

export function registerMaterialTools(server: McpServer): void {
  server.registerTool(
    "get_materials",
    {
      description: "Get all material records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/materials", { cursor, per_page });
        void logResponse("get_materials", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "materials");
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
    "create_material",
    {
      description: "Create a material.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        name: z.string().describe("Name of the material."),
        use_type: materialUseTypeEnum.optional().describe("Type of material."),
        material_group_id: z.number().int().describe("Unique identifier of the material group."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/materials", body);
        void logResponse("create_material", body, record);
        return formatCreate(record, "material");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_material",
    {
      description: "Update a material.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the material to update"),
        name: z.string().optional().describe("Name of the material."),
        material_group_id: z.number().int().optional().describe("Unique identifier of the material group."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/materials/${id}`, body);
        void logResponse("update_material", { id, ...body }, record);
        return formatUpdate(record, "material");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_material",
    {
      description: "Delete a material.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the material to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/materials/${id}`);
        void logResponse("delete_material", { id }, record);
        return formatDelete(record, "material");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
