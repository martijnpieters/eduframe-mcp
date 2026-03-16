import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiPost } from "../api";
import { formatError, formatShow, type EduframeRecord } from "../formatters";
import { logResponse } from "../response-logger";

export function registerEmailTools(server: McpServer): void {
  server.registerTool(
    "create_email_message_by_user_id",
    {
      description: "Create and send an email message to a user",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        user_id: z.number().int().positive().describe("ID of the email"),
        from: z
          .string()
          .describe(
            "From field of the email. The default is the educator reply to email. It is possible to use tags delimited by two pairs of curly braces, i.e. `{{educator.reply_to}}`.",
          ),
        subject: z
          .string()
          .describe(
            "Subject line of the email. It is possible to use tags delimited by two pairs of curly braces, i.e. `{{user.full_name}}`.",
          ),
        body: z
          .string()
          .describe(
            'Body field of the email, allowing HTML format. It is possible to use tags delimited by two pairs of curly braces, i.e. `{{user.full_name}}`. Since this is JSON it does not accept `"` characters and multi-line strings. The body must be properly escaped before sending. This can be done automatically or manually. Example tool: https://www.freeformatter.com/json-escape.html#before-output',
          ),
      },
    },
    async ({ user_id, ...body }) => {
      try {
        const record = await apiPost<EduframeRecord>(`/users/${user_id}/emails`, body);
        void logResponse("create_email_message_by_user_id", { user_id, ...body }, record);
        return formatShow(record, "email");
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
