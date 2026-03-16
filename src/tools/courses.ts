import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPatch, apiPost } from "../api";
import { formatCreate, formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const courseCostSchemeEnum = z.enum(["student", "order", "tbd", "free"]);

export function registerCourseTools(server: McpServer): void {
  server.registerTool(
    "get_courses",
    {
      description: "Get all course records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        published: z.enum(["published"]).optional().describe("Show only published courses"),
      },
    },
    async ({ cursor, per_page, published }) => {
      try {
        const result = await apiList<EduframeRecord>("/courses", { cursor, per_page, published });
        void logResponse("get_courses", { cursor, per_page, published }, result);
        const toolResult = formatList(result.records, "courses");
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
    "get_course",
    {
      description: "Get a course record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the course to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/courses/${id}`);
        void logResponse("get_course", { id }, record);
        return formatShow(record, "course");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_course",
    {
      description: "Create a course.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        category_id: z.number().int().describe("Identifier of the category of the course."),
        name: z.string().describe("The name of the course."),
        code: z.string().describe("The code of the course."),
        cost_scheme: courseCostSchemeEnum.optional().describe("How should the course be paid by default."),
        cost: z
          .string()
          .optional()
          .describe(
            "The price to be paid for this course. Required if cost_scheme is student (default value) or order.",
          ),
        is_published: z.boolean().optional().describe("Boolean representing the publishable status of the course."),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
        course_tab_contents_attributes: z
          .array(
            z.object({
              content: z.string().describe("The HTML content of the course tab."),
              course_tab_id: z.number().int().describe("Unique identifier of the course tab."),
            }),
          )
          .optional(),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/courses", body);
        void logResponse("create_course", body, record);
        return formatCreate(record, "course");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_course",
    {
      description: "Update a course.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the course to update"),
        category_id: z.number().int().optional().describe("Identifier of the category of the course."),
        name: z.string().optional().describe("The name of the course."),
        code: z.string().optional().describe("The code of the course."),
        duration: z.string().optional().describe("The duration of the course."),
        level: z.string().optional().describe("A string indicating the level of the course."),
        result: z.string().optional().describe("The result of the course"),
        cost: z.string().optional().describe("The price to be paid for this course."),
        cost_scheme: courseCostSchemeEnum.optional().describe("How should the course be paid by default."),
        is_published: z.boolean().optional().describe("Boolean representing the publishable status of the course."),
        conditions: z.string().optional().describe("The conditions of the course."),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
        course_tab_contents_attributes: z
          .array(
            z.object({
              content: z.string().optional().describe("The HTML content of the course tab."),
              course_tab_id: z.number().int().optional().describe("Unique identifier of the course tab."),
            }),
          )
          .optional(),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/courses/${id}`, body);
        void logResponse("update_course", { id, ...body }, record);
        return formatUpdate(record, "course");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
