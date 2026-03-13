const BASE_URL = "https://api.eduframe.nl/api/v1";

/**
 * Error thrown when the Eduframe API returns a non-2xx HTTP response.
 */
export class EduframeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message: string,
  ) {
    super(`HTTP ${status} ${statusText}: ${message}`);
    this.name = "EduframeApiError";
  }
}

function getConfig(): { token: string; educatorSlug: string } {
  const token = process.env.EDUFRAME_API_TOKEN;
  const educatorSlug = process.env.EDUFRAME_EDUCATOR_SLUG;

  if (!token) {
    throw new Error("EDUFRAME_API_TOKEN environment variable is not set");
  }
  if (!educatorSlug) {
    throw new Error("EDUFRAME_EDUCATOR_SLUG environment variable is not set");
  }

  return { token, educatorSlug };
}

function buildHeaders(token: string, educatorSlug: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    educator_slug: educatorSlug,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

type QueryValue = string | string[] | number | boolean | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): URL {
  const url = new URL(`${BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          url.searchParams.append(key, v);
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url;
}

async function checkResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const body = await response.text();
    throw new EduframeApiError(response.status, response.statusText, body);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await checkResponse(response);
  return response.json() as Promise<T>;
}

/**
 * Parse a Link header to extract the next cursor value.
 *
 * The Eduframe API uses cursor-based pagination and returns a Link header
 * in the format: `<https://api.eduframe.nl/api/v1/leads?cursor=XXX>; rel="next"`
 */
export function parseNextCursor(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const nextMatch = linkHeader.match(/<([^>]*)>;\s*rel="next"/);
  if (!nextMatch) return null;

  try {
    const nextUrl = new URL(nextMatch[1]);
    return nextUrl.searchParams.get("cursor");
  } catch {
    return null;
  }
}

/**
 * Result of a paginated list request.
 */
export interface ListResult<T> {
  records: T[];
  nextCursor: string | null;
}

/**
 * Perform a GET request to a paginated list endpoint.
 *
 * @param path - API path, e.g. "/leads"
 * @param query - Optional query parameters
 */
export async function apiList<T>(path: string, query?: Record<string, QueryValue>): Promise<ListResult<T>> {
  const { token, educatorSlug } = getConfig();
  const url = buildUrl(path, query);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildHeaders(token, educatorSlug),
  });

  await checkResponse(response);

  const records = (await response.json()) as T[];
  const nextCursor = parseNextCursor(response.headers.get("Link"));

  return { records, nextCursor };
}

/**
 * Perform a GET request to retrieve a single resource.
 *
 * @param path - API path, e.g. "/leads/1"
 * @param query - Optional query parameters
 */
export async function apiGet<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
  const { token, educatorSlug } = getConfig();
  const url = buildUrl(path, query);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildHeaders(token, educatorSlug),
  });

  return handleResponse<T>(response);
}

/**
 * Perform a POST request to create a resource.
 *
 * @param path - API path, e.g. "/leads"
 * @param body - Request body
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const { token, educatorSlug } = getConfig();
  const url = buildUrl(path);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: buildHeaders(token, educatorSlug),
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

/**
 * Perform a PUT request to update a resource.
 *
 * @param path - API path, e.g. "/leads/1"
 * @param body - Request body
 */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const { token, educatorSlug } = getConfig();
  const url = buildUrl(path);

  const response = await fetch(url.toString(), {
    method: "PUT",
    headers: buildHeaders(token, educatorSlug),
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

/**
 * Perform a PATCH request to partially update a resource.
 *
 * @param path - API path, e.g. "/leads/1"
 * @param body - Request body
 */
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const { token, educatorSlug } = getConfig();
  const url = buildUrl(path);

  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: buildHeaders(token, educatorSlug),
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

/**
 * Perform a DELETE request to remove a resource.
 *
 * @param path - API path, e.g. "/leads/1"
 */
export async function apiDelete<T>(path: string): Promise<T> {
  const { token, educatorSlug } = getConfig();
  const url = buildUrl(path);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: buildHeaders(token, educatorSlug),
  });

  return handleResponse<T>(response);
}
