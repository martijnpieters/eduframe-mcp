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

export function registerWebhookTools(server: McpServer): void {
  server.registerTool(
    "get_webhooks",
    {
      description: "Get all registered webhooks",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/webhooks", { cursor, per_page });
        void logResponse("get_webhooks", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "webhooks");
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
    "get_webhook",
    {
      description: "Get a registered webhook",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the webhook to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/webhooks/${id}`);
        void logResponse("get_webhook", { id }, record);
        return formatShow(record, "webhook");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_webhook",
    {
      description: "Register a webhook.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        url: z.string().describe("The callback url for Eduframe to send a HTTP POST payload to."),
        active: z.boolean().optional().describe("State of webhook."),
        events: z.array(z.string()).optional().describe("Array of events."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/webhooks", body);
        void logResponse("create_webhook", body, record);
        return formatCreate(record, "webhook");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_webhook",
    {
      description: "Update a webhook.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the webhook to update"),
        url: z.string().optional().describe("The callback url for Eduframe to send a HTTP POST payload to."),
        active: z.boolean().optional().describe("State of webhook."),
        events: z.array(z.string()).optional().describe("Array of events."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/webhooks/${id}`, body);
        void logResponse("update_webhook", { id, ...body }, record);
        return formatUpdate(record, "webhook");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_webhook",
    {
      description: "Delete a webhook.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the webhook to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/webhooks/${id}`);
        void logResponse("delete_webhook", { id }, record);
        return formatDelete(record, "webhook");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
