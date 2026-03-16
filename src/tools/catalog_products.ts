import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPatch } from "../api";
import { formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCatalogProductTools(server: McpServer): void {
  server.registerTool(
    "get_catalog_products",
    {
      description: "Get all catalog products",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        published: z.enum(["published"]).optional().describe("Show only published products"),
        category_id: z.number().int().optional().describe("Filter results on category_id"),
        productable_type: z
          .enum(["Course", "Program::Program"])
          .optional()
          .describe("Filter results on productable_type"),
        search: z.string().optional().describe("Filter results on search"),
        sort: z
          .array(z.enum(["id:asc", "id:desc", "position:asc", "position:desc"]))
          .optional()
          .describe(
            "Sort the results. Can change order by using `<sort_by>:<direction>` where `<direction>` is either `asc` or `desc`",
          ),
      },
    },
    async ({ cursor, per_page, published, category_id, productable_type, search, sort }) => {
      try {
        const result = await apiList<EduframeRecord>("/catalog/products", {
          cursor,
          per_page,
          published,
          category_id,
          productable_type,
          search,
          sort,
        });
        void logResponse(
          "get_catalog_products",
          { cursor, per_page, published, category_id, productable_type, search, sort },
          result,
        );
        const toolResult = formatList(result.records, "catalog products");
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
    "get_catalog_product",
    {
      description: "Get a catalog product record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the catalog product to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/catalog/products/${id}`);
        void logResponse("get_catalog_product", { id }, record);
        return formatShow(record, "catalog product");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_catalog_product",
    {
      description: "Update a catalog product",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the catalog product to update"),
        category_id: z.number().int().optional().describe("Identifier of the category of the course."),
        is_published: z.boolean().optional().describe("Boolean showing if the product is published or not."),
        custom: z.object({}).optional().describe("The custom properties of the product."),
        course_tab_contents_attributes: z
          .array(
            z.object({
              id: z.number().int().describe("Unique identifier of the course tab content."),
              content: z.string().describe("The HTML content of the course tab."),
              course_tab_id: z.number().int().describe("Unique identifier of the course tab."),
            }),
          )
          .optional(),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/catalog/products/${id}`, body);
        void logResponse("update_catalog_product", { id, ...body }, record);
        return formatUpdate(record, "catalog product");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
