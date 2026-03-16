import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiList, apiPost } from "../api";
import { formatCreate, formatError, formatList, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerInvoiceVatTools(server: McpServer): void {
  server.registerTool(
    "get_invoice_vats",
    {
      description: "Get all invoice vat records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/invoice_vats", { cursor, per_page });
        void logResponse("get_invoice_vats", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "invoice vats");
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
    "create_invoice_vat",
    {
      description: "Create an invoice vat.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        name: z.string().describe("Name of the invoice vat."),
        percentage: z.string().describe("Number representing the VAT percentage."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/invoice_vats", body);
        void logResponse("create_invoice_vat", body, record);
        return formatCreate(record, "invoice vat");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
