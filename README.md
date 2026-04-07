
<img src="logo.svg" alt="ctx logo" width="240" />

# ctx

Build curated markdown context files from tagged notes. Scans a directory of markdown files with YAML frontmatter, filters by tags, and produces a single merged context file — ideal for feeding to AI assistants.

## Install

```bash
npm install -g @nbaglivo/ctx
```

Or run directly:

```bash
npx @nbaglivo/ctx --tags job-hunting
```

## Usage

```
ctx --context <name>        Resolve tags from a named context in context.json
ctx --tags <a,b,c>          Comma-separated tags to match
ctx --list                  Show all tags found across files
ctx --list-contexts         Show named contexts from context.json
ctx --dir <path>            Notes directory to scan (default: cwd)
ctx --output <path>         Output file (default: .claude-context.md)
```

Flags can be combined:

```bash
ctx --context job-hunting --tags AI
```

When neither `--context` nor `--tags` is given, only files tagged `global` are included.

## context.json

Place a `context.json` in your notes root to define named contexts:

```json
{
  "contexts": {
    "job-hunting": {
      "tags": ["job-hunting", "projects", "search-profile"]
    },
    "writing": {
      "tags": ["writing-style", "philosophy"]
    }
  }
}
```

Each context maps a name to a set of tags. The format is extensible — future fields like `description`, `output`, or `excludeTags` can be added per context.

## Frontmatter format

Your markdown files should have YAML frontmatter with a `tags` field:

```markdown
---
tags: [job-hunting, projects]
title: Selected Contributions
---

Your content here...
```

Tags can be a YAML array (`[a, b]`) or a single string (`tags: global`).

## Development

```bash
npm install
npm run build        # build with tsup
npm run typecheck    # type-check with tsc
npm run dev          # watch mode
```

## Release

Push a version tag to trigger the release workflow:

```bash
npm version patch
git push --follow-tags
```

This runs CI checks and publishes to npm via GitHub Actions (requires `NPM_TOKEN` secret).
