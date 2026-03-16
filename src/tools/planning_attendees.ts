import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiPost } from "../api";
import { formatCreate, formatDelete, formatError, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const planningAttendeeAttendableTypeEnum = z.enum(["Meeting", "Planning::Event"]);

export function registerPlanningAttendeeTools(server: McpServer): void {
  server.registerTool(
    "create_planning_attendee",
    {
      description: "Assign a teacher to a meeting or planning event.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        teacher_id: z.number().int().describe("Unique identifier of the teacher."),
        attendable_id: z.number().int().describe("Unique identifier of the attendable."),
        attendable_type: planningAttendeeAttendableTypeEnum.describe(
          'Type of the attendable (e.g., "Meeting" or "Planning::Event").',
        ),
        teacher_role_id: z.number().int().optional().describe("Unique identifier of the teacher role."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/planning/attendees", body);
        void logResponse("create_planning_attendee", body, record);
        return formatCreate(record, "planning attendee");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_planning_attendee",
    {
      description: "Remove a teacher from a meeting or planning event.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the planning attendee to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/planning/attendees/${id}`);
        void logResponse("delete_planning_attendee", { id }, record);
        return formatDelete(record, "planning attendee");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
