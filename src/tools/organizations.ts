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

export function registerOrganizationTools(server: McpServer): void {
  server.registerTool(
    "get_organization_affiliations",
    {
      description: "Get all organization affiliation records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        user_id: z.number().int().optional().describe("Filter results on user_id"),
      },
    },
    async ({ cursor, per_page, user_id }) => {
      try {
        const result = await apiList<EduframeRecord>("/organization_affiliations", { cursor, per_page, user_id });
        void logResponse("get_organization_affiliations", { cursor, per_page, user_id }, result);
        const toolResult = formatList(result.records, "organizations");
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
    "get_organization",
    {
      description: "Get an organization record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the organization to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/organizations/${id}`);
        void logResponse("get_organization", { id }, record);
        return formatShow(record, "organization");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_organization_affiliation",
    {
      description: "Create an organization affiliation record",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        organization_id: z.number().int().describe("Unique identifier of the organization."),
        user_id: z.number().int().describe("Unique identifier of the user."),
        key_contact: z
          .boolean()
          .optional()
          .describe("Indicates whether the user is a key contact for the organization."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/organization_affiliations", body);
        void logResponse("create_organization_affiliation", body, record);
        return formatCreate(record, "organization");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_organization_affiliation",
    {
      description: "Update an organization affiliation record",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the organization to update"),
        key_contact: z
          .boolean()
          .optional()
          .describe("Indicates whether the user is a key contact for the organization."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/organization_affiliations/${id}`, body);
        void logResponse("update_organization_affiliation", { id, ...body }, record);
        return formatUpdate(record, "organization");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_organization_affiliation",
    {
      description: "Delete an organization affiliation record",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the organization to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/organization_affiliations/${id}`);
        void logResponse("delete_organization_affiliation", { id }, record);
        return formatDelete(record, "organization");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
