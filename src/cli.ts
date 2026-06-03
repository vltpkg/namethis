#!/usr/bin/env node

import { exists } from "./index.js";
import { synonyms } from "./similar.js";
import type { ExistsResult } from "./index.js";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: findmy <package-name> [...package-names]

Check if one or more packages exist on the npm registry.

Options:
  --registry <url>   Use a custom registry (default: https://registry.npmjs.org)
  --similar          Also check synonym-based variations of each name
  --view <format>    Output format: "json" for structured JSON (default: human-readable)
  -h, --help         Show this help message

Examples:
  findmy react
  findmy @scope/pkg my-package
  findmy fast-logger --similar
  findmy react --view=json`);
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
    let status: string;
    if (result.errors?.length) {
      status = `invalid name (${result.errors.join("; ")})`;
    } else if (!result.exists) {
      status = "not found";
    } else if (result.type === "scope") {
      status = `exists (scope: ${result.scope}) ${result.url}`;
    } else {
      status = `exists (${result.type}) ${result.url}`;
    }

    if (result.warnings?.length) {
      status += ` [warning: ${result.warnings.join("; ")}]`;
    }

    console.log(`${pkg}: ${status}`);
  }
}

process.exit(allExist ? 0 : 1);
