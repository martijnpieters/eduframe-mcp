import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList, apiPost } from "../api";
import { formatCreate, formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const attendanceStateEnum = z.enum(["absent", "absent_with_leave", "attended", "blanco", "late"]);

export function registerAttendanceTools(server: McpServer): void {
  server.registerTool(
    "get_attendances",
    {
      description: "Get all attendance records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        meeting_id: z.number().int().optional().describe("Filter attendances on meeting_id"),
      },
    },
    async ({ cursor, per_page, meeting_id }) => {
      try {
        const result = await apiList<EduframeRecord>("/attendances", { cursor, per_page, meeting_id });
        void logResponse("get_attendances", { cursor, per_page, meeting_id }, result);
        const toolResult = formatList(result.records, "attendances");
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
    "set_attendance",
    {
      description: "Set an attendance.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        meeting_id: z.number().int().describe("Unique identifier of the meeting."),
        enrollment_id: z.number().int().describe("Unique identifier of the enrollment."),
        state: attendanceStateEnum.optional().describe("Indicator of the attendance state."),
        comment: z.string().optional().describe("Comment about this attendance."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/attendances/upsert", body);
        void logResponse("set_attendance", body, record);
        return formatCreate(record, "attendance");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
