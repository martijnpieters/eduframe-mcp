import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiList, apiPost } from "../api";
import { formatCreate, formatDelete, formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const authenticationAuthenticationProviderTypeEnum = z.enum([
  "azure_active_directory",
  "eduframe",
  "openid_connect",
  "surf_conext",
]);

export function registerAuthenticationTools(server: McpServer): void {
  server.registerTool(
    "get_authentications_by_user_id",
    {
      description: "Get the authentications of an user",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        user_id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        provider: z
          .enum(["azure_active_directory", "eduframe", "openid_connect", "surf_conext"])
          .optional()
          .describe("Filter results on provider"),
      },
    },
    async ({ user_id, cursor, per_page, provider }) => {
      try {
        const result = await apiList<EduframeRecord>(`/users/${user_id}/authentications`, {
          cursor,
          per_page,
          provider,
        });
        void logResponse("get_authentications_by_user_id", { user_id, cursor, per_page, provider }, result);
        const toolResult = formatList(result.records, "authentications");
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
    "create_authentication",
    {
      description: "Create an authentication.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        uid: z.string().describe("Login identifier."),
        user_id: z.number().int().describe("Identifier of the associated User."),
        authentication_provider_type: authenticationAuthenticationProviderTypeEnum.describe(
          "Type of the associated AuthenticationProvider.",
        ),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/authentications", body);
        void logResponse("create_authentication", body, record);
        return formatCreate(record, "authentication");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_authentication_from_user",
    {
      description: "Remove an authentication from a user.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: {
        user_id: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the authentication to delete"),
      },
    },
    async ({ user_id, id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/users/${user_id}/authentications/${id}`);
        void logResponse("delete_authentication_from_user", { user_id, id }, record);
        return formatDelete(record, "authentication");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
