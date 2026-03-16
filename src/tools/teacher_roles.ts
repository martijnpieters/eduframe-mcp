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

export function registerTeacherRoleTools(server: McpServer): void {
  server.registerTool(
    "get_teacher_roles",
    {
      description: "Get all teacher roles",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/teacher_roles", { cursor, per_page });
        void logResponse("get_teacher_roles", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "teacher roles");
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
    "get_teacher_role",
    {
      description: "Get a teacher role",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the teacher role to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/teacher_roles/${id}`);
        void logResponse("get_teacher_role", { id }, record);
        return formatShow(record, "teacher role");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_teacher_role",
    {
      description: "Create a teacher role.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: { name: z.string().describe("The name of the teacher role.") },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/teacher_roles", body);
        void logResponse("create_teacher_role", body, record);
        return formatCreate(record, "teacher role");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_teacher_role",
    {
      description: "Update a teacher role.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the teacher role to update"),
        name: z.string().describe("The name of the teacher role."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/teacher_roles/${id}`, body);
        void logResponse("update_teacher_role", { id, ...body }, record);
        return formatUpdate(record, "teacher role");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_teacher_role",
    {
      description: "Delete a teacher role.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the teacher role to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/teacher_roles/${id}`);
        void logResponse("delete_teacher_role", { id }, record);
        return formatDelete(record, "teacher role");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
