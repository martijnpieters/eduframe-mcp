import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";

vi.mock("fs");

describe("logResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.writeFile).mockImplementation(
      ((...args: unknown[]) => {
        const callback = args[args.length - 1] as (err: Error | null) => void;
        callback(null);
      }) as typeof fs.writeFile,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fs.writeFile with a JSON string containing the tool name", async () => {
    const { logResponse } = await import("../response-logger.js");

    await logResponse("list_leads", { per_page: 10 }, [{ id: 1 }]);

    expect(fs.writeFile).toHaveBeenCalledOnce();
    const writtenData = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    const parsed = JSON.parse(writtenData) as {
      tool: string;
      request: unknown;
      response: unknown;
      timestamp: string;
    };

    expect(parsed.tool).toBe("list_leads");
    expect(parsed.request).toEqual({ per_page: 10 });
    expect(parsed.response).toEqual([{ id: 1 }]);
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("uses an empty object for request when requestParams is null", async () => {
    const { logResponse } = await import("../response-logger.js");

    await logResponse("get_lead", null, { id: 42 });

    const writtenData = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    const parsed = JSON.parse(writtenData) as { request: unknown };

    expect(parsed.request).toEqual({});
  });

  it("does not throw when fs.writeFile returns an error", async () => {
    vi.mocked(fs.writeFile).mockImplementation(
      ((...args: unknown[]) => {
        const callback = args[args.length - 1] as (err: Error | null) => void;
        callback(new Error("disk full"));
      }) as typeof fs.writeFile,
    );

    const { logResponse } = await import("../response-logger.js");

    await expect(logResponse("get_lead", { id: 1 }, { id: 1 })).resolves.toBeUndefined();
  });

  it("writes valid JSON", async () => {
    const { logResponse } = await import("../response-logger.js");
    const response = { id: 1, email: "test@example.com", nested: { a: 1 } };

    await logResponse("get_lead", { id: 1 }, response);

    const writtenData = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(() => JSON.parse(writtenData)).not.toThrow();
  });
});
