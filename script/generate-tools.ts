/**
 * Generate MCP tool files from the Eduframe OpenAPI spec.
 *
 * Usage: npx tsx script/generate-tools.ts
 *
 * For each tag in the spec, produces src/tools/{tag}.ts with register*Tools()
 * and regenerates src/tools/index.ts to wire them all up.
 *
 * Relies on oxfmt (pnpm fmt) for final formatting.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  Project,
  SourceFile,
  VariableDeclarationKind,
  Writers,
  CodeBlockWriter,
} from "ts-morph";

// ---------------------------------------------------------------------------
// Types for the subset of OpenAPI 3.0 we need
// ---------------------------------------------------------------------------

interface OpenAPISpec {
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    parameters?: Record<string, ParameterObject>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

interface PathItem {
  [method: string]: OperationObject | undefined;
}

interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: Array<ParameterObject | RefObject>;
  requestBody?: {
    required?: boolean;
    content?: Record<
      string,
      { schema?: SchemaObject | RefObject }
    >;
  };
  responses?: Record<string, ResponseObject>;
}

interface ResponseObject {
  description?: string;
  content?: Record<string, { schema?: SchemaObject | RefObject }>;
}

interface ParameterObject {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaObject | RefObject;
}

interface SchemaObject {
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  nullable?: boolean;
  required?: string[];
  properties?: Record<string, SchemaObject | RefObject>;
  items?: SchemaObject | RefObject;
  $ref?: string;
  anyOf?: Array<SchemaObject | RefObject>;
  oneOf?: Array<SchemaObject | RefObject>;
  allOf?: Array<SchemaObject | RefObject>;
  deprecated?: boolean;
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

interface RefObject {
  $ref: string;
}

function isRef(obj: SchemaObject | RefObject | undefined): obj is RefObject {
  return obj !== undefined && "$ref" in obj;
}

// ---------------------------------------------------------------------------
// Load and parse the OpenAPI spec
// ---------------------------------------------------------------------------

const SPEC_PATH = path.resolve(import.meta.dirname, "..", "docs", "openapi.json");
const TOOLS_DIR = path.resolve(import.meta.dirname, "..", "src", "tools");

const spec: OpenAPISpec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));

function resolveRef(ref: string): SchemaObject {
  // "#/components/schemas/Foo" → spec.components.schemas.Foo
  const parts = ref.replace(/^#\//, "").split("/");
  let obj: unknown = spec;
  for (const part of parts) {
    obj = (obj as Record<string, unknown>)[part];
  }
  return obj as SchemaObject;
}

function resolveSchema(s: SchemaObject | RefObject): SchemaObject {
  return isRef(s) ? resolveRef(s.$ref) : s;
}

function resolveParameter(p: ParameterObject | RefObject): ParameterObject {
  return isRef(p) ? (resolveRef(p.$ref) as unknown as ParameterObject) : p;
}

// ---------------------------------------------------------------------------
// Group operations by tag
// ---------------------------------------------------------------------------

interface TagOperation {
  method: string; // get, post, patch, put, delete
  path: string; // /leads, /leads/{id}, /orders/{id}/approve
  op: OperationObject;
}

const operationsByTag = new Map<string, TagOperation[]>();

for (const [apiPath, pathItem] of Object.entries(spec.paths)) {
  for (const method of ["get", "post", "put", "patch", "delete"] as const) {
    const op = pathItem[method] as OperationObject | undefined;
    if (!op?.tags?.length) continue;
    for (const tag of op.tags) {
      let ops = operationsByTag.get(tag);
      if (!ops) {
        ops = [];
        operationsByTag.set(tag, ops);
      }
      ops.push({ method, path: apiPath, op });
    }
  }
}

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

/** "catalog-products" → "catalogProducts" */
function tagToIdentifier(tag: string): string {
  return tag.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
}

/** "catalog-products" → "CatalogProduct" */
function tagToSingularPascal(tag: string): string {
  const pascal = tag
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  // naive singularize: strip trailing "s" unless it ends in "ss"
  return pascal.endsWith("s") && !pascal.endsWith("ss")
    ? pascal.slice(0, -1)
    : pascal;
}

