import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiGet, apiList } from "../api";
import { formatDelete, formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerMeetingTools(server: McpServer): void {
  server.registerTool(
    "get_meetings_by_planned_course_id",
    {
      description: "Get all meeting records of a planned course",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        planned_course_id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        sort: z
          .array(z.enum(["start_date_time:asc", "start_date_time:desc", "name:asc", "name:desc"]))
          .optional()
          .describe(
            "Sort the results. Can change order by using `<sort_by>:<direction>` where `<direction>` is either `asc` or `desc`",
          ),
      },
    },
    async ({ planned_course_id, cursor, per_page, sort }) => {
      try {
        const result = await apiList<EduframeRecord>(`/planned_courses/${planned_course_id}/meetings`, {
          cursor,
          per_page,
          sort,
        });
        void logResponse("get_meetings_by_planned_course_id", { planned_course_id, cursor, per_page, sort }, result);
        const toolResult = formatList(result.records, "meetings");
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
    "get_meeting",
    {
      description: "Get an meeting record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the meeting to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/meetings/${id}`);
        void logResponse("get_meeting", { id }, record);
        return formatShow(record, "meeting");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_meeting",
    {
      description: "Delete a meeting.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the meeting to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/meetings/${id}`);
        void logResponse("delete_meeting", { id }, record);
        return formatDelete(record, "meeting");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
