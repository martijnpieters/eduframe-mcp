import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiList, apiPatch, apiPost } from "../api";
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

export function registerTeacherEnrollmentTools(server: McpServer): void {
  server.registerTool(
    "get_teacher_enrollments_by_planned_course_id",
    {
      description: "Get all teacher enrollments for given planned course.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        planned_course_id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ planned_course_id, cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>(`/planned_courses/${planned_course_id}/teacher_enrollments`, {
          cursor,
          per_page,
        });
        void logResponse(
          "get_teacher_enrollments_by_planned_course_id",
          { planned_course_id, cursor, per_page },
          result,
        );
        const toolResult = formatList(result.records, "teacher enrollments");
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
    "create_teacher_enrollment",
    {
      description: "Enroll a teacher to a planned_course.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        planned_course_id: z.number().int().describe("Unique identifier of the planned course."),
        teacher_id: z.number().int().describe("Unique identifier of the teacher."),
        teacher_role_id: z.number().int().optional().describe("Unique identifier of the teacher role.\n"),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/teacher_enrollments", body);
        void logResponse("create_teacher_enrollment", body, record);
        return formatCreate(record, "teacher enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_teacher_enrollment",
    {
      description: "Update a teacher enrollment.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the teacher enrollment to update"),
        planned_course_id: z.number().int().optional().describe("Unique identifier of the planned course."),
        teacher_id: z.number().int().optional().describe("Unique identifier of the teacher."),
        teacher_role_id: z.number().int().optional().describe("Unique identifier of the teacher role.\n"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/teacher_enrollments/${id}`, body);
        void logResponse("update_teacher_enrollment", { id, ...body }, record);
        return formatUpdate(record, "teacher enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_teacher_enrollment",
    {
      description: "Delete a teacher enrollment.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the teacher enrollment to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/teacher_enrollments/${id}`);
        void logResponse("delete_teacher_enrollment", { id }, record);
        return formatDelete(record, "teacher enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_teacher_enrollment_by_planned_course_id",
    {
      description: "Enroll a teacher to the given planned course.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        planned_course_id: z.number().int().positive().describe("ID of the teacher enrollment"),
        teacher_id: z.number().int().describe("Unique identifier of the teacher."),
        teacher_role_id: z.number().int().optional().describe("Unique identifier of the teacher role."),
      },
    },
    async ({ planned_course_id, ...body }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/planned_courses/${planned_course_id}/teacher_enrollments`, body);
        void logResponse("create_teacher_enrollment_by_planned_course_id", { planned_course_id, ...body }, record);
        return formatShow(record, "teacher enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
