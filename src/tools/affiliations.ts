import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiList, apiPatch, apiPost } from "../api";
import { formatCreate, formatDelete, formatError, formatList, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerAffiliationTools(server: McpServer): void {
  server.registerTool(
    "get_affiliations",
    {
      description: "Get all affiliations",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        user_id: z.number().int().optional().describe("Filter results on user_id"),
        account_id: z.number().int().optional().describe("Filter results on account_id"),
      },
    },
    async ({ cursor, per_page, user_id, account_id }) => {
      try {
        const result = await apiList<EduframeRecord>("/affiliations", { cursor, per_page, user_id, account_id });
        void logResponse("get_affiliations", { cursor, per_page, user_id, account_id }, result);
        const toolResult = formatList(result.records, "affiliations");
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
    "create_affiliation",
    {
      description: "Create an affiliation affiliations",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        user_id: z.number().int().describe("Unique identifier of the associated user"),
        account_id: z.number().int().describe("Unique identifier of the associated account"),
        key_contact: z
          .boolean()
          .optional()
          .describe("Boolean indicating if this user is a key contact of the account."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/affiliations", body);
        void logResponse("create_affiliation", body, record);
        return formatCreate(record, "affiliation");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_affiliation",
    {
      description: "Update an affiliation.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the affiliation to update"),
        key_contact: z
          .boolean()
          .optional()
          .describe("Boolean indicating if this user is a key contact of the account."),
        user_id: z.number().int().optional().describe("Unique identifier of the associated user"),
        account_id: z.number().int().optional().describe("Unique identifier of the associated account"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/affiliations/${id}`, body);
        void logResponse("update_affiliation", { id, ...body }, record);
        return formatUpdate(record, "affiliation");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_affiliation",
    {
      description: "Delete an affiliation",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the affiliation to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/affiliations/${id}`);
        void logResponse("delete_affiliation", { id }, record);
        return formatDelete(record, "affiliation");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