/** "catalog-products" → "catalog_products" (for file names) */
function tagToFileName(tag: string): string {
  return tag.replace(/-/g, "_");
}

/**
 * Derive a human-readable singular noun from the tag for use in tool
 * descriptions and formatting helpers.
 * "catalog-products" → "catalog product"
 */
function tagToSingularLabel(tag: string): string {
  const words = tag.replace(/[-_]/g, " ");
  // naive singularise
  return words.endsWith("s") && !words.endsWith("ss")
    ? words.slice(0, -1)
    : words;
}

function tagToPluralLabel(tag: string): string {
  return tag.replace(/[-_]/g, " ");
}

/**
 * Derive tool name from the operationId:
 *   "get_leads"                                → "get_leads"   (list)
 *   "get_lead_by_id"                           → "get_lead"    (get)
 *   "create_lead"                              → "create_lead" (create)
 *   "update_lead_by_id"                        → "update_lead" (update)
 *   "delete_lead_by_id"                        → "delete_lead" (delete)
 *   "approve_order_by_id"                      → "approve_order" (action)
 *   "get_planned_courses_by_course_id"         → "get_planned_courses_by_course_id" (nested list, kept)
 *   "create_teacher_enrollment_by_planned_course_id" → "create_teacher_enrollment_by_planned_course_id" (nested create)
 *
 * Only strips the simple `_by_id` suffix (the resource's own ID),
 * preserving `_by_<parent>_id` suffixes to keep names unique.
 */
function toolNameFromOperationId(operationId: string): string {
  return operationId.replace(/_by_id$/, "");
}

// ---------------------------------------------------------------------------
// OpenAPI schema → Zod expression (written as raw text)
// ---------------------------------------------------------------------------

/**
 * Convert an OpenAPI schema property to a Zod expression string.
 * We generate readable code that mirrors the hand-written leads.ts style.
 */
function schemaToZod(
  schema: SchemaObject | RefObject,
  isRequired: boolean,
  description?: string,
): string {
  const resolved = resolveSchema(schema);

  let expr = schemaToZodInner(resolved);

  if (!isRequired) {
    expr += ".optional()";
  }

  const desc = description ?? resolved.description;
  if (desc) {
    expr += `.describe(${JSON.stringify(desc)})`;
  }

  return expr;
}

function schemaToZodInner(schema: SchemaObject): string {
  if (schema.enum) {
    if (schema.enum.length <= 20) {
      const values = schema.enum.map((v) => JSON.stringify(v)).join(", ");
      return `z.enum([${values}])`;
    }
    // For very large enums (Country has 249 values), use z.string()
    return "z.string()";
  }

  if (schema.anyOf || schema.oneOf) {
    const variants = (schema.anyOf ?? schema.oneOf)!;
    // Filter out null-only schemas (used for nullable)
    const nonNull = variants.filter((v) => {
      const r = resolveSchema(v);
      return !(r.type === "null" || (r.nullable && !r.type));
    });
    if (nonNull.length === 1) {
      return schemaToZodInner(resolveSchema(nonNull[0]));
    }
    const unionParts = nonNull.map((v) => schemaToZodInner(resolveSchema(v)));
    return `z.union([${unionParts.join(", ")}])`;
  }

  switch (schema.type) {
    case "string":
      return "z.string()";
    case "integer":
      return "z.number().int()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "array": {
      const itemSchema = schema.items
        ? schemaToZodInner(resolveSchema(schema.items))
        : "z.unknown()";
      return `z.array(${itemSchema})`;
    }
    case "object": {
      if (!schema.properties) {
        return "z.record(z.unknown())";
      }
      const required = new Set(schema.required ?? []);
      const props = Object.entries(schema.properties)
        .filter(([, v]) => {
          const r = resolveSchema(v);
          return !r.deprecated;
        })
        .map(([name, prop]) => {
          const r = resolveSchema(prop);
          const zodExpr = schemaToZod(prop, required.has(name), r.description);
          return `${name}: ${zodExpr}`;
        });
      return `z.object({ ${props.join(", ")} })`;
    }
    default:
      return "z.unknown()";
  }
}

