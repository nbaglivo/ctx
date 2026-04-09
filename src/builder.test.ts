import { vi, describe, it, expect } from "vitest";

vi.mock("node:fs");
import fs from "node:fs";

import { buildPrompt, writeOutput, estimateTokens } from "./builder.js";
import type { FileMeta } from "./scanner.js";

function file(overrides: Partial<FileMeta> & { body: string }): FileMeta {
  return { filePath: "/f.md", relativePath: "f.md", tags: [], ...overrides };
}

describe("buildPrompt", () => {
  it("uses title as header when available", () => {
    const result = buildPrompt([file({ title: "My Title", body: "content" })]);
    expect(result).toContain("## My Title");
    expect(result).toContain("content");
  });

  it("falls back to filename when no title", () => {
    const result = buildPrompt([
      file({ filePath: "/notes/setup.md", body: "setup steps" }),
    ]);
    expect(result).toContain("## setup");
    expect(result).toContain("setup steps");
  });

  it("includes the system preamble", () => {
    const result = buildPrompt([file({ body: "x" })]);
    expect(result).toMatch(/curated context set/i);
  });

  it("joins multiple files with spacing", () => {
    const result = buildPrompt([
      file({ title: "A", body: "body a" }),
      file({ title: "B", body: "body b" }),
    ]);
    expect(result).toContain("## A");
    expect(result).toContain("## B");
    expect(result).toContain("body a");
    expect(result).toContain("body b");
  });
});

describe("writeOutput", () => {
  it("writes content to the specified path", () => {
    writeOutput("hello world", "/tmp/output.md");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/tmp/output.md",
      "hello world",
      "utf-8",
    );
  });
});

describe("estimateTokens", () => {
  it("estimates ~1 token per 4 characters", () => {
    const text = "a".repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(estimateTokens("ab")).toBe(1);
  });
});
