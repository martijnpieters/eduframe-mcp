import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPatch, apiPut } from "../api";
import { formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerEnrollmentTools(server: McpServer): void {
  server.registerTool(
    "get_enrollments",
    {
      description: "Get all enrollment records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        student_id: z.number().int().optional().describe("Filter results on student_id"),
        planned_course_id: z.number().int().optional().describe("Filter results on planned_course_id"),
        status: z
          .array(z.enum(["confirmed", "active", "canceled", "completed"]))
          .optional()
          .describe("Filter results on status"),
        with_canceled: z
          .boolean()
          .optional()
          .describe("Filter results based on whether they include a canceled status or not"),
      },
    },
    async ({ cursor, per_page, student_id, planned_course_id, status, with_canceled }) => {
      try {
        const result = await apiList<EduframeRecord>("/enrollments", {
          cursor,
          per_page,
          student_id,
          planned_course_id,
          status,
          with_canceled,
        });
        void logResponse(
          "get_enrollments",
          { cursor, per_page, student_id, planned_course_id, status, with_canceled },
          result,
        );
        const toolResult = formatList(result.records, "enrollments");
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
    "get_enrollment",
    {
      description: "Get an enrollment record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the enrollment to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/enrollments/${id}`);
        void logResponse("get_enrollment", { id }, record);
        return formatShow(record, "enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_enrollment",
    {
      description: "Update an enrollment",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the enrollment to update"),
        end_date: z
          .string()
          .optional()
          .describe(
            "If it is an enrollment of a fixed course, it equals the end date. For a flexible course, it returns the enrollment specific end date.",
          ),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/enrollments/${id}`, body);
        void logResponse("update_enrollment", { id, ...body }, record);
        return formatUpdate(record, "enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "cancel_enrollment",
    {
      description: "Cancel an enrollment",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the enrollment") },
    },
    async ({ id }) => {
      try {
        const record = await apiPut<EduframeRecord>(`/enrollments/${id}/cancel`, {});
        void logResponse("cancel_enrollment", { id }, record);
        return formatShow(record, "enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
