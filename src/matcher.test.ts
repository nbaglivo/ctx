import { describe, it, expect } from "vitest";
import { matchFiles } from "./matcher.js";
import type { FileMeta } from "./scanner.js";

function file(tags: string[]): FileMeta {
  return { filePath: "", relativePath: "", tags, body: "" };
}

describe("matchFiles", () => {
  const files = [
    file(["global"]),
    file(["api"]),
    file(["api", "auth"]),
    file(["cli"]),
    file(["global", "cli"]),
  ];

  it("returns only global-tagged files when no tags requested", () => {
    const result = matchFiles(files, []);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.tags.includes("global"))).toBe(true);
  });

  it("returns files matching any requested tag plus global", () => {
    const result = matchFiles(files, ["api"]);
    expect(result).toHaveLength(4);
  });

  it("returns files matching multiple requested tags", () => {
    const result = matchFiles(files, ["auth"]);
    const tags = result.flatMap((f) => f.tags);
    expect(tags).toContain("auth");
    expect(tags).toContain("global");
  });

  it("returns only global files when requested tag matches nothing", () => {
    const result = matchFiles(files, ["nonexistent"]);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.tags.includes("global"))).toBe(true);
  });
});