// ---------------------------------------------------------------------------
// Classify operations for a tag into standard CRUD + custom actions
// ---------------------------------------------------------------------------

interface ClassifiedOps {
  list?: { op: TagOperation; queryParams: ParameterObject[] };
  get?: { op: TagOperation };
  create?: { op: TagOperation; bodySchema: SchemaObject | null };
  update?: { op: TagOperation; bodySchema: SchemaObject | null; method: "patch" | "put" };
  delete?: { op: TagOperation };
  actions: Array<{
    op: TagOperation;
    actionName: string;
    bodySchema: SchemaObject | null;
    method: string;
  }>;
}

function getRequestBodySchema(op: OperationObject): SchemaObject | null {
  const content = op.requestBody?.content?.["application/json"];
  if (!content?.schema) return null;
  return resolveSchema(content.schema);
}

function hasPathParam(apiPath: string): boolean {
  return apiPath.includes("{");
}

/**
 * Determine the "base path" of a resource (the collection path without params).
 * "/leads" → "/leads"
 * "/leads/{id}" → "/leads"
 * "/courses/{course_id}/planned_courses" → "/courses/{course_id}/planned_courses"
 */
function basePath(apiPath: string): string {
  // Remove trailing /{param} segments, but only the last one if it's a simple {id}
  return apiPath.replace(/\/\{[^}]+\}$/, "");
}

