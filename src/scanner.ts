import fs from "node:fs";
import path from "node:path";

export interface FileMeta {
  filePath: string;
  relativePath: string;
  tags: string[];
  title?: string;
  body: string;
}

function parseFrontmatter(raw: string, filePath: string, baseDir: string): FileMeta {
  const relativePath = path.relative(baseDir, filePath);
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { filePath, relativePath, tags: [], body: raw };
  }

  const yamlBlock = match[1];
  const body = match[2];

  const tagsMatch = yamlBlock.match(/^tags:\s*(.+)$/m);
  const titleMatch = yamlBlock.match(/^title:\s*(.+)$/m);

  let tags: string[] = [];
  if (tagsMatch) {
    const raw = tagsMatch[1].trim();
    if (raw.startsWith("[")) {
      tags = raw
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      tags = [raw];
    }
  }

  return {
    filePath,
    relativePath,
    tags,
    title: titleMatch?.[1].trim(),
    body: body.trim(),
  };
}

function collectMdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

export function scanFiles(dir: string): FileMeta[] {
  const paths = collectMdFiles(dir);
  return paths.map((fp) => {
    const raw = fs.readFileSync(fp, "utf-8");
    return parseFrontmatter(raw, fp, dir);
  });
}

export function allTags(files: FileMeta[]): string[] {
  const tagSet = new Set<string>();
  for (const f of files) {
    for (const t of f.tags) tagSet.add(t);
  }
  return [...tagSet].sort();
}
