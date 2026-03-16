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

export function registerMeetingLocationTools(server: McpServer): void {
  server.registerTool(
    "get_meeting_locations",
    {
      description: "Get all meeting location records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/meeting_locations", { cursor, per_page });
        void logResponse("get_meeting_locations", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "meeting locations");
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
    "get_meeting_location",
    {
      description: "Get an meeting location",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the meeting location to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/meeting_locations/${id}`);
        void logResponse("get_meeting_location", { id }, record);
        return formatShow(record, "meeting location");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_meeting_location",
    {
      description: "Create a meeting location.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        name: z.string().describe("Name of the meeting location."),
        course_location_id: z.number().int().describe("Unique identifier of the course location."),
        capacity: z.number().int().optional().describe("Capacity of the meeting location"),
        address_attributes: z
          .object({
            addressee: z.string().optional().describe("The addressee of the address."),
            address: z.string().describe("Concatenation of the street and house number."),
            address_line2: z.string().optional().describe("A string representing the second line of the address."),
            postal_code: z.string().describe("A string representing the postal code."),
            city: z.string().describe("A string representing the city."),
            state_province: z.string().optional().describe("An letter USA state code."),
            country: z.string().describe("An ISO3166 two-letter country code."),
          })
          .optional(),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/meeting_locations", body);
        void logResponse("create_meeting_location", body, record);
        return formatCreate(record, "meeting location");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_meeting_location",
    {
      description: "Update a meeting location.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the meeting location to update"),
        name: z.string().optional().describe("Name of the meeting location."),
        course_location_id: z.number().int().optional().describe("Unique identifier of the course location."),
        capacity: z.number().optional().describe("Capacity of the meeting location"),
        address_attributes: z
          .object({
            addressee: z.string().optional().describe("The addressee of the address."),
            address: z.string().optional().describe("Concatenation of the street and house number."),
            address_line2: z.string().optional().describe("A string representing the second line of the address."),
            postal_code: z.string().optional().describe("A string representing the postal code."),
            city: z.string().optional().describe("A string representing the city."),
            state_province: z.string().optional().describe("An letter USA state code."),
            country: z.string().optional().describe("An ISO3166 two-letter country code."),
          })
          .optional(),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/meeting_locations/${id}`, body);
        void logResponse("update_meeting_location", { id, ...body }, record);
        return formatUpdate(record, "meeting location");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_meeting_location",
    {
      description: "Delete a course location.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the meeting location to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/meeting_locations/${id}`);
        void logResponse("delete_meeting_location", { id }, record);
        return formatDelete(record, "meeting location");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
