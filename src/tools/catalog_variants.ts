import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPatch } from "../api";
import { formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerCatalogVariantTools(server: McpServer): void {
  server.registerTool(
    "get_catalog_variants",
    {
      description: "Get all catalog variants",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        published_public: z
          .enum(["published_public"])
          .optional()
          .describe("Only show published variants and planned_courses that are either planned or in progress"),
        product_id: z.number().int().optional().describe("Filter results on product_id"),
        variantable_id: z.number().int().optional().describe("Filter results on variantable_id"),
        variantable_type: z
          .enum(["planned_course", "program_edition"])
          .optional()
          .describe("Filter results on variantable_type"),
      },
    },
    async ({ cursor, per_page, published_public, product_id, variantable_id, variantable_type }) => {
      try {
        const result = await apiList<EduframeRecord>("/catalog/variants", {
          cursor,
          per_page,
          published_public,
          product_id,
          variantable_id,
          variantable_type,
        });
        void logResponse(
          "get_catalog_variants",
          { cursor, per_page, published_public, product_id, variantable_id, variantable_type },
          result,
        );
        const toolResult = formatList(result.records, "catalog variants");
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
    "get_catalog_variant",
    {
      description: "Get a catalog variant record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the catalog variant to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/catalog/variants/${id}`);
        void logResponse("get_catalog_variant", { id }, record);
        return formatShow(record, "catalog variant");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_catalog_variant",
    {
      description: "Update a catalog variant",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the catalog variant to update"),
        is_published: z.boolean().optional().describe("Boolean showing if the variant is published or not."),
        edition_description_section_contents_attributes: z
          .array(
            z.object({
              content: z.string().describe("The content of the edition description section."),
              edition_description_section_id: z
                .number()
                .int()
                .describe("Identifier of the edition description section."),
            }),
          )
          .optional()
          .describe(
            "Array of edition description section contents to update.\n\n![ Edition description sections ](https://img.shields.io/badge/Feature-Edition_description_sections-1d8127)\n![Beta](https://img.shields.io/badge/Beta-7d15a3)\n",
          ),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/catalog/variants/${id}`, body);
        void logResponse("update_catalog_variant", { id, ...body }, record);
        return formatUpdate(record, "catalog variant");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
