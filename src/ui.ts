import chalk from "chalk";
import ora, { type Ora } from "ora";

const PREFIX = chalk.hex("#7c5cbf").bold("ctx");

export function heading(text: string): void {
  console.log();
  console.log(`  ${PREFIX}  ${chalk.bold(text)}`);
  console.log();
}

export function info(text: string): void {
  console.log(`  ${chalk.dim("│")}  ${text}`);
}

export function success(text: string): void {
  console.log(`  ${chalk.green("✔")}  ${text}`);
}

export function warn(text: string): void {
  console.log(`  ${chalk.yellow("⚠")}  ${chalk.yellow(text)}`);
}

export function error(text: string): void {
  console.log(`  ${chalk.red("✖")}  ${chalk.red(text)}`);
}

export function blank(): void {
  console.log();
}

export function spinner(text: string): Ora {
  return ora({
    text,
    prefixText: " ",
    color: "magenta",
  }).start();
}

export function fileEntry(filePath: string, tags: string[]): void {
  const tagStr = tags.map((t) => chalk.hex("#7c5cbf")(t)).join(chalk.dim(", "));
  console.log(`  ${chalk.dim("│")}  ${chalk.white(filePath)}  ${chalk.dim("→")}  ${tagStr}`);
}

export function summary(fileCount: number, tokenEstimate: number, outputPath: string): void {
  console.log();
  console.log(`  ${chalk.dim("┌─────────────────────────────────────────")}`);
  console.log(`  ${chalk.dim("│")}  ${chalk.bold("Files included")}   ${chalk.cyan(String(fileCount))}`);
  console.log(`  ${chalk.dim("│")}  ${chalk.bold("Token estimate")}   ${chalk.cyan(`~${tokenEstimate.toLocaleString()}`)}`);
  console.log(`  ${chalk.dim("│")}  ${chalk.bold("Output")}           ${chalk.green(outputPath)}`);
  console.log(`  ${chalk.dim("└─────────────────────────────────────────")}`);
  console.log();
}

export function hint(text: string): void {
  console.log(`  ${chalk.dim(text)}`);
}
