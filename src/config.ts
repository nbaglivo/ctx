import fs from "node:fs";
import path from "node:path";
import * as ui from "./ui.js";

export interface ContextEntry {
  tags: string[];
}

export interface ContextConfig {
  contexts: Record<string, ContextEntry>;
}

const CONFIG_FILENAME = "context.json";

function isContextConfig(value: unknown): value is ContextConfig {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.contexts !== "object" || obj.contexts === null) return false;

  for (const [, entry] of Object.entries(obj.contexts as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) return false;
    const e = entry as Record<string, unknown>;
    if (!Array.isArray(e.tags) || !e.tags.every((t: unknown) => typeof t === "string")) {
      return false;
    }
  }
  return true;
}

export function loadConfig(dir: string): ContextConfig | null {
  const configPath = path.join(dir, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) return null;

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, "utf-8");
  } catch {
    ui.error(`Failed to read ${configPath}`);
    return process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    ui.error(`Invalid JSON in ${configPath}`);
    return process.exit(1);
  }

  if (!isContextConfig(parsed)) {
    ui.error(`Invalid context.json format. Expected: { "contexts": { "<name>": { "tags": [...] } } }`);
    return process.exit(1);
  }

  return parsed as ContextConfig;
}

export function resolveContextTags(config: ContextConfig, contextName: string): string[] {
  const entry = config.contexts[contextName];
  if (!entry) {
    ui.error(`Unknown context "${contextName}". Available: ${Object.keys(config.contexts).join(", ")}`);
    process.exit(1);
  }
  return entry.tags;
}
