#!/usr/bin/env node

import { exists } from "./index.js";
import { synonyms } from "./similar.js";
import type { ExistsResult } from "./index.js";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: namethis <package-name> [...package-names]

Check if one or more packages exist on the npm registry.

Options:
  --registry <url>   Use a custom registry (default: https://registry.npmjs.org)
  --similar          Also check synonym-based variations of each name
  --view <format>    Output format: "json" for structured JSON (default: human-readable)
  -h, --help         Show this help message

Examples:
  namethis react
  namethis @scope/pkg my-package
  namethis fast-logger --similar
  namethis react --view=json`);
  process.exit(0);
}

function parseFlag(flag: string): string | undefined {
  const eqIdx = args.indexOf(`--${flag}`);
  if (eqIdx !== -1 && args[eqIdx + 1] && !args[eqIdx + 1].startsWith("--")) {
    const val = args[eqIdx + 1];
    args.splice(eqIdx, 2);
    return val;
  }
  const eqMatch = args.find((a) => a.startsWith(`--${flag}=`));
  if (eqMatch) {
    args.splice(args.indexOf(eqMatch), 1);
    return eqMatch.split("=")[1];
  }
  return undefined;
}

const view = parseFlag("view");
const registry = parseFlag("registry");
const similarMode = args.includes("--similar");

const packages = args.filter((a) => !a.startsWith("--"));

if (packages.length === 0) {
  console.error("Error: no package names provided");
  process.exit(1);
}

const resultsMap = await exists(packages, { registry, detailed: true });

if (similarMode) {
  const similarNames: string[] = [];
  for (const pkg of packages) {
    const names = await synonyms(pkg);
    similarNames.push(...names);
  }

  if (similarNames.length > 0) {
    const similarResults = await exists(similarNames, { registry, detailed: true });
    for (const [name, result] of similarResults) {
      resultsMap.set(name, result);
    }
  }
}

const allExist = [...resultsMap.values()].every((r) => r.exists);

if (view === "json") {
  const out: Record<string, ExistsResult> = Object.fromEntries(resultsMap);
  console.log(JSON.stringify(out, null, 2));
} else {
  for (const [pkg, result] of resultsMap) {
    if (result.errors?.length) {
      let line = `${pkg}: invalid name (${result.errors.join("; ")})`;
      if (result.warnings?.length) {
        line += ` [warning: ${result.warnings.join("; ")}]`;
      }
      console.log(line);
      continue;
    }

    if (!result.exists || !result.matches?.length) {
      let line = `${pkg}: not found`;
      if (result.warnings?.length) {
        line += ` [warning: ${result.warnings.join("; ")}]`;
      }
      console.log(line);
      continue;
    }

    for (const match of result.matches) {
      const label = match.type === "scope"
        ? `scope: ${match.scope}`
        : match.type;
      console.log(`${pkg}: exists (${label}) ${match.url}`);
    }

    if (result.warnings?.length) {
      console.log(`${pkg}: [warning: ${result.warnings.join("; ")}]`);
    }
  }
}

process.exit(allExist ? 0 : 1);
