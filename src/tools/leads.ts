import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { apiList, apiGet, apiPost, apiPatch, apiDelete } from "../api.js";
import {
  formatList,
  formatShow,
  formatCreate,
  formatUpdate,
  formatDelete,
  type EduframeRecord,
} from "../formatters.js";

function formatError(error: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}

const leadStatusEnum = z.enum(["prospect", "waiting_list", "won", "lost", "archive"]);

/**
 * Shared writable lead fields used by create_lead.
 */
const leadCreateFields = {
  title: z.string().optional().describe("Title of the lead"),
  first_name: z.string().optional().describe("The first name of the lead"),
  middle_name: z.string().optional().describe("The middle name of the lead"),
  last_name: z.string().optional().describe("The last name of the lead"),
  email: z.string().optional().describe("The email address of the lead"),
  phone: z.string().optional().describe("The phone number of the lead"),
  company_name: z.string().optional().describe("Name of the company the lead comes from"),
  status: leadStatusEnum.optional().describe("The status of the lead"),
  quality: z.number().optional().describe("Star scoring for the lead"),
  value: z.string().optional().describe("Decimal representing the monetary value of the lead"),
  wants_newsletter: z.boolean().optional().describe("Whether the lead wants to receive the newsletter"),
  comment: z.string().optional().describe("Comment for a lead"),
  administrator_id: z.number().int().positive().optional().describe("ID of the administrator that owns the lead"),
  account_id: z.number().int().positive().optional().describe("ID of the account linked to this lead"),
  user_id: z.number().int().positive().optional().describe("ID of the user linked to this lead"),
  label_ids: z.array(z.number().int()).optional().describe("IDs of the labels to assign to this lead"),
  lead_products: z
    .array(
      z.object({
        catalog_product_id: z.number().int().describe("ID of the catalog product"),
        catalog_variant_id: z.number().int().optional().describe("ID of the catalog variant"),
      }),
    )
    .optional()
    .describe("Array of products and variants the lead is interested in"),
  address_attributes: z
    .object({
      addressee: z.string().optional().describe("The addressee of the address"),
      address: z.string().describe("Concatenation of the street and house number"),
      address_line2: z.string().optional().describe("Second line of the address"),
      postal_code: z.string().describe("The postal code"),
      city: z.string().describe("The city"),
      state_province: z.string().optional().describe("The state or province"),
      country: z.string().describe("The country"),
    })
    .optional()
    .describe("Address of the lead"),
};

/**
 * Register all lead-related MCP tools on the given server.
 */
export function registerLeadTools(server: McpServer): void {
  server.tool(
    "list_leads",
    "Get all lead records",
    {
      cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
      per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      email: z.string().optional().describe("Filter leads by exact email match"),
    },
    async ({ cursor, per_page, email }) => {
      try {
        const result = await apiList<EduframeRecord>("/leads", {
          cursor,
          per_page,
          email,
        });

        const toolResult = formatList(result.records, "leads");

        if (result.nextCursor) {
          toolResult.content.push({
            type: "text",
            text: `\nNext page cursor: ${result.nextCursor}`,
          });
        }

        return toolResult;
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "get_lead",
    "Get one lead record",
    {
      id: z.number().int().positive().describe("ID of the lead to retrieve"),
    },
    async ({ id }) => {
      try {
        const lead = await apiGet<EduframeRecord>(`/leads/${id}`);
        return formatShow(lead, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool("create_lead", "Create a lead", leadCreateFields, async (body) => {
    try {
      const lead = await apiPost<EduframeRecord>("/leads", body);
      return formatCreate(lead, "lead");
    } catch (error) {
      return formatError(error);
    }
  });

  server.tool(
    "update_lead",
    "Update a lead",
    {
      id: z.number().int().positive().describe("ID of the lead to update"),
      status: leadStatusEnum.describe("The status of the lead"),
    },
    async ({ id, ...body }) => {
      try {
        const lead = await apiPatch<EduframeRecord>(`/leads/${id}`, body);
        return formatUpdate(lead, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "delete_lead",
    "Delete a lead",
    {
      id: z.number().int().positive().describe("ID of the lead to delete"),
    },
    async ({ id }) => {
      try {
        const lead = await apiDelete<EduframeRecord>(`/leads/${id}`);
        return formatDelete(lead, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
