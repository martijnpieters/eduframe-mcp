import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPost } from "../api";
import { formatCreate, formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerTeacherTools(server: McpServer): void {
  server.registerTool(
    "get_teachers",
    {
      description: "Get all teacher records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        search: z.string().optional().describe("Filter results on search"),
        label_id: z.array(z.number().int()).optional().describe("Filter results on label_id"),
        id: z.array(z.number().int()).optional().describe("Filter results on id"),
      },
    },
    async ({ cursor, per_page, search, label_id, id }) => {
      try {
        const result = await apiList<EduframeRecord>("/teachers", { cursor, per_page, search, label_id, id });
        void logResponse("get_teachers", { cursor, per_page, search, label_id, id }, result);
        const toolResult = formatList(result.records, "teachers");
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
    "get_teacher",
    {
      description: "Get a teacher record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the teacher to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/teachers/${id}`);
        void logResponse("get_teacher", { id }, record);
        return formatShow(record, "teacher");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_teacher",
    {
      description: "Create a new teacher",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: { user_id: z.number().int().optional().describe("The id of the user to make a teacher") },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/teachers", body);
        void logResponse("create_teacher", body, record);
        return formatCreate(record, "teacher");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "activate_teacher",
    {
      description: "Mark teacher as active",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the teacher") },
    },
    async ({ id }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/teachers/${id}/activate`, {});
        void logResponse("activate_teacher", { id }, record);
        return formatShow(record, "teacher");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "deactivate_teacher",
    {
      description: "Mark teacher as inactive",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the teacher") },
    },
    async ({ id }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/teachers/${id}/deactivate`, {});
        void logResponse("deactivate_teacher", { id }, record);
        return formatShow(record, "teacher");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
