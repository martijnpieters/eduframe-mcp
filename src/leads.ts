import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { apiList, apiGet, apiPost, apiPut, apiDelete } from "./api.js";
import { formatList, formatShow, formatCreate, formatUpdate, formatDelete, type EduframeRecord } from "./formatters.js";

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

/**
 * Shared writable lead fields used by both create_lead and update_lead.
 */
const leadFields = {
  first_name: z.string().optional().describe("The first name of the lead"),
  middle_name: z.string().optional().describe("The middle name of the lead"),
  last_name: z.string().optional().describe("The last name of the lead"),
  email: z.string().optional().describe("The email address of the lead"),
  phone: z.string().optional().describe("The phone number of the lead"),
  company_name: z.string().optional().describe("Name of the company the lead comes from"),
  status: z.string().optional().describe("The status of the lead"),
  quality: z.string().optional().describe("Star scoring for the lead"),
  value: z.string().optional().describe("Decimal representing the monetary value of the lead"),
  wants_newsletter: z.boolean().optional().describe("Whether the lead wants to receive the newsletter"),
  administrator_id: z.number().int().positive().optional().describe("ID of the administrator that owns the lead"),
  account_id: z.number().int().positive().optional().describe("ID of the account linked to this lead"),
  user_id: z.number().int().positive().optional().describe("ID of the user linked to this lead"),
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
      sort: z
        .array(z.string())
        .optional()
        .describe("Sort results. Each value can be a field name or field:asc / field:desc"),
      include: z.array(z.string()).optional().describe("Relations to include in the response"),
      search: z.string().optional().describe("Filter results by a search string"),
      status: z.array(z.string()).optional().describe("Filter results by status"),
      course_id: z.array(z.string()).optional().describe("Filter results by course ID"),
      planned_course_id: z.array(z.string()).optional().describe("Filter results by planned course ID"),
      administrator_id: z.array(z.string()).optional().describe("Filter results by administrator ID"),
      label_id: z.array(z.string()).optional().describe("Filter results by label ID"),
      user_id: z.array(z.string()).optional().describe("Filter results by user ID"),
      account_id: z.array(z.string()).optional().describe("Filter results by account ID"),
    },
    async ({
      cursor,
      per_page,
      sort,
      include,
      search,
      status,
      course_id,
      planned_course_id,
      administrator_id,
      label_id,
      user_id,
      account_id,
    }) => {
      try {
        const result = await apiList<EduframeRecord>("/leads", {
          cursor,
          per_page,
          sort,
          include,
          search,
          status,
          course_id,
          planned_course_id,
          administrator_id,
          label_id,
          user_id,
          account_id,
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
      include: z.array(z.string()).optional().describe("Relations to include in the response"),
    },
    async ({ id, include }) => {
      try {
        const lead = await apiGet<EduframeRecord>(`/leads/${id}`, { include });
        return formatShow(lead, "lead");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool("create_lead", "Create a lead", leadFields, async (body) => {
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
      ...leadFields,
    },
    async ({ id, ...body }) => {
      try {
        const lead = await apiPut<EduframeRecord>(`/leads/${id}`, body);
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
