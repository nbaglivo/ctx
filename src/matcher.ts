import type { FileMeta } from "./scanner.js";

export function matchFiles(files: FileMeta[], requestedTags: string[]): FileMeta[] {
  if (requestedTags.length === 0) {
    return files.filter((f) => f.tags.includes("global"));
  }

  return files.filter((f) =>
    f.tags.some((t) => t === "global" || requestedTags.includes(t))
  );
}
