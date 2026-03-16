import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPatch, apiPost, apiPut } from "../api";
import { formatCreate, formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const plannedCourseTypeEnum = z.enum(["FixedPlannedCourse", "FlexiblePlannedCourse"]);
const plannedCourseCostSchemeEnum = z.enum(["student", "order", "tbd", "free"]);

export function registerPlannedCourseTools(server: McpServer): void {
  server.registerTool(
    "get_planned_courses_by_course_id",
    {
      description: "Get all planned course records of a single course",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        course_id: z.number().int().positive().describe("ID of the parent resource"),
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        search: z.string().optional().describe("Filter results on search"),
        type: z.enum(["FixedPlannedCourse", "FlexiblePlannedCourse"]).optional().describe("Filter results on type"),
        parents_published: z.enum(["parents_published"]).optional().describe("Filter results on parents_published"),
        published_public: z
          .enum(["published_public"])
          .optional()
          .describe("Only show courses that are published and are either planned or in progress"),
        start_date_from: z.string().optional().describe("Filter results on start_date_from"),
        start_date_until: z.string().optional().describe("Filter results on start_date_until"),
        availability_state: z.enum(["open", "closed"]).optional().describe("Filter results on availability_state"),
        status: z.enum(["planned", "active", "completed", "canceled"]).optional().describe("Filter results on status"),
        sort: z
          .array(z.enum(["start_date:asc", "start_date:desc"]))
          .optional()
          .describe(
            "Sort the results. Can change order by using `<sort_by>:<direction>` where `<direction>` is either `asc` or `desc`",
          ),
      },
    },
    async ({
      course_id,
      cursor,
      per_page,
      search,
      type,
      parents_published,
      published_public,
      start_date_from,
      start_date_until,
      availability_state,
      status,
      sort,
    }) => {
      try {
        const result = await apiList<EduframeRecord>(`/courses/${course_id}/planned_courses`, {
          cursor,
          per_page,
          search,
          type,
          parents_published,
          published_public,
          start_date_from,
          start_date_until,
          availability_state,
          status,
          sort,
        });
        void logResponse(
          "get_planned_courses_by_course_id",
          {
            course_id,
            cursor,
            per_page,
            search,
            type,
            parents_published,
            published_public,
            start_date_from,
            start_date_until,
            availability_state,
            status,
            sort,
          },
          result,
        );
        const toolResult = formatList(result.records, "planned courses");
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
    "get_planned_courses_by_id_and_course_id",
    {
      description: "Get a planned course record of a single course",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        course_id: z.number().int().positive().describe("ID of the parent resource"),
        id: z.number().int().positive().describe("ID of the planned course to retrieve"),
      },
    },
    async ({ course_id, id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/courses/${course_id}/planned_courses/${id}`);
        void logResponse("get_planned_courses_by_id_and_course_id", { course_id, id }, record);
        return formatShow(record, "planned course");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_planned_course",
    {
      description: "Create a planned course.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        is_published: z.boolean().optional().describe("Boolean if is published on the website."),
        course_id: z.number().int().describe("Unique identifier of the course."),
        type: plannedCourseTypeEnum.describe("The type of the course."),
        start_date: z
          .string()
          .optional()
          .describe("Date at which the planned course starts. Only needed for fixed planned courses."),
        end_date: z
          .string()
          .optional()
          .describe("Date at which the planned course ends. Only needed for fixed planned courses."),
        min_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the minimum number of participants that can enroll for the planned course."),
        max_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the maximum number of participants that can enroll for the planned course."),
        cost_scheme: plannedCourseCostSchemeEnum
          .optional()
          .describe("The cost schema that the payment will follow for the specified course."),
        cost: z
          .number()
          .describe(
            "The price to be paid for this planned course. Required if cost_scheme is student (default value) or order.",
          ),
        course_variant_id: z.number().int().optional().describe("Unique identifier of the course variant."),
        course_location_id: z.number().int().optional().describe("Unique identifier of the course location."),
        duration: z
          .number()
          .optional()
          .describe("The period of time of the planned course in days. Only needed for flexible planned courses."),
        teacher_ids: z.array(z.number().int()).optional().describe("The ids of the teachers in the course"),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/planned_courses", body);
        void logResponse("create_planned_course", body, record);
        return formatCreate(record, "planned course");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_planned_course",
    {
      description: "Update a planned course.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the planned course to update"),
        is_published: z.boolean().optional().describe("Boolean if is published on the website."),
        course_id: z.number().int().optional().describe("Unique identifier of the course."),
        start_date: z
          .string()
          .optional()
          .describe("Date at which the planned course starts. Only needed for fixed planned courses."),
        end_date: z
          .string()
          .optional()
          .describe("Date at which the planned course ends. Only needed for fixed planned courses."),
        min_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the minimum number of participants that can enroll for the planned course."),
        max_participants: z
          .number()
          .int()
          .optional()
          .describe("A number representing the maximum number of participants that can enroll for the planned course."),
        cost_scheme: plannedCourseCostSchemeEnum
          .optional()
          .describe("The cost schema that the payment will follow for the specified course."),
        cost: z.number().optional().describe("A positive float representing the price of the planned course."),
        course_variant_id: z.number().int().optional().describe("Unique identifier of the course variant."),
        course_location_id: z.number().int().optional().describe("Unique identifier of the course location."),
        duration: z
          .number()
          .optional()
          .describe("The period of time of the planned course. Only needed for flexible planned courses."),
        teacher_ids: z.array(z.string()).optional().describe("The ids of the teachers in the course"),
        custom: z.record(z.unknown()).optional(),
        custom_associations: z.record(z.unknown()).optional(),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/planned_courses/${id}`, body);
        void logResponse("update_planned_course", { id, ...body }, record);
        return formatUpdate(record, "planned course");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "cancel_planned_course",
    {
      description: "Cancel a planned course.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the planned course") },
    },
    async ({ id }) => {
      try {
        const record = await apiPut<EduframeRecord>(`/planned_courses/${id}/cancel`, {});
        void logResponse("cancel_planned_course", { id }, record);
        return formatShow(record, "planned course");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
