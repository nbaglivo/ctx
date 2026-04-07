import { Command } from "commander";
import chalk from "chalk";
import path from "node:path";
import { loadConfig, resolveContextTags } from "./config.js";
import { scanFiles, allTags } from "./scanner.js";
import { matchFiles } from "./matcher.js";
import { buildPrompt, writeOutput, estimateTokens } from "./builder.js";
import * as ui from "./ui.js";

const program = new Command();

program
  .name("ctx")
  .description("Build curated markdown context files from tagged notes")
  .version("0.1.0")
  .option("-c, --context <name>", "resolve tags from a named context in context.json")
  .option("-t, --tags <tags>", "comma-separated list of tags to match", "")
  .option("-d, --dir <path>", "notes directory to scan (default: cwd)")
  .option("-o, --output <path>", "output file path (default: .claude-context.md)")
  .option("--list", "list all available tags across files")
  .option("--list-contexts", "list named contexts from context.json");

program.action(async (opts) => {
  const dir = opts.dir ? path.resolve(opts.dir) : process.cwd();
  const outputPath = opts.output
    ? path.resolve(opts.output)
    : path.resolve(dir, ".claude-context.md");

  ui.heading("context builder");

  if (opts.listContexts) {
    const config = loadConfig(dir);
    if (!config) {
      ui.warn("No context.json found in " + dir);
      return;
    }
    ui.info(chalk.bold("Defined contexts:"));
    ui.blank();
    for (const [name, entry] of Object.entries(config.contexts)) {
      const tagStr = entry.tags.map((t) => chalk.hex("#7c5cbf")(t)).join(chalk.dim(", "));
      ui.info(`  ${chalk.white.bold(name)}  ${chalk.dim("→")}  ${tagStr}`);
    }
    ui.blank();
    return;
  }

  const spin = ui.spinner("Scanning markdown files…");
  const files = scanFiles(dir);
  spin.succeed(`Found ${chalk.cyan(String(files.length))} markdown files`);

  if (opts.list) {
    const tags = allTags(files);
    ui.blank();
    ui.info(chalk.bold("Available tags:"));
    ui.blank();
    for (const t of tags) {
      const count = files.filter((f) => f.tags.includes(t)).length;
      ui.info(`  ${chalk.hex("#7c5cbf")(t)}  ${chalk.dim(`(${count} file${count === 1 ? "" : "s"})`)}`);
    }
    ui.blank();
    return;
  }

  let requestedTags: string[] = [];

  if (opts.context) {
    const config = loadConfig(dir);
    if (!config) {
      ui.error(`No context.json found in ${dir}. Create one or use --tags instead.`);
      process.exit(1);
      return;
    }
    requestedTags.push(...resolveContextTags(config, opts.context));
  }

  if (opts.tags) {
    const extra = (opts.tags as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    requestedTags.push(...extra);
  }

  requestedTags = [...new Set(requestedTags)];

  if (requestedTags.length > 0) {
    ui.info(
      `Matching tags: ${requestedTags.map((t) => chalk.hex("#7c5cbf")(t)).join(chalk.dim(", "))}`
    );
  } else {
    ui.info(chalk.dim("No tags specified — using global context only"));
  }

  const spinMatch = ui.spinner("Matching files…");
  const matched = matchFiles(files, requestedTags);
  spinMatch.succeed(`Matched ${chalk.cyan(String(matched.length))} files`);

  if (matched.length === 0) {
    ui.blank();
    ui.warn("No files matched. Try --list to see available tags.");
    ui.blank();
    return;
  }

  ui.blank();
  for (const f of matched) {
    ui.fileEntry(f.relativePath, f.tags);
  }

  const spinBuild = ui.spinner("Building context…");
  const prompt = buildPrompt(matched);
  writeOutput(prompt, outputPath);
  const tokens = estimateTokens(prompt);
  spinBuild.succeed("Context written");

  ui.summary(matched.length, tokens, path.relative(process.cwd(), outputPath));

  ui.hint(`Run: claude --system-prompt-file ${path.relative(process.cwd(), outputPath)}`);
  ui.blank();
});

program.parse();
