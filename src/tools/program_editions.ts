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

const programEditionCostSchemeEnum = z.enum(["student", "order", "tbd", "free"]);

export function registerProgramEditionTools(server: McpServer): void {
  server.registerTool(
    "get_elements_of_program_edition",
    {
      description: "Get the elements of a program edition",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ id, cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>(`/program/editions/${id}/elements`, { cursor, per_page });
        void logResponse("get_elements_of_program_edition", { id, cursor, per_page }, result);
        const toolResult = formatList(result.records, "program editions");
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
    "get_program_edition",
    {
      description: "Get a program edition",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program edition to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/program/editions/${id}`);
        void logResponse("get_program_edition", { id }, record);
        return formatShow(record, "program edition");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_program_edition",
    {
      description: "Create a program edition",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        program_id: z.number().int().describe("Unique identifier of associated program."),
        name: z.string().describe("Name of the program edition."),
        start_date: z.string().optional().describe("Nominal start date of the edition."),
        end_date: z.string().optional().describe("Nominal end date of the edition (inclusive)."),
        cost: z
          .number()
          .optional()
          .describe(
            "The price to be paid for this edition. Required if cost_scheme is student (default value) or order.",
          ),
        cost_scheme: programEditionCostSchemeEnum.optional().describe("How should the edition be paid by default."),
        min_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the minimum number of participants."),
        max_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the maximum number of participants."),
        is_published: z.boolean().optional().describe("Boolean representing the publishable status of the edition."),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/program/editions", body);
        void logResponse("create_program_edition", body, record);
        return formatCreate(record, "program edition");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_program_edition",
    {
      description: "Update a program edition",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the program edition to update"),
        name: z.string().optional().describe("Name of the program edition."),
        start_date: z.string().optional().describe("Nominal start date of the edition."),
        end_date: z.string().optional().describe("Nominal end date of the edition (inclusive)."),
        cost: z.string().optional().describe("The price to be paid for this edition."),
        cost_scheme: programEditionCostSchemeEnum.optional().describe("How should the edition be paid by default."),
        min_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the minimum number of participants."),
        max_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the maximum number of participants."),
        is_published: z.boolean().optional().describe("Boolean representing the publishable status of the edition."),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/program/editions/${id}`, body);
        void logResponse("update_program_edition", { id, ...body }, record);
        return formatUpdate(record, "program edition");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_program_edition",
    {
      description: "Delete a program edition",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program edition to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/program/editions/${id}`);
        void logResponse("delete_program_edition", { id }, record);
        return formatDelete(record, "program edition");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "get_program_edition_of_elements_batch",
    {
      description: "Adds a set of elements to a program edition.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the program edition"),
        elements: z.array(
          z.union([
            z.object({
              type: z.enum(["CourseElement"]),
              course_id: z.number().int(),
              planned_course_id: z.number().int().optional(),
            }),
            z.object({
              type: z.enum(["BlockElement"]),
              name: z.string(),
              elements: z.array(
                z.object({
                  type: z.enum(["CourseElement"]),
                  course_id: z.number().int(),
                  planned_course_id: z.number().int().optional(),
                }),
              ),
            }),
          ]),
        ),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/program/editions/${id}/elements_batch`, body);
        void logResponse("get_program_edition_of_elements_batch", { id, ...body }, record);
        return formatShow(record, "program edition");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
