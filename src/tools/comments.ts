import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiDelete, apiPatch, apiPost } from "../api";
import { formatCreate, formatDelete, formatError, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const commentCommentableTypeEnum = z.enum([
  "Account",
  "Invoice",
  "Lead",
  "Order",
  "PlannedCourse",
  "Program::Editions::Edition",
  "Task",
  "User",
]);

export function registerCommentTools(server: McpServer): void {
  server.registerTool(
    "create_comment",
    {
      description: "Create a comment.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        content: z.string().describe("A string representing the content of a comment."),
        commentable_id: z.number().int().describe("Identifier of the subject the comment is linked to."),
        commentable_type: commentCommentableTypeEnum,
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/comments", body);
        void logResponse("create_comment", body, record);
        return formatCreate(record, "comment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_comment",
    {
      description: "Update a comment.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the comment to update"),
        content: z.string().optional().describe("A string representing the content of a comment."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/comments/${id}`, body);
        void logResponse("update_comment", { id, ...body }, record);
        return formatUpdate(record, "comment");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_comment",
    {
      description: "Delete a comment.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the comment to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/comments/${id}`);
        void logResponse("delete_comment", { id }, record);
        return formatDelete(record, "comment");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
