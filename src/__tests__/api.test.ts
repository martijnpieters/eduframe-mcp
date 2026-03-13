import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { parseNextCursor, EduframeApiError, validateConfig } from "../api.js";

// ---------------------------------------------------------------------------
// parseNextCursor
// ---------------------------------------------------------------------------

describe("parseNextCursor", () => {
  it("returns null when the link header is null", () => {
    expect(parseNextCursor(null)).toBeNull();
  });

  it("returns null when there is no rel=next link", () => {
    const header = '<https://api.eduframe.nl/api/v1/leads?cursor=abc>; rel="prev"';
    expect(parseNextCursor(header)).toBeNull();
  });

  it("extracts the cursor from a rel=next link", () => {
    const header = '<https://api.eduframe.nl/api/v1/leads?cursor=eyJpZCI6NTB9&per_page=25>; rel="next"';
    expect(parseNextCursor(header)).toBe("eyJpZCI6NTB9");
  });

  it("handles a link header with both prev and next", () => {
    const header =
      '<https://api.eduframe.nl/api/v1/leads?cursor=prev>; rel="prev", ' +
      '<https://api.eduframe.nl/api/v1/leads?cursor=next123>; rel="next"';
    expect(parseNextCursor(header)).toBe("next123");
  });

  it("returns null when the next URL contains no cursor param", () => {
    const header = '<https://api.eduframe.nl/api/v1/leads?per_page=25>; rel="next"';
    expect(parseNextCursor(header)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// EduframeApiError
// ---------------------------------------------------------------------------

describe("EduframeApiError", () => {
  it("sets name, status, statusText and message", () => {
    const err = new EduframeApiError(404, "Not Found", "resource not found");
    expect(err.name).toBe("EduframeApiError");
    expect(err.status).toBe(404);
    expect(err.statusText).toBe("Not Found");
    expect(err.message).toBe("HTTP 404 Not Found: resource not found");
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// validateConfig
// ---------------------------------------------------------------------------

describe("validateConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EDUFRAME_API_TOKEN;
  });

  it("does not throw when EDUFRAME_API_TOKEN is set", () => {
    process.env.EDUFRAME_API_TOKEN = "test-token";
    expect(() => validateConfig()).not.toThrow();
  });

  it("throws a readable error when EDUFRAME_API_TOKEN is missing", () => {
    delete process.env.EDUFRAME_API_TOKEN;
    expect(() => validateConfig()).toThrow("EDUFRAME_API_TOKEN");
  });

  it("error message lists the missing variable name", () => {
    delete process.env.EDUFRAME_API_TOKEN;
    expect(() => validateConfig()).toThrow("Missing required environment variable");
  });
});

// ---------------------------------------------------------------------------
// API functions – require auth env vars and a mocked fetch
// ---------------------------------------------------------------------------

const VALID_ENV = {
  EDUFRAME_API_TOKEN: "test-token",
};

function makeFetch(status: number, body: unknown, headers?: Record<string, string>): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      get: (name: string) => headers?.[name] ?? null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

describe("apiList", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    Object.assign(process.env, VALID_ENV);
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EDUFRAME_API_TOKEN;
  });

  it("returns records and null nextCursor when no Link header", async () => {
    const records = [{ id: 1, email: "a@b.com" }];
    fetchSpy.mockImplementation(makeFetch(200, records));

    const { apiList } = await import("../api.js");
    const result = await apiList("/leads");

    expect(result.records).toEqual(records);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when a Link header is present", async () => {
    const records = [{ id: 1 }];
    fetchSpy.mockImplementation(
      makeFetch(200, records, {
        Link: '<https://api.eduframe.nl/api/v1/leads?cursor=abc123>; rel="next"',
      }),
    );

    const { apiList } = await import("../api.js");
    const result = await apiList("/leads");

    expect(result.nextCursor).toBe("abc123");
  });

  it("passes query parameters to the fetch URL", async () => {
    fetchSpy.mockImplementation(makeFetch(200, []));

    const { apiList } = await import("../api.js");
    await apiList("/leads", { per_page: 10, search: "alice" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const calledUrl = (fetchSpy.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain("per_page=10");
    expect(calledUrl).toContain("search=alice");
  });

  it("sends an Authorization header", async () => {
    fetchSpy.mockImplementation(makeFetch(200, []));

    const { apiList } = await import("../api.js");
    await apiList("/leads");

    const calledInit = (fetchSpy.mock.calls[0] as [string, RequestInit])[1];
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-token");
  });

  it("throws EduframeApiError on non-2xx response", async () => {
    fetchSpy.mockImplementation(makeFetch(422, { error: "Unprocessable" }));

    const { apiList, EduframeApiError: ApiError } = await import("../api.js");
    await expect(apiList("/leads")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws when EDUFRAME_API_TOKEN is not set", async () => {
    delete process.env.EDUFRAME_API_TOKEN;

    const { apiList } = await import("../api.js");
    await expect(apiList("/leads")).rejects.toThrow("EDUFRAME_API_TOKEN");
  });
});

describe("apiGet", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    Object.assign(process.env, VALID_ENV);
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EDUFRAME_API_TOKEN;
  });

  it("returns the parsed JSON body", async () => {
    const lead = { id: 42, email: "lead@example.com" };
    fetchSpy.mockImplementation(makeFetch(200, lead));

    const { apiGet } = await import("../api.js");
    const result = await apiGet("/leads/42");

    expect(result).toEqual(lead);
  });

  it("throws EduframeApiError on 404", async () => {
    fetchSpy.mockImplementation(makeFetch(404, { error: "not found" }));

    const { apiGet, EduframeApiError: ApiError } = await import("../api.js");
    await expect(apiGet("/leads/999")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiPost", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    Object.assign(process.env, VALID_ENV);
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EDUFRAME_API_TOKEN;
  });

  it("sends a POST request with the correct body and returns the response", async () => {
    const created = { id: 1, email: "new@example.com" };
    fetchSpy.mockImplementation(makeFetch(201, created));

    const { apiPost } = await import("../api.js");
    const result = await apiPost("/leads", {
      first_name: "Alice",
      email: "new@example.com",
    });

    expect(result).toEqual(created);
    const calledInit = (fetchSpy.mock.calls[0] as [string, RequestInit])[1];
    expect(calledInit.method).toBe("POST");
    expect(JSON.parse(calledInit.body as string)).toMatchObject({
      first_name: "Alice",
    });
  });
});

describe("apiPut", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    Object.assign(process.env, VALID_ENV);
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EDUFRAME_API_TOKEN;
  });

  it("sends a PUT request and returns the updated resource", async () => {
    const updated = { id: 1, email: "updated@example.com" };
    fetchSpy.mockImplementation(makeFetch(200, updated));

    const { apiPut } = await import("../api.js");
    const result = await apiPut("/leads/1", { email: "updated@example.com" });

    expect(result).toEqual(updated);
    const calledInit = (fetchSpy.mock.calls[0] as [string, RequestInit])[1];
    expect(calledInit.method).toBe("PUT");
  });
});

describe("apiPatch", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    Object.assign(process.env, VALID_ENV);
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EDUFRAME_API_TOKEN;
  });

  it("sends a PATCH request and returns the updated resource", async () => {
    const updated = { id: 1, status: "won" };
    fetchSpy.mockImplementation(makeFetch(200, updated));

    const { apiPatch } = await import("../api.js");
    const result = await apiPatch("/leads/1", { status: "won" });

    expect(result).toEqual(updated);
    const calledInit = (fetchSpy.mock.calls[0] as [string, RequestInit])[1];
    expect(calledInit.method).toBe("PATCH");
    expect(JSON.parse(calledInit.body as string)).toMatchObject({ status: "won" });
  });
});

describe("apiDelete", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    Object.assign(process.env, VALID_ENV);
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EDUFRAME_API_TOKEN;
  });

  it("sends a DELETE request and returns the deleted resource", async () => {
    const deleted = { id: 1 };
    fetchSpy.mockImplementation(makeFetch(200, deleted));

    const { apiDelete } = await import("../api.js");
    const result = await apiDelete("/leads/1");

    expect(result).toEqual(deleted);
    const calledInit = (fetchSpy.mock.calls[0] as [string, RequestInit])[1];
    expect(calledInit.method).toBe("DELETE");
  });
});
