import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList } from "../api";
import { formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerSignupQuestionTools(server: McpServer): void {
  server.registerTool(
    "get_signup_questions",
    {
      description: "Get all signup_question records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        for_user: z.enum(["for_user"]).optional().describe("Filter results on for_user"),
        for_account: z.enum(["for_account"]).optional().describe("Filter results on for_account"),
        for_type: z
          .enum(["user", "teacher", "account", "catalog_product", "order", "catalog_variant"])
          .optional()
          .describe("Filter results on for_type"),
        visibility: z.string().optional().describe("Filter results on visibility"),
        use_as_duplicate_indicator: z.boolean().optional().describe("Filter results on use_as_duplicate_indicator"),
      },
    },
    async ({ cursor, per_page, for_user, for_account, for_type, visibility, use_as_duplicate_indicator }) => {
      try {
        const result = await apiList<EduframeRecord>("/signup_questions", {
          cursor,
          per_page,
          for_user,
          for_account,
          for_type,
          visibility,
          use_as_duplicate_indicator,
        });
        void logResponse(
          "get_signup_questions",
          { cursor, per_page, for_user, for_account, for_type, visibility, use_as_duplicate_indicator },
          result,
        );
        const toolResult = formatList(result.records, "signup questions");
        if (result.nextCursor) {
          toolResult.content.push({ type: "text", text: `\nNext page cursor: ${result.nextCursor}` });
        }
        return toolResult;
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
