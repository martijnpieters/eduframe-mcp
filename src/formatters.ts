import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * A generic record returned by the Eduframe API.
 */
export type EduframeRecord = Record<string, unknown>;

const RESPONSE_LOG_HINT = "\n\n*Full JSON response saved to `.mcp-servers/eduframe/.last-response.json`*";

/**
 * Format a resource record as a human-readable string.
 */
function formatRecord(record: EduframeRecord): string {
  return JSON.stringify(record, null, 2);
}

/**
 * Format the response of a LIST tool call.
 *
 * @param records - Array of resource records returned by the API.
 * @param resourceName - Human-readable name of the resource type (e.g. "courses").
 */
export function formatList(records: EduframeRecord[], resourceName: string): CallToolResult {
  if (records.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No ${resourceName} found.`,
        },
      ],
    };
  }

  const formatted = records.map(formatRecord).join("\n\n");
  return {
    content: [
      {
        type: "text",
        text: `Found ${records.length} ${resourceName}:\n\n${formatted}${RESPONSE_LOG_HINT}`,
      },
    ],
  };
}

/**
 * Format the response of a SHOW tool call.
 *
 * @param record - The resource record returned by the API.
 * @param resourceName - Human-readable name of the resource type (e.g. "course").
 */
export function formatShow(record: EduframeRecord, resourceName: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `${resourceName}:\n\n${formatRecord(record)}${RESPONSE_LOG_HINT}`,
      },
    ],
  };
}

/**
 * Format the response of a CREATE tool call.
 *
 * @param record - The newly created resource record returned by the API.
 * @param resourceName - Human-readable name of the resource type (e.g. "course").
 */
export function formatCreate(record: EduframeRecord, resourceName: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Successfully created ${resourceName}:\n\n${formatRecord(record)}${RESPONSE_LOG_HINT}`,
      },
    ],
  };
}

/**
 * Format the response of an UPDATE tool call.
 *
 * @param record - The updated resource record returned by the API.
 * @param resourceName - Human-readable name of the resource type (e.g. "course").
 */
export function formatUpdate(record: EduframeRecord, resourceName: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Successfully updated ${resourceName}:\n\n${formatRecord(record)}${RESPONSE_LOG_HINT}`,
      },
    ],
  };
}

/**
 * Format the response of a DELETE tool call.
 *
 * @param record - The deleted resource record returned by the API.
 * @param resourceName - Human-readable name of the resource type (e.g. "course").
 */
export function formatDelete(record: EduframeRecord, resourceName: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Successfully deleted ${resourceName}:\n\n${formatRecord(record)}${RESPONSE_LOG_HINT}`,
      },
    ],
  };
}