function classifyOps(ops: TagOperation[]): ClassifiedOps {
  const result: ClassifiedOps = { actions: [] };

  // Sort operations by path length so simpler paths come first
  const sorted = [...ops].sort((a, b) => a.path.length - b.path.length);

  for (const tagOp of sorted) {
    const { method, path: apiPath, op } = tagOp;

    // Count path parameters to distinguish collection from item endpoints
    const pathParams = (apiPath.match(/\{[^}]+\}/g) ?? []).length;
    const segments = apiPath.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const isItemEndpoint = lastSegment?.startsWith("{");
    const isActionEndpoint = pathParams > 0 && !isItemEndpoint;

    if (method === "get" && !isItemEndpoint) {
      // List endpoint (GET /resource or GET /parent/{id}/children)
      const queryParams = (op.parameters ?? [])
        .map(resolveParameter)
        .filter(
          (p) =>
            p.in === "query" &&
            !p.deprecated &&
            !["cursor", "per_page", "page"].includes(p.name),
        );
      result.list = { op: tagOp, queryParams };
    } else if (method === "get" && isItemEndpoint) {
      result.get = { op: tagOp };
    } else if (method === "post" && !isItemEndpoint && !isActionEndpoint) {
      result.create = { op: tagOp, bodySchema: getRequestBodySchema(op) };
    } else if (
      (method === "patch" || method === "put") &&
      isItemEndpoint
    ) {
      result.update = {
        op: tagOp,
        bodySchema: getRequestBodySchema(op),
        method: method as "patch" | "put",
      };
    } else if (method === "delete" && isItemEndpoint) {
      result.delete = { op: tagOp };
    } else if (
      (method === "put" || method === "post") &&
      isActionEndpoint &&
      !isItemEndpoint
    ) {
      // Custom action like PUT /orders/{id}/approve
      const actionName = lastSegment;
      result.actions.push({
        op: tagOp,
        actionName,
        bodySchema: getRequestBodySchema(op),
        method,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Collect path parameters that are NOT the item's own {id}
// (for nested resources like /courses/{course_id}/planned_courses)
// ---------------------------------------------------------------------------

function getParentPathParams(apiPath: string): string[] {
  // For "/courses/{course_id}/planned_courses/{id}" captures ["course_id"]
  const matches = apiPath.matchAll(/\{([^}]+)\}/g);
  const params: string[] = [];
  for (const m of matches) {
    params.push(m[1]);
  }
  // The last param on item endpoints is the resource's own id
  const segments = apiPath.split("/").filter(Boolean);
  const lastSeg = segments[segments.length - 1];
  if (lastSeg?.startsWith("{")) {
    params.pop();
  }
  return params;
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function generateToolFile(
  project: Project,
  tag: string,
  ops: TagOperation[],
): SourceFile | null {
  const classified = classifyOps(ops);

  // Skip tags that have no standard CRUD operations at all
  if (
    !classified.list &&
    !classified.get &&
    !classified.create &&
    !classified.update &&
    !classified.delete &&
    classified.actions.length === 0
  ) {
    return null;
  }

  const fileName = tagToFileName(tag);
  const singularPascal = tagToSingularPascal(tag);
  const singularLabel = tagToSingularLabel(tag);
  const pluralLabel = tagToPluralLabel(tag);
  const registerFnName = `register${singularPascal}Tools`;

  const filePath = path.join(TOOLS_DIR, `${fileName}.ts`);
  const sf = project.createSourceFile(filePath, "", { overwrite: true });

  // Determine which API helpers and formatters we need
  const apiImports = new Set<string>();
  const formatImports = new Set<string>(["formatError"]);

  if (classified.list) {
    apiImports.add("apiList");
    formatImports.add("formatList");
  }
  if (classified.get) {
    apiImports.add("apiGet");
    formatImports.add("formatShow");
  }
  if (classified.create) {
    apiImports.add("apiPost");
    formatImports.add("formatCreate");
  }
  if (classified.update) {
    if (classified.update.method === "patch") apiImports.add("apiPatch");
    else apiImports.add("apiPut");
    formatImports.add("formatUpdate");
  }
  if (classified.delete) {
    apiImports.add("apiDelete");
    formatImports.add("formatDelete");
  }
  for (const action of classified.actions) {
    if (action.method === "put") apiImports.add("apiPut");
    else apiImports.add("apiPost");
    formatImports.add("formatShow");
  }

  // Imports
  sf.addImportDeclaration({
    moduleSpecifier: "zod",
    namedImports: ["z"],
  });
  sf.addImportDeclaration({
    moduleSpecifier: "@modelcontextprotocol/sdk/server/mcp.js",
    namedImports: ["McpServer"],
    isTypeOnly: true,
  });
  sf.addImportDeclaration({
    moduleSpecifier: "../api",
    namedImports: [...apiImports].sort(),
  });

  const formatterNamedImports = [...formatImports].sort().map((name) => ({ name }));
  formatterNamedImports.push({ name: "EduframeRecord" });
  sf.addImportDeclaration({
    moduleSpecifier: "../formatters",
    namedImports: formatterNamedImports.map((n) => n.name === "EduframeRecord" ? { name: n.name, isTypeOnly: true } : n),
  });
  sf.addImportDeclaration({
    moduleSpecifier: "../response-logger",
    namedImports: ["logResponse"],
  });

  // Collect enum constants that need to be declared at module level
  const enumDecls: Array<{ varName: string; values: string[] }> = [];

  /**
   * Build Zod schema for request body properties and possibly extract
   * top-level enums as module-level constants. Returns the object literal
   * text to use as `inputSchema`.
   */
  function buildBodyFields(
    bodySchema: SchemaObject,
    prefix: string,
  ): string {
    if (!bodySchema.properties) return "{}";

    const required = new Set(bodySchema.required ?? []);
    const lines: string[] = [];

    for (const [propName, rawProp] of Object.entries(bodySchema.properties)) {
      const prop = resolveSchema(rawProp);
      if (prop.deprecated) continue;

      // If this is a small enum, declare it as a module-level const
      if (prop.enum && prop.enum.length <= 20) {
        const constName = `${prefix}${propName.charAt(0).toUpperCase()}${propName.slice(1).replace(/_(\w)/g, (_, c) => c.toUpperCase())}Enum`;
        // Avoid duplicates
        if (!enumDecls.some((d) => d.varName === constName)) {
          enumDecls.push({ varName: constName, values: prop.enum });
        }
        const isReq = required.has(propName);
        let expr = constName;
        if (!isReq) expr += ".optional()";
        if (prop.description) expr += `.describe(${JSON.stringify(prop.description)})`;
        lines.push(`${propName}: ${expr}`);
        continue;
      }

      lines.push(
        `${propName}: ${schemaToZod(rawProp, required.has(propName), prop.description)}`,
      );
    }

    return `{ ${lines.join(", ")} }`;
  }

  // ---------- Build the register function body ----------

  const bodyParts: string[] = [];

  // --- list tool ---
  if (classified.list) {
    const listOp = classified.list.op;
    const queryParams = classified.list.queryParams;
    const toolName = toolNameFromOperationId(listOp.op.operationId ?? `list_${tagToFileName(tag)}`);
    const desc = listOp.op.summary ?? `List all ${pluralLabel}`;
    const apiPathStr = listOp.path;

    // Determine parent path params
    const parentParams = getParentPathParams(listOp.path);

    // Build inputSchema fields
    const inputFields: string[] = [];
    // Add parent path params first
    for (const pp of parentParams) {
      inputFields.push(
        `${pp}: z.number().int().positive().describe("ID of the parent resource")`,
      );
    }
    inputFields.push(
      `cursor: z.string().optional().describe("Cursor for fetching the next page of results")`,
    );
    inputFields.push(
      `per_page: z.number().int().positive().optional().describe("Number of results per page (default: 25)")`,
    );
    for (const qp of queryParams) {
      const qpSchema = qp.schema ? resolveSchema(qp.schema) : { type: "string" as const };
      const zodExpr = schemaToZod(
        qpSchema,
        qp.required ?? false,
        qp.description,
      );
      inputFields.push(`${qp.name}: ${zodExpr}`);
    }

    const allParamNames = [
      ...parentParams,
      "cursor",
      "per_page",
      ...queryParams.map((q) => q.name),
    ];

    // Build API path expression
    let apiPathExpr: string;
    if (parentParams.length > 0) {
      // Template string for nested resources
      apiPathExpr =
        "`" +
        apiPathStr.replace(
          /\{([^}]+)\}/g,
          (_, name) => "${" + name + "}",
        ) +
        "`";
    } else {
      apiPathExpr = JSON.stringify(apiPathStr);
    }

    bodyParts.push(`
  server.registerTool(
    ${JSON.stringify(toolName)},
    {
      description: ${JSON.stringify(desc)},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { ${inputFields.join(", ")} },
    },
    async ({ ${allParamNames.join(", ")} }) => {
      try {
        const result = await apiList<EduframeRecord>(${apiPathExpr}, { ${allParamNames.filter((n) => !parentParams.includes(n)).join(", ")} });
        void logResponse(${JSON.stringify(toolName)}, { ${allParamNames.join(", ")} }, result);
        const toolResult = formatList(result.records, ${JSON.stringify(pluralLabel)});
        if (result.nextCursor) {
          toolResult.content.push({ type: "text", text: \`\\nNext page cursor: \${result.nextCursor}\` });
        }
        return toolResult;
      } catch (error) {
        return formatError(error);
      }
    },
  );`);
  }

  // --- get tool ---
  if (classified.get) {
    const getOp = classified.get.op;
    const toolName = toolNameFromOperationId(getOp.op.operationId ?? `get_${tagToFileName(tag).replace(/s$/, "")}`);
    const desc = getOp.op.summary ?? `Get one ${singularLabel} record`;

    // Build API path expression
    const parentParams = getParentPathParams(getOp.path);
    const allIdParams = [...parentParams, "id"];

    const inputFields = allIdParams.map((p) =>
      `${p}: z.number().int().positive().describe(${JSON.stringify(p === "id" ? `ID of the ${singularLabel} to retrieve` : "ID of the parent resource")})`,
    );

    let apiPathExpr =
      "`" +
      getOp.path.replace(
        /\{([^}]+)\}/g,
        (_, name) => "${" + name + "}",
      ) +
      "`";

    bodyParts.push(`
  server.registerTool(
    ${JSON.stringify(toolName)},
    {
      description: ${JSON.stringify(desc)},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: { ${inputFields.join(", ")} },
    },
    async ({ ${allIdParams.join(", ")} }) => {
      try {
        const record = await apiGet<EduframeRecord>(${apiPathExpr});
        void logResponse(${JSON.stringify(toolName)}, { ${allIdParams.join(", ")} }, record);
        return formatShow(record, ${JSON.stringify(singularLabel)});
      } catch (error) {
        return formatError(error);
      }
    },
  );`);
  }

  // --- create tool ---
  if (classified.create) {
    const createOp = classified.create.op;
    const toolName = toolNameFromOperationId(createOp.op.operationId ?? `create_${tagToFileName(tag).replace(/s$/, "")}`);
    const desc = createOp.op.summary ?? `Create a ${singularLabel}`;

    const parentParams = getParentPathParams(createOp.path);

    let inputSchemaStr: string;
    if (classified.create.bodySchema) {
      inputSchemaStr = buildBodyFields(
        classified.create.bodySchema,
        tagToIdentifier(tag).replace(/s$/, ""),
      );
      // Add parent path params if nested
      if (parentParams.length > 0) {
        const parentFields = parentParams
          .map((p) => `${p}: z.number().int().positive().describe("ID of the parent resource")`)
          .join(", ");
        inputSchemaStr = inputSchemaStr.replace(/^\{/, `{ ${parentFields}, `);
      }
    } else {
      inputSchemaStr = "{}";
    }

    let apiPathExpr: string;
    if (parentParams.length > 0) {
      apiPathExpr =
        "`" +
        createOp.path.replace(
          /\{([^}]+)\}/g,
          (_, name) => "${" + name + "}",
        ) +
        "`";
    } else {
      apiPathExpr = JSON.stringify(createOp.path);
    }

    const deconstructExpr =
      parentParams.length > 0
        ? `{ ${parentParams.join(", ")}, ...body }`
        : "body";
    const logParamsExpr =
      parentParams.length > 0
        ? `{ ${parentParams.join(", ")}, ...body }`
        : "body";

    bodyParts.push(`
  server.registerTool(
    ${JSON.stringify(toolName)},
    {
      description: ${JSON.stringify(desc)},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: ${inputSchemaStr},
    },
    async (${deconstructExpr}) => {
      try {
        const record = await apiPost<EduframeRecord>(${apiPathExpr}, body);
        void logResponse(${JSON.stringify(toolName)}, ${logParamsExpr}, record);
        return formatCreate(record, ${JSON.stringify(singularLabel)});
      } catch (error) {
        return formatError(error);
      }
    },
  );`);
  }

  // --- update tool ---
  if (classified.update) {
    const updateOp = classified.update.op;
    const toolName = toolNameFromOperationId(updateOp.op.operationId ?? `update_${tagToFileName(tag).replace(/s$/, "")}`);
    const desc = updateOp.op.summary ?? `Update a ${singularLabel}`;
    const apiFn = classified.update.method === "patch" ? "apiPatch" : "apiPut";

    const parentParams = getParentPathParams(updateOp.path);
    const allIdParams = [...parentParams, "id"];

    let inputSchemaStr: string;
    if (classified.update.bodySchema) {
      inputSchemaStr = buildBodyFields(
        classified.update.bodySchema,
        tagToIdentifier(tag).replace(/s$/, ""),
      );
      // Prepend id params
      const idFields = allIdParams
        .map((p) => `${p}: z.number().int().positive().describe(${JSON.stringify(p === "id" ? `ID of the ${singularLabel} to update` : "ID of the parent resource")})`)
        .join(", ");
      inputSchemaStr = inputSchemaStr.replace(/^\{/, `{ ${idFields}, `);
    } else {
      const idFields = allIdParams
        .map((p) => `${p}: z.number().int().positive().describe(${JSON.stringify(p === "id" ? `ID of the ${singularLabel} to update` : "ID of the parent resource")})`)
        .join(", ");
      inputSchemaStr = `{ ${idFields} }`;
    }

    let apiPathExpr =
      "`" +
      updateOp.path.replace(
        /\{([^}]+)\}/g,
        (_, name) => "${" + name + "}",
      ) +
      "`";

    bodyParts.push(`
  server.registerTool(
    ${JSON.stringify(toolName)},
    {
      description: ${JSON.stringify(desc)},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: ${inputSchemaStr},
    },
    async ({ ${allIdParams.join(", ")}, ...body }) => {
      try {
        const record = await ${apiFn}<EduframeRecord>(${apiPathExpr}, body);
        void logResponse(${JSON.stringify(toolName)}, { ${allIdParams.join(", ")}, ...body }, record);
        return formatUpdate(record, ${JSON.stringify(singularLabel)});
      } catch (error) {
        return formatError(error);
      }
    },
  );`);
  }

  // --- delete tool ---
  if (classified.delete) {
    const deleteOp = classified.delete.op;
    const toolName = toolNameFromOperationId(deleteOp.op.operationId ?? `delete_${tagToFileName(tag).replace(/s$/, "")}`);
    const desc = deleteOp.op.summary ?? `Delete a ${singularLabel}`;

    const parentParams = getParentPathParams(deleteOp.path);
    const allIdParams = [...parentParams, "id"];

    const inputFields = allIdParams.map((p) =>
      `${p}: z.number().int().positive().describe(${JSON.stringify(p === "id" ? `ID of the ${singularLabel} to delete` : "ID of the parent resource")})`,
    );

    let apiPathExpr =
      "`" +
      deleteOp.path.replace(
        /\{([^}]+)\}/g,
        (_, name) => "${" + name + "}",
      ) +
      "`";

    bodyParts.push(`
  server.registerTool(
    ${JSON.stringify(toolName)},
    {
      description: ${JSON.stringify(desc)},
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: { ${inputFields.join(", ")} },
    },
    async ({ ${allIdParams.join(", ")} }) => {
      try {
        const record = await apiDelete<EduframeRecord>(${apiPathExpr});
        void logResponse(${JSON.stringify(toolName)}, { ${allIdParams.join(", ")} }, record);
        return formatDelete(record, ${JSON.stringify(singularLabel)});
      } catch (error) {
        return formatError(error);
      }
    },
  );`);
  }

  // --- custom action tools ---
  for (const action of classified.actions) {
    const actionToolName = toolNameFromOperationId(
      action.op.op.operationId ?? `${action.actionName}_${tagToFileName(tag).replace(/s$/, "")}`,
    );
    const desc =
      action.op.op.summary ??
      `${action.actionName.charAt(0).toUpperCase() + action.actionName.slice(1)} a ${singularLabel}`;
    const apiFn = action.method === "put" ? "apiPut" : "apiPost";

    const parentParams = getParentPathParams(action.op.path);
    // For action paths like /orders/{id}/approve, the {id} is in the middle
    // We need all path params
    const pathParamMatches = action.op.path.matchAll(/\{([^}]+)\}/g);
    const allPathParams = [...pathParamMatches].map((m) => m[1]);

    const inputFields = allPathParams.map((p) =>
      `${p}: z.number().int().positive().describe(${JSON.stringify(`ID of the ${singularLabel}`)})`,
    );

    let apiPathExpr =
      "`" +
      action.op.path.replace(
        /\{([^}]+)\}/g,
        (_, name) => "${" + name + "}",
      ) +
      "`";

    const hasBody = action.bodySchema != null;

    if (hasBody) {
      let inputSchemaStr = buildBodyFields(
        action.bodySchema!,
        action.actionName,
      );
      const idFieldsStr = inputFields.join(", ");
      inputSchemaStr = inputSchemaStr.replace(/^\{/, `{ ${idFieldsStr}, `);

      bodyParts.push(`
  server.registerTool(
    ${JSON.stringify(actionToolName)},
    {
      description: ${JSON.stringify(desc)},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: ${inputSchemaStr},
    },
    async ({ ${allPathParams.join(", ")}, ...body }) => {
      try {
        const record = await ${apiFn}<EduframeRecord>(${apiPathExpr}, body);
        void logResponse(${JSON.stringify(actionToolName)}, { ${allPathParams.join(", ")}, ...body }, record);
        return formatShow(record, ${JSON.stringify(singularLabel)});
      } catch (error) {
        return formatError(error);
      }
    },
  );`);
    } else {
      bodyParts.push(`
  server.registerTool(
    ${JSON.stringify(actionToolName)},
    {
      description: ${JSON.stringify(desc)},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: { ${inputFields.join(", ")} },
    },
    async ({ ${allPathParams.join(", ")} }) => {
      try {
        const record = await ${apiFn}<EduframeRecord>(${apiPathExpr}, {});
        void logResponse(${JSON.stringify(actionToolName)}, { ${allPathParams.join(", ")} }, record);
        return formatShow(record, ${JSON.stringify(singularLabel)});
      } catch (error) {
        return formatError(error);
      }
    },
  );`);
    }
  }

  // Add enum constants before the register function
  for (const { varName, values } of enumDecls) {
    sf.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: varName,
          initializer: `z.enum([${values.map((v) => JSON.stringify(v)).join(", ")}])`,
        },
      ],
    });
  }

  // Add the register function
  sf.addFunction({
    name: registerFnName,
    isExported: true,
    parameters: [{ name: "server", type: "McpServer" }],
    returnType: "void",
    statements: bodyParts.join("\n"),
  });

  return sf;
}

