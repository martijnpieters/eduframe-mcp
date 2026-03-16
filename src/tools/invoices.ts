import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPost } from "../api";
import { formatCreate, formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerInvoiceTools(server: McpServer): void {
  server.registerTool(
    "get_invoice_pdf",
    {
      description: "Get the base64 encoded version of the invoice PDF",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ id, cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>(`/invoices/${id}/pdf`, { cursor, per_page });
        void logResponse("get_invoice_pdf", { id, cursor, per_page }, result);
        const toolResult = formatList(result.records, "invoices");
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
    "get_invoice",
    {
      description: "Get an invoice record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the invoice to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/invoices/${id}`);
        void logResponse("get_invoice", { id }, record);
        return formatShow(record, "invoice");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_invoice",
    {
      description: "Create an invoice.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        account_id: z.number().int().describe("Identifier of the account."),
        feature: z.string().optional().describe("Some description of the invoice which is displayed on the invoice."),
        footnote: z.string().optional().describe("The note displayed at the bottom of the invoice."),
        invoice_items_attributes: z
          .array(
            z.object({
              catalog_variant_id: z.number().int().optional().describe("Unique identifier of the catalog variant."),
              units: z.number().describe("Integer representing the number of units of the invoice item."),
              unit_price: z.string().describe("Decimal representing the price of an unit."),
              name: z.string().describe("The name of the invoice item."),
              invoice_vat_id: z.number().int().optional().describe("Identifier of the invoice vat."),
              _destroy: z.boolean().optional().describe("Set if you want to delete this item."),
            }),
          )
          .optional(),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/invoices", body);
        void logResponse("create_invoice", body, record);
        return formatCreate(record, "invoice");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "open_invoice",
    {
      description:
        "Changes the state from concept to open.\nThis will assign the actual invoice number so it's ready for sending.\nIf the current state is not concept, this endpoint does nothing.\n",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the invoice") },
    },
    async ({ id }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/invoices/${id}/open`, {});
        void logResponse("open_invoice", { id }, record);
        return formatShow(record, "invoice");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
