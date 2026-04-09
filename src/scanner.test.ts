import { vi, describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import type { Dirent, Stats } from "node:fs";

vi.mock("node:fs");
import fs from "node:fs";

import { parseFrontmatter, scanFiles, allTags } from "./scanner.js";

type VfsNode =
  | { type: "file"; content: string }
  | { type: "dir" }
  | { type: "symlink"; target: string };

function setupVfs(tree: Record<string, VfsNode>) {
  function resolve(p: string): string {
    const parts = p.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      const node = tree[current];
      if (node?.type === "symlink") {
        current = resolve(node.target);
      }
    }
    return current;
  }

  function childrenOf(resolvedDir: string): string[] {
    const prefix = resolvedDir + "/";
    const names = new Set<string>();
    for (const key of Object.keys(tree)) {
      if (!key.startsWith(prefix)) continue;
      const name = key.slice(prefix.length).split("/")[0];
      if (name) names.add(name);
    }
    return [...names].sort();
  }

  vi.mocked(fs.realpathSync).mockImplementation((p) => resolve(String(p)));

  vi.mocked(fs.readdirSync).mockImplementation(((dir: string) => {
    const resolvedDir = resolve(dir);
    return childrenOf(resolvedDir).map((name) => {
      const node = tree[resolvedDir + "/" + name];
      return {
        name,
        isFile: () => node?.type === "file",
        isDirectory: () => node?.type === "dir",
        isSymbolicLink: () => node?.type === "symlink",
      } as Dirent;
    });
  }) as typeof fs.readdirSync);

  vi.mocked(fs.statSync).mockImplementation(((p: string) => {
    const node = tree[resolve(p)];
    return {
      isFile: () => node?.type === "file",
      isDirectory: () => node?.type === "dir",
    } as Stats;
  }) as typeof fs.statSync);

  vi.mocked(fs.readFileSync).mockImplementation(((p: string) => {
    const node = tree[resolve(p)];
    if (node?.type === "file") return node.content;
    throw new Error(`ENOENT: ${p}`);
  }) as typeof fs.readFileSync);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("parseFrontmatter", () => {
  it("parses tags as array syntax", () => {
    const raw = "---\ntags: [api, auth]\ntitle: Auth Guide\n---\nSome body text";
    const result = parseFrontmatter(raw, "/notes/auth.md", "/notes");
    expect(result.tags).toEqual(["api", "auth"]);
    expect(result.title).toBe("Auth Guide");
    expect(result.body).toBe("Some body text");
    expect(result.relativePath).toBe("auth.md");
  });

  it("parses a single tag without brackets", () => {
    const raw = "---\ntags: global\n---\nBody here";
    const result = parseFrontmatter(raw, "/notes/global.md", "/notes");
    expect(result.tags).toEqual(["global"]);
    expect(result.title).toBeUndefined();
    expect(result.body).toBe("Body here");
  });

  it("returns empty tags and full body when no frontmatter", () => {
    const raw = "Just plain markdown content";
    const result = parseFrontmatter(raw, "/notes/plain.md", "/notes");
    expect(result.tags).toEqual([]);
    expect(result.title).toBeUndefined();
    expect(result.body).toBe("Just plain markdown content");
  });

  it("handles frontmatter with no tags or title", () => {
    const raw = "---\nauthor: someone\n---\nBody";
    const result = parseFrontmatter(raw, "/n/x.md", "/n");
    expect(result.tags).toEqual([]);
    expect(result.title).toBeUndefined();
    expect(result.body).toBe("Body");
  });

  it("computes relativePath from baseDir", () => {
    const raw = "---\ntags: [a]\n---\ntext";
    const result = parseFrontmatter(raw, "/root/sub/deep/note.md", "/root");
    expect(result.relativePath).toBe(path.join("sub", "deep", "note.md"));
  });
});

describe("scanFiles", () => {
  it("discovers .md files recursively", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/a.md": { type: "file", content: "file a" },
      "/root/sub": { type: "dir" },
      "/root/sub/b.md": { type: "file", content: "file b" },
      "/root/sub/deep": { type: "dir" },
      "/root/sub/deep/c.md": { type: "file", content: "file c" },
    });

    const files = scanFiles("/root");
    const names = files.map((f) => f.relativePath).sort();
    expect(names).toEqual(["a.md", "sub/b.md", "sub/deep/c.md"]);
  });

  it("ignores non-.md files", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/note.md": { type: "file", content: "yes" },
      "/root/readme.txt": { type: "file", content: "no" },
      "/root/data.json": { type: "file", content: "no" },
    });

    const files = scanFiles("/root");
    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe("note.md");
  });

  it("ignores dotfiles and dot-directories", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/.hidden.md": { type: "file", content: "no" },
      "/root/.secret": { type: "dir" },
      "/root/.secret/note.md": { type: "file", content: "no" },
      "/root/visible.md": { type: "file", content: "yes" },
    });

    const files = scanFiles("/root");
    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe("visible.md");
  });

  it("reads frontmatter from discovered files", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/guide.md": {
        type: "file",
        content: "---\ntags: [api, cli]\ntitle: CLI Guide\n---\nUsage info",
      },
    });

    const files = scanFiles("/root");
    expect(files).toHaveLength(1);
    expect(files[0].tags).toEqual(["api", "cli"]);
    expect(files[0].title).toBe("CLI Guide");
    expect(files[0].body).toBe("Usage info");
  });

  it("follows symlinked directories", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/note.md": { type: "file", content: "local" },
      "/root/linked": { type: "symlink", target: "/external" },
      "/external": { type: "dir" },
      "/external/extra.md": { type: "file", content: "from external" },
    });

    const files = scanFiles("/root");
    const paths = files.map((f) => f.relativePath).sort();
    expect(paths).toEqual(["linked/extra.md", "note.md"]);
  });

  it("follows symlinked files", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/real.md": { type: "file", content: "real content" },
      "/root/link.md": { type: "symlink", target: "/root/real.md" },
    });

    const files = scanFiles("/root");
    const paths = files.map((f) => f.relativePath).sort();
    expect(paths).toEqual(["link.md", "real.md"]);
  });

  it("does not loop on circular symlinks", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/a": { type: "dir" },
      "/root/a/note.md": { type: "file", content: "in a" },
      "/root/a/back-to-a": { type: "symlink", target: "/root/a" },
    });

    const files = scanFiles("/root");
    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe(path.join("a", "note.md"));
  });

  it("handles mutual symlink cycles between directories", () => {
    setupVfs({
      "/root": { type: "dir" },
      "/root/x": { type: "dir" },
      "/root/x/from-x.md": { type: "file", content: "x content" },
      "/root/x/to-y": { type: "symlink", target: "/root/y" },
      "/root/y": { type: "dir" },
      "/root/y/from-y.md": { type: "file", content: "y content" },
      "/root/y/to-x": { type: "symlink", target: "/root/x" },
    });

    const files = scanFiles("/root");
    const bodies = files.map((f) => f.body).sort();
    expect(bodies).toContain("x content");
    expect(bodies).toContain("y content");
    expect(files.length).toBeGreaterThanOrEqual(2);
  });
});

describe("allTags", () => {
  it("returns sorted unique tags across files", () => {
    const files = [
      { filePath: "", relativePath: "", tags: ["b", "a"], body: "" },
      { filePath: "", relativePath: "", tags: ["c", "a"], body: "" },
    ];
    expect(allTags(files)).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for no files", () => {
    expect(allTags([])).toEqual([]);
  });
});
