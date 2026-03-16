import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPost, apiPut } from "../api";
import { formatCreate, formatError, formatList, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const orderCostSchemeEnum = z.enum(["student", "order", "tbd", "free"]);

export function registerOrderTools(server: McpServer): void {
  server.registerTool(
    "get_orders",
    {
      description: "Get all order records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        creator_id: z.number().int().optional().describe("Filter results on creator_id"),
        created_at_after: z.string().optional().describe("Filter results on created_at_after"),
        catalog_variant_id: z.number().int().optional().describe("Filter results on catalog_variant_id"),
        sort: z
          .array(z.enum(["created_at:asc", "created_at:desc"]))
          .optional()
          .describe(
            "Sort the results. Can change order by using `<sort_by>:<direction>` where `<direction>` is either `asc` or `desc`",
          ),
      },
    },
    async ({ cursor, per_page, creator_id, created_at_after, catalog_variant_id, sort }) => {
      try {
        const result = await apiList<EduframeRecord>("/orders", {
          cursor,
          per_page,
          creator_id,
          created_at_after,
          catalog_variant_id,
          sort,
        });
        void logResponse(
          "get_orders",
          { cursor, per_page, creator_id, created_at_after, catalog_variant_id, sort },
          result,
        );
        const toolResult = formatList(result.records, "orders");
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
    "get_order",
    {
      description: "Get an order record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the order to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/orders/${id}`);
        void logResponse("get_order", { id }, record);
        return formatShow(record, "order");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_order",
    {
      description: "Create an order.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        cost: z.string().optional().describe("Decimal representing the value of the order"),
        cost_scheme: orderCostSchemeEnum
          .optional()
          .describe("The cost schema that the payment will follow for the specified order."),
        catalog_variant_id: z.number().int().describe("Unique identifier of the orders CatalogVariant."),
        creator_id: z.number().int().describe("Unique identifier of the orders Creator (User)."),
        account_id: z
          .number()
          .int()
          .optional()
          .describe(
            "The unique identifier associated with the orders Account. If not provided, the system will default to using the personal account.\n",
          ),
        planned_course_id: z
          .number()
          .int()
          .optional()
          .describe(
            "*DEPRECATED*: Use catalog_variant_id instead.\nUnique identifier of the order's planned course.\n",
          ),
        payment_method_id: z.number().int().optional().describe("Unique identifier of the orders PaymentMethod."),
        student_ids: z
          .array(z.number().int())
          .optional()
          .describe(
            "Array of student ids. A non-empty array is required if there are no student ids specified in the enrollments_attributes.",
          ),
        payment_option_id: z.number().int().optional().describe("Unique identifier of the orders PaymentOption."),
        custom: z.object({}).optional().describe("The custom properties of the order."),
        approve: z
          .boolean()
          .optional()
          .describe("Optional: If the order should be approved or not. When omitted will default to false"),
        label_ids: z.array(z.number().int()).optional().describe("Optional: Assign labels to the order."),
        referral_id: z.number().int().optional().describe("Optional: Identifier of the referral."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/orders", body);
        void logResponse("create_order", body, record);
        return formatCreate(record, "order");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "deny_order",
    {
      description: "Deny an order",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the order") },
    },
    async ({ id }) => {
      try {
        const record = await apiPut<EduframeRecord>(`/orders/${id}/deny`, {});
        void logResponse("deny_order", { id }, record);
        return formatShow(record, "order");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "cancel_order",
    {
      description: "Cancel an order",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the order") },
    },
    async ({ id }) => {
      try {
        const record = await apiPut<EduframeRecord>(`/orders/${id}/cancel`, {});
        void logResponse("cancel_order", { id }, record);
        return formatShow(record, "order");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "approve_order",
    {
      description: "Approve an order",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the order") },
    },
    async ({ id }) => {
      try {
        const record = await apiPut<EduframeRecord>(`/orders/${id}/approve`, {});
        void logResponse("approve_order", { id }, record);
        return formatShow(record, "order");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
