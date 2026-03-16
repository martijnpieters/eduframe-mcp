import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import { formatCreate, formatDelete, formatError, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerGradeTools(server: McpServer): void {
  server.registerTool(
    "get_grade",
    {
      description: "Get a grade record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the grade to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/grades/${id}`);
        void logResponse("get_grade", { id }, record);
        return formatShow(record, "grade");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_grade",
    {
      description: "Create a grade",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        grade: z.string().describe("The grade awarded (at least one of grade and score is required)"),
        score: z.number().describe("The score awarded (at least one of grade and score is required)"),
        gradeable_id: z.number().int().describe("Unique model identifier of the gradeable (enrollment / ...)"),
        gradeable_type: z.string().describe("Model type of the gradeable (enrollment / ...)"),
        comment: z.string().optional().describe("Additional comment about the grade"),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/grades", body);
        void logResponse("create_grade", body, record);
        return formatCreate(record, "grade");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_grade",
    {
      description: "Update a grade",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the grade to update"),
        grade: z.string().optional().describe("The grade awarded (at least one of grade and score is required)"),
        score: z.number().optional().describe("The score awarded (at least one of grade and score is required)"),
        gradeable_id: z
          .number()
          .int()
          .optional()
          .describe("Unique model identifier of the gradeable (enrollment / ...)"),
        gradeable_type: z.string().optional().describe("Model type of the gradeable (enrollment / ...)"),
        comment: z.string().optional().describe("Additional comment about the grade"),
        enrollment_id: z.number().int().optional().describe("Unique identifier of the enrollment"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/grades/${id}`, body);
        void logResponse("update_grade", { id, ...body }, record);
        return formatUpdate(record, "grade");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_grade",
    {
      description: "Delete a grade.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the grade to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/grades/${id}`);
        void logResponse("delete_grade", { id }, record);
        return formatDelete(record, "grade");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
