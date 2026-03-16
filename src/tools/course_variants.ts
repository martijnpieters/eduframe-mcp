import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPost } from "../api";
import { formatCreate, formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCourseVariantTools(server: McpServer): void {
  server.registerTool(
    "get_course_variants",
    {
      description: "Get all course variant records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/course_variants", { cursor, per_page });
        void logResponse("get_course_variants", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "course variants");
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
    "get_course_variant",
    {
      description: "Get a course variant record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the course variant to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/course_variants/${id}`);
        void logResponse("get_course_variant", { id }, record);
        return formatShow(record, "course variant");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_course_variant",
    {
      description: "Create a course variant",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: { name: z.string().describe("The name of the course variant.") },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/course_variants", body);
        void logResponse("create_course_variant", body, record);
        return formatCreate(record, "course variant");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
