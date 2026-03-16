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

const leadStatusEnum = z.enum(["prospect", "waiting_list", "won", "lost", "archive"]);

export function registerLeadTools(server: McpServer): void {
  server.registerTool(
    "get_leads",
    {
      description: "Get all lead records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        email: z.string().optional().describe("Filter leads by exact email match"),
      },
    },
    async ({ cursor, per_page, email }) => {
      try {
        const result = await apiList<EduframeRecord>("/leads", { cursor, per_page, email });
        void logResponse("get_leads", { cursor, per_page, email }, result);
        const toolResult = formatList(result.records, "leads");
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
    "get_lead",
    {
      description: "Get one lead record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the lead to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/leads/${id}`);
        void logResponse("get_lead", { id }, record);
        return formatShow(record, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_lead",
    {
      description: "Create a lead.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        title: z.string().optional().describe("Title of the lead"),
        account_id: z.number().int().optional().describe("ID of the account linked to this lead"),
        user_id: z.number().int().optional().describe("ID of the user linked to this lead"),
        value: z.string().optional().describe("Decimal representing the price of a lead"),
        company_name: z.string().optional().describe("Name of the company where this lead comes from"),
        first_name: z.string().optional().describe("The first name of the lead"),
        middle_name: z.string().optional().describe("The middle name of the lead"),
        last_name: z.string().optional().describe("The last name of the lead"),
        administrator_id: z.number().int().optional().describe("ID of administrator that owns the lead"),
        email: z.string().optional().describe("The email of the lead"),
        phone: z
          .string()
          .optional()
          .describe(
            "The phone number of the lead\n**Note** : Use an international phone format unless the phone number is\nfrom the educator configured country.\n",
          ),
        status: leadStatusEnum.optional().describe("The status of the lead"),
        quality: z.number().optional().describe("Star scoring for the lead"),
        wants_newsletter: z.boolean().optional().describe("Indicates if lead wants to receive the newsletter or not"),
        comment: z.string().optional().describe("Comment for a lead"),
        label_ids: z.array(z.number().int()).optional().describe("IDs of the labels"),
        address_attributes: z
          .object({
            addressee: z.string().optional().describe("The addressee of the address."),
            address: z.string().describe("Concatenation of the street and house number."),
            address_line2: z.string().optional().describe("A string representing the second line of the address."),
            postal_code: z.string().describe("A string representing the postal code."),
            city: z.string().describe("A string representing the city."),
            state_province: z.string().optional().describe("An letter USA state code."),
            country: z.string().describe("An ISO3166 two-letter country code."),
          })
          .optional(),
        lead_products: z
          .array(
            z.object({
              catalog_product_id: z.number().int().describe("ID of the catalog product"),
              catalog_variant_id: z.number().int().optional().describe("ID of the catalog variant"),
            }),
          )
          .optional()
          .describe("Array of products and variants the lead is interested in.\n"),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/leads", body);
        void logResponse("create_lead", body, record);
        return formatCreate(record, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_lead",
    {
      description: "Update a lead",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead to update"),
        status: leadStatusEnum.describe("The status of the lead"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/leads/${id}`, body);
        void logResponse("update_lead", { id, ...body }, record);
        return formatUpdate(record, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_lead",
    {
      description: "Delete a lead.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the lead to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/leads/${id}`);
        void logResponse("delete_lead", { id }, record);
        return formatDelete(record, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
