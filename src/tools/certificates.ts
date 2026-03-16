import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList } from "../api";
import { formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCertificateTools(server: McpServer): void {
  server.registerTool(
    "get_certificates",
    {
      description: "Get all awarded certificates",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/certificates", { cursor, per_page });
        void logResponse("get_certificates", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "certificates");
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
    "get_certificate",
    {
      description: "Get an awarded certificate",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the certificate to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/certificates/${id}`);
        void logResponse("get_certificate", { id }, record);
        return formatShow(record, "certificate");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
