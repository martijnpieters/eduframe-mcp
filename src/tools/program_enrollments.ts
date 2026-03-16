import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPost, apiPut } from "../api";
import { formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerProgramEnrollmentTools(server: McpServer): void {
  server.registerTool(
    "get_program_enrollments",
    {
      description: "Get all program enrollments",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        student_id: z.number().int().optional().describe("Filter results on student_id"),
        edition_id: z.number().int().optional().describe("Filter results on edition_id"),
      },
    },
    async ({ cursor, per_page, student_id, edition_id }) => {
      try {
        const result = await apiList<EduframeRecord>("/program/enrollments", {
          cursor,
          per_page,
          student_id,
          edition_id,
        });
        void logResponse("get_program_enrollments", { cursor, per_page, student_id, edition_id }, result);
        const toolResult = formatList(result.records, "program enrollments");
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
    "get_program_enrollment",
    {
      description: "Get a program enrollment record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program enrollment to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/program/enrollments/${id}`);
        void logResponse("get_program_enrollment", { id }, record);
        return formatShow(record, "program enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "cancel_program_enrollment",
    {
      description: "Cancel a program enrollment",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program enrollment") },
    },
    async ({ id }) => {
      try {
        const record = await apiPut<EduframeRecord>(`/program/enrollments/${id}/cancel`, {});
        void logResponse("cancel_program_enrollment", { id }, record);
        return formatShow(record, "program enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "award_certificate_to_program_enrollment",
    {
      description: "Awards a certificate to a program enrollment",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the program enrollment"),
        certificate_template_id: z.number().int().describe("Id of the certificate template to use for the certificate"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPut<EduframeRecord>(`/program/enrollments/${id}/award_certificate`, body);
        void logResponse("award_certificate_to_program_enrollment", { id, ...body }, record);
        return formatShow(record, "program enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_certificate_from_program_enrollment",
    {
      description: "Deletes a certificate from a program enrollment",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the program enrollment") },
    },
    async ({ id }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/program/enrollments/${id}/delete_certificate`, {});
        void logResponse("delete_certificate_from_program_enrollment", { id }, record);
        return formatShow(record, "program enrollment");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