// ---------------------------------------------------------------------------
// Generate tools/index.ts
// ---------------------------------------------------------------------------

function generateIndex(
  project: Project,
  toolFiles: Array<{ fileName: string; registerFnName: string }>,
): void {
  const indexPath = path.join(TOOLS_DIR, "index.ts");
  const sf = project.createSourceFile(indexPath, "", { overwrite: true });

  sf.addImportDeclaration({
    moduleSpecifier: "@modelcontextprotocol/sdk/server/mcp.js",
    namedImports: ["McpServer"],
    isTypeOnly: true,
  });

  for (const { fileName, registerFnName } of toolFiles) {
    sf.addImportDeclaration({
      moduleSpecifier: `./${fileName}`,
      namedImports: [registerFnName],
    });
  }

  sf.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "tools",
        type: "Array<(server: McpServer) => void>",
        initializer: `[${toolFiles.map((t) => t.registerFnName).join(", ")}]`,
      },
    ],
  });

  sf.addFunction({
    name: "registerAllTools",
    isExported: true,
    parameters: [{ name: "server", type: "McpServer" }],
    returnType: "void",
    statements: `for (const register of tools) {\n  register(server);\n}`,
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const project = new Project({ useInMemoryFileSystem: false });

  const toolFiles: Array<{ fileName: string; registerFnName: string }> = [];
  const sortedTags = [...operationsByTag.keys()].sort();

  for (const tag of sortedTags) {
    const ops = operationsByTag.get(tag)!;
    const sf = generateToolFile(project, tag, ops);
    if (sf) {
      const fileName = tagToFileName(tag);
      const singularPascal = tagToSingularPascal(tag);
      toolFiles.push({
        fileName,
        registerFnName: `register${singularPascal}Tools`,
      });
      console.log(`  Generated src/tools/${fileName}.ts (${ops.length} operations)`);
    } else {
      console.log(`  Skipped ${tag} (no standard operations)`);
    }
  }

  generateIndex(project, toolFiles);
  console.log(`  Generated src/tools/index.ts (${toolFiles.length} tool files)`);

  project.saveSync();
  console.log("\nDone. Run 'pnpm fmt' to format the generated files.");
}

main();
