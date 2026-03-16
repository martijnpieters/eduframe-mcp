import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiPost } from "../api";
import { formatCreate, formatError, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerPlanningRequiredTeacherGroupAttendeeTools(server: McpServer): void {
  server.registerTool(
    "create_planning_required_teacher_group_attendee",
    {
      description: "Assign a teacher to a required teacher group",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        teacher_id: z.number().int().describe("Unique identifier of the teacher to assign."),
        required_teacher_group_id: z
          .number()
          .int()
          .describe("Unique identifier of the required teacher group to satisfy."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/planning/required_teacher_group_attendees", body);
        void logResponse("create_planning_required_teacher_group_attendee", body, record);
        return formatCreate(record, "planning required teacher group attendee");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
