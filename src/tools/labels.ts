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

const labelModelTypeEnum = z.enum(["Lead", "Order", "Catalog::Product", "User", "Account", "Teacher"]);

export function registerLabelTools(server: McpServer): void {
  server.registerTool(
    "get_labels",
    {
      description: "Get all labels",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        model_type: z
          .enum(["Account", "Catalog::Product", "Lead", "Order", "Program::Enrollment", "Task", "Teacher", "User"])
          .optional()
          .describe("Filter results on model_type"),
        search: z.string().optional().describe("Filter results on search"),
        id: z.array(z.number().int()).optional().describe("Filter results on id"),
      },
    },
    async ({ cursor, per_page, model_type, search, id }) => {
      try {
        const result = await apiList<EduframeRecord>("/labels", { cursor, per_page, model_type, search, id });
        void logResponse("get_labels", { cursor, per_page, model_type, search, id }, result);
        const toolResult = formatList(result.records, "labels");
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
    "get_label",
    {
      description: "Get a label",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the label to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/labels/${id}`);
        void logResponse("get_label", { id }, record);
        return formatShow(record, "label");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_label",
    {
      description: "Create a label",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        name: z.string().describe("The name of the label"),
        color: z.string().optional().describe("Hex code of the color of the label"),
        model_type: labelModelTypeEnum.describe("The model type for which this label is made available"),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/labels", body);
        void logResponse("create_label", body, record);
        return formatCreate(record, "label");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_label",
    {
      description: "Update a label",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the label to update"),
        name: z.string().optional().describe("The name of the label"),
        color: z.string().optional().describe("Hex code of the color of the label"),
        model_type: labelModelTypeEnum.optional().describe("The model type for which this label is made available"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/labels/${id}`, body);
        void logResponse("update_label", { id, ...body }, record);
        return formatUpdate(record, "label");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_label",
    {
      description: "Delete a label",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the label to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/labels/${id}`);
        void logResponse("delete_label", { id }, record);
        return formatDelete(record, "label");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "add_label_to_order",
    {
      description: "Add label to an order",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the label"),
        label_id: z.number().int().describe("Unique identifier of the label."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/orders/${id}/labels`, body);
        void logResponse("add_label_to_order", { id, ...body }, record);
        return formatShow(record, "label");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
