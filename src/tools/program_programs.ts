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

const programProgramCostSchemeEnum = z.enum(["student", "order", "tbd", "free"]);

export function registerProgramProgramTools(server: McpServer): void {
  server.registerTool(
    "get_programs",
    {
      description: "Get all programs",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/program/programs", { cursor, per_page });
        void logResponse("get_programs", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "program programs");
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
    "get_program",
    {
      description: "Get a program",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program program to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/program/programs/${id}`);
        void logResponse("get_program", { id }, record);
        return formatShow(record, "program program");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_program",
    {
      description: "Create a program",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        name: z.string().describe("Name of the program."),
        category_id: z.number().int().describe("Identifier of the category of the program."),
        cost_scheme: programProgramCostSchemeEnum.describe("How should the program be paid by default."),
        cost: z
          .number()
          .int()
          .optional()
          .describe(
            "The price to be paid for this program. Required if cost_scheme is student (default value) or order.",
          ),
        is_published: z.boolean().optional().describe("Boolean representing the publishable status of the program."),
        label_ids: z.array(z.number().int()).optional().describe("IDs of the labels"),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
        course_tab_contents_attributes: z
          .array(
            z.object({
              content: z.string().describe("The HTML content of the course tab."),
              course_tab_id: z.number().int().describe("Unique identifier of the course tab."),
            }),
          )
          .optional(),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/program/programs", body);
        void logResponse("create_program", body, record);
        return formatCreate(record, "program program");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_program",
    {
      description: "Update a program",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the program program to update"),
        name: z.string().optional().describe("Name of the program."),
        cost: z.string().optional().describe("The price to be paid for this program."),
        cost_scheme: programProgramCostSchemeEnum.optional().describe("How should the program be paid by default."),
        is_published: z.boolean().optional().describe("Boolean representing the publishable status of the program."),
        category_id: z.number().int().optional().describe("Identifier of the category of the program."),
        slug: z.string().optional().describe("Human readable identifier, unique per educator."),
        label_ids: z.array(z.number().int()).optional().describe("IDs of the labels"),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
        course_tab_contents_attributes: z
          .array(
            z.object({
              content: z.string().describe("The HTML content of the course tab."),
              course_tab_id: z.number().int().describe("Unique identifier of the course tab."),
            }),
          )
          .optional(),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/program/programs/${id}`, body);
        void logResponse("update_program", { id, ...body }, record);
        return formatUpdate(record, "program program");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_program",
    {
      description: "Delete a program",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program program to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/program/programs/${id}`);
        void logResponse("delete_program", { id }, record);
        return formatDelete(record, "program program");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
