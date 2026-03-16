import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiGet, apiList, apiPost } from "../api";
import { formatDelete, formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const paymentsCurrencyEnum = z.enum(["EUR", "ISK", "USD", "GBP"]);

export function registerPaymentTools(server: McpServer): void {
  server.registerTool(
    "get_invoice_payments_by_invoice_id",
    {
      description: "Get all payment records of an invoice",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        invoice_id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ invoice_id, cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>(`/invoices/${invoice_id}/payments`, { cursor, per_page });
        void logResponse("get_invoice_payments_by_invoice_id", { invoice_id, cursor, per_page }, result);
        const toolResult = formatList(result.records, "payments");
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
    "get_payment",
    {
      description: "Get one payment record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the payment to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/payments/${id}`);
        void logResponse("get_payment", { id }, record);
        return formatShow(record, "payment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_invoice_payment_by_id_and_invoice_id",
    {
      description: "Delete a payment.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: {
        invoice_id: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the payment to delete"),
      },
    },
    async ({ invoice_id, id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/invoices/${invoice_id}/payments/${id}`);
        void logResponse("delete_invoice_payment_by_id_and_invoice_id", { invoice_id, id }, record);
        return formatDelete(record, "payment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_invoice_payment_by_invoice_id",
    {
      description: "Create a payment.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        invoice_id: z.number().int().positive().describe("ID of the payment"),
        amount: z.string().describe("A number representing the total amount of the invoice."),
        currency: paymentsCurrencyEnum.optional().describe("The currency used for the payment."),
        date: z.string().optional().describe("Date on which the payment was created."),
        payment_method_id: z.number().int().optional().describe("Identifier of the payment method."),
      },
    },
    async ({ invoice_id, ...body }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/invoices/${invoice_id}/payments`, body);
        void logResponse("create_invoice_payment_by_invoice_id", { invoice_id, ...body }, record);
        return formatShow(record, "payment");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
