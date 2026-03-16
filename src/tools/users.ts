import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiList, apiPatch, apiPost } from "../api";
import { formatCreate, formatError, formatList, formatShow, formatUpdate, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

const userLocaleEnum = z.enum(["de", "en", "en-GB", "en-US", "es", "is", "nl"]);

export function registerUserTools(server: McpServer): void {
  server.registerTool(
    "get_users",
    {
      description: "Get all user records",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cursor: z.string().optional().describe("Cursor for fetching the next page of results"),
        per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)"),
        role: z.string().optional().describe("Filter results on role"),
        email: z.string().optional().describe("Filter results on email"),
        label_id: z.array(z.string()).optional().describe("Filter results on label_id"),
        sort: z
          .array(z.enum(["created_at:asc", "created_at:desc"]))
          .optional()
          .describe(
            "Sort the results. Can change order by using `<sort_by>:<direction>` where `<direction>` is either `asc` or `desc`",
          ),
      },
    },
    async ({ cursor, per_page, role, email, label_id, sort }) => {
      try {
        const result = await apiList<EduframeRecord>("/users", { cursor, per_page, role, email, label_id, sort });
        void logResponse("get_users", { cursor, per_page, role, email, label_id, sort }, result);
        const toolResult = formatList(result.records, "users");
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
    "get_user",
    {
      description: "Get an user record",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { id: z.number().int().positive().describe("ID of the user to retrieve") },
    },
    async ({ id }) => {
      try {
        const record = await apiGet<EduframeRecord>(`/users/${id}`);
        void logResponse("get_user", { id }, record);
        return formatShow(record, "user");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "create_user",
    {
      description: "Create a user.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        first_name: z.string().describe("First name of the user."),
        middle_name: z.string().optional().describe("Middle name of the user."),
        last_name: z.string().describe("Last name of the user."),
        email: z.string().describe("The e-mail of the user."),
        locale: userLocaleEnum.optional(),
        wants_newsletter: z
          .boolean()
          .optional()
          .describe("Boolean representing the possibility of the user to receive newsletters."),
        with_authentication: z
          .boolean()
          .optional()
          .describe(
            "If the user should be able to login and thus receive login details by mail. Only relevant when creating the user.",
          ),
        custom: z.object({}).optional().describe("The custom properties of the user."),
        address_attributes: z
          .object({
            addressee: z.string().optional().describe("The addressee of the address."),
            address: z.string().describe("Concatenation of the street and house number."),
            address_line2: z.string().optional().describe("A string representing the second line of the address."),
            postal_code: z.string().describe("A string representing the postal code."),
            city: z.string().describe("A string representing the city."),
            state_province: z.string().optional().describe("An letter USA state code."),
            country: z.string().describe("An ISO3166 two-letter country code."),
          })
          .optional(),
        invoice_address_attributes: z
          .object({
            addressee: z.string().optional().describe("The addressee of the address."),
            address: z.string().describe("Concatenation of the street and house number."),
            address_line2: z.string().optional().describe("A string representing the second line of the address."),
            postal_code: z.string().describe("A string representing the postal code."),
            city: z.string().describe("A string representing the city."),
            state_province: z.string().optional().describe("An letter USA state code."),
            country: z.string().describe("An ISO3166 two-letter country code."),
          })
          .optional(),
        label_ids: z
          .array(z.number().int())
          .optional()
          .describe(
            "An array containing the identifiers of the labels associated with the user. When updating this array, the existing labels are replaced with the new ones provided.\n",
          ),
      },
    },
    async (body) => {
      try {
        const record = await apiPost<EduframeRecord>("/users", body);
        void logResponse("create_user", body, record);
        return formatCreate(record, "user");
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.registerTool(
    "update_user",
    {
      description: "Update a user.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        id: z.number().int().positive().describe("ID of the user to update"),
        first_name: z.string().optional().describe("First name of the user."),
        middle_name: z.string().optional().describe("Middle name of the user."),
        last_name: z.string().optional().describe("Last name of the user."),
        email: z
          .string()
          .optional()
          .describe("The e-mail of the user. For admin users this field is ignored due to security concerns."),
        locale: userLocaleEnum.optional(),
        wants_newsletter: z
          .boolean()
          .optional()
          .describe("Boolean representing the possibility of the user to receive newsletters."),
        with_authentication: z
          .boolean()
          .optional()
          .describe(
            "If the user should be able to login and thus receive login details by mail. Only relevant when creating the user.",
          ),
        custom: z.object({}).optional().describe("The custom properties of the user."),
        address_attributes: z
          .object({
            addressee: z.string().optional().describe("The addressee of the address."),
            address: z.string().optional().describe("Concatenation of the street and house number."),
            address_line2: z.string().optional().describe("A string representing the second line of the address."),
            postal_code: z.string().optional().describe("A string representing the postal code."),
            city: z.string().optional().describe("A string representing the city."),
            state_province: z.string().optional().describe("An letter USA state code."),
            country: z.string().optional().describe("An ISO3166 two-letter country code."),
          })
          .optional(),
        invoice_address_attributes: z
          .object({
            addressee: z.string().optional().describe("The addressee of the address."),
            address: z.string().optional().describe("Concatenation of the street and house number."),
            address_line2: z.string().optional().describe("A string representing the second line of the address."),
            postal_code: z.string().optional().describe("A string representing the postal code."),
            city: z.string().optional().describe("A string representing the city."),
            state_province: z.string().optional().describe("An letter USA state code."),
            country: z.string().optional().describe("An ISO3166 two-letter country code."),
          })
          .optional(),
        label_ids: z.array(z.number().int()).optional().describe("IDs of the labels"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const record = await apiPatch<EduframeRecord>(`/users/${id}`, body);
        void logResponse("update_user", { id, ...body }, record);
        return formatUpdate(record, "user");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
