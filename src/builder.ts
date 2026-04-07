import fs from "node:fs";
import path from "node:path";
import type { FileMeta } from "./scanner.js";

export function buildPrompt(files: FileMeta[]): string {
  const sections = files.map((f) => {
    const header = f.title
      ? `## ${f.title}`
      : `## ${path.basename(f.filePath, ".md")}`;
    return `${header}\n\n${f.body}`;
  });

  return [
    "You are operating with a curated context set. Use the following information to inform your responses.",
    "",
    ...sections,
  ].join("\n\n");
}

export function writeOutput(content: string, outputPath: string): void {
  fs.writeFileSync(outputPath, content, "utf-8");
}

export function estimateTokens(content: string): number {
  return Math.round(content.length / 4);
}
