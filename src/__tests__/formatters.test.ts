import { describe, it, expect } from "vitest";
import {
  formatList,
  formatShow,
  formatCreate,
  formatUpdate,
  formatDelete,
  type EduframeRecord,
} from "../formatters";

const sampleCourse: EduframeRecord = {
  id: 1,
  name: "Introduction to TypeScript",
  slug: "intro-typescript",
  published: true,
};

const anotherCourse: EduframeRecord = {
  id: 2,
  name: "Advanced Node.js",
  slug: "advanced-nodejs",
  published: false,
};

describe("formatList", () => {
  it("returns a message when no records are found", () => {
    const result = formatList([], "courses");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "No courses found.",
    });
    expect(result.isError).toBeUndefined();
  });

  it("formats a single record", () => {
    const result = formatList([sampleCourse], "courses");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("Found 1 courses:");
    expect(text).toContain('"id": 1');
    expect(text).toContain('"name": "Introduction to TypeScript"');
    expect(text).toContain(".last-response.json");
  });

  it("formats multiple records", () => {
    const result = formatList([sampleCourse, anotherCourse], "courses");
    expect(result.content).toHaveLength(1);
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("Found 2 courses:");
    expect(text).toContain('"id": 1');
    expect(text).toContain('"id": 2');
    expect(text).toContain(".last-response.json");
  });
});

describe("formatShow", () => {
  it("formats a resource record", () => {
    const result = formatShow(sampleCourse, "course");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("course:");
    expect(text).toContain('"id": 1');
    expect(text).toContain('"name": "Introduction to TypeScript"');
    expect(text).toContain(".last-response.json");
    expect(result.isError).toBeUndefined();
  });
});

describe("formatCreate", () => {
  it("formats a created resource", () => {
    const result = formatCreate(sampleCourse, "course");
    expect(result.content).toHaveLength(1);
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("Successfully created course:");
    expect(text).toContain('"id": 1');
    expect(text).toContain(".last-response.json");
    expect(result.isError).toBeUndefined();
  });
});

describe("formatUpdate", () => {
  it("formats an updated resource", () => {
    const updated: EduframeRecord = { ...sampleCourse, name: "Updated Course" };
    const result = formatUpdate(updated, "course");
    expect(result.content).toHaveLength(1);
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("Successfully updated course:");
    expect(text).toContain('"name": "Updated Course"');
    expect(text).toContain(".last-response.json");
    expect(result.isError).toBeUndefined();
  });
});

describe("formatDelete", () => {
  it("formats a deleted resource", () => {
    const result = formatDelete(sampleCourse, "course");
    expect(result.content).toHaveLength(1);
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("Successfully deleted course:");
    expect(text).toContain('"id": 1');
    expect(text).toContain(".last-response.json");
    expect(result.isError).toBeUndefined();
  });
});
