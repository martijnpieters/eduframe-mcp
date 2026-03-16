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

const taskSubjectTypeEnum = z.enum([
  "Course",
  "Account",
  "User",
  "Lead",
  "Invoice",
  "PlannedCourse",
  "Order",
  "Program::Program",
  "Program::Edition",
]);

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    "get_tasks",
    {
      description: "Get all task records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
      },
    },
    async ({ cursor, per_page }) => {
      try {
        const result = await apiList<EduframeRecord>("/tasks", { cursor, per_page });
        void logResponse("get_tasks", { cursor, per_page }, result);
        const toolResult = formatList(result.records, "tasks");
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
    "get_task",
    {
      description: "Get a task record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the task to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/tasks/${id}`);
        void logResponse("get_task", { id }, record);
        return formatShow(record, "task");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a task.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        name: z.string().describe("The title of the task."),
        description: z.string().optional().describe("A string representing the description of the task."),
        due_date: z.string().optional().describe("Date when the task must be completed."),
        starred: z.boolean().optional().describe("Boolean if the task is starred."),
        assignee_id: z.number().int().optional().describe("Unique identifier of the assigned user for the task."),
        subject_type: taskSubjectTypeEnum.optional().describe("Type of the subject."),
        subject_id: z.number().int().optional().describe("Identifier of the subject."),
        completed: z
          .boolean()
          .optional()
          .describe("Boolean representing the status of the task. The default value is false."),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/tasks", body);
        void logResponse("create_task", body, record);
        return formatCreate(record, "task");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the task to update"),
        name: z.string().optional().describe("The title of the task."),
        description: z.string().optional().describe("A string representing the description of the task."),
        due_date: z.string().optional().describe("Date when the task must be completed."),
        starred: z.boolean().optional().describe("Boolean if the task is starred."),
        assignee_id: z.number().int().optional().describe("Unique identifier of the assigned user for the task."),
        subject_type: taskSubjectTypeEnum.optional().describe("Type of the subject."),
        subject_id: z.number().int().optional().describe("Identifier of the subject."),
        completed: z
          .boolean()
          .optional()
          .describe("Boolean representing the status of the task. The default value is false."),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/tasks/${id}`, body);
        void logResponse("update_task", { id, ...body }, record);
        return formatUpdate(record, "task");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the task to delete") },
    },
    async ({ id }) => {
      try {
        const record = await apiDelete<EduframeRecord>(`/tasks/${id}`);
        void logResponse("delete_task", { id }, record);
        return formatDelete(record, "task");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
