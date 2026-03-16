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

export function registerProgramElementTools(server: McpServer): void {
  server.registerTool(
    "get_program_elements",
    {
      description: "Get all elements",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        edition_id: z.number().int().optional().describe("Filter results on edition_id"),
      },
    },
    async ({ cursor, per_page, edition_id }) => {
      try {
        const result = await apiList<EduframeRecord>("/program/elements", { cursor, per_page, edition_id });
        void logResponse("get_program_elements", { cursor, per_page, edition_id }, result);
        const toolResult = formatList(result.records, "program elements");
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
    "get_program_element",
    {
      description: "Get an element",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program element to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/program/elements/${id}`);
        void logResponse("get_program_element", { id }, record);
        return formatShow(record, "program element");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_program_element",
    {
      description: "Create a program element",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        course_id: z.number().int().describe("The identifier of the associated course."),
        edition_id: z.number().int().describe("The identifier of the associated course."),
        planned_course_id: z.number().int().optional().describe("The identifier of the associated course."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/program/elements", body);
        void logResponse("create_program_element", body, record);
        return formatCreate(record, "program element");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_program_element",
    {
      description: "Update an element",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the program element to update"),
        edition_id: z.number().int().optional().describe("The identifier of the associated course."),
        planned_course_id: z.number().int().optional().describe("The identifier of the associated course."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/program/elements/${id}`, body);
        void logResponse("update_program_element", { id, ...body }, record);
        return formatUpdate(record, "program element");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_program_element",
    {
      description: "Delete a element",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program element to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/program/elements/${id}`);
        void logResponse("delete_program_element", { id }, record);
        return formatDelete(record, "program element");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
