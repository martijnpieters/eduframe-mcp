import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPatch, apiPost } from "../api";
import { formatCreate, formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCategorieTools(server: McpServer): void {
  server.registerTool(
    "get_categories",
    {
      description: "Get all category records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        published: z.enum(["published"]).optional().describe("Show only published categories"),
        sort: z
          .array(z.enum(["position:asc", "position:desc"]))
          .optional()
          .describe(
            "Sort the results. Can change order by using `<sort_by>:<direction>` where `<direction>` is either `asc` or `desc`",
          ),
      },
    },
    async ({ cursor, per_page, published, sort }) => {
      try {
        const result = await apiList<EduframeRecord>("/categories", { cursor, per_page, published, sort });
        void logResponse("get_categories", { cursor, per_page, published, sort }, result);
        const toolResult = formatList(result.records, "categories");
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
    "get_category",
    {
      description: "Get a category record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the categorie to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/categories/${id}`);
        void logResponse("get_category", { id }, record);
        return formatShow(record, "categorie");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_category",
    {
      description: "Create a category.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        name: z.string().describe("Title of the category."),
        description: z.string().optional().describe("The description of the category."),
        is_published: z.boolean().optional().describe("Boolean if the category is published on the website."),
        parent_id: z.number().int().optional().describe("Unique identifier of the parent category"),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/categories", body);
        void logResponse("create_category", body, record);
        return formatCreate(record, "categorie");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_category",
    {
      description: "Update a category.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the categorie to update"),
        name: z.string().optional().describe("Title of the category."),
        slug: z.string().optional().describe("Friendly identifier of a category."),
        description: z.string().optional().describe("The description of the category."),
        is_published: z.boolean().optional().describe("Boolean if the category is published on the website."),
        parent_id: z.number().int().optional().describe("Unique identifier of the parent category"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/categories/${id}`, body);
        void logResponse("update_category", { id, ...body }, record);
        return formatUpdate(record, "categorie");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
