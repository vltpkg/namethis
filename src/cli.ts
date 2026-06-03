#!/usr/bin/env node

import { exists } from "./index.js";
import { synonyms } from "./similar.js";
import type { ExistsResult } from "./index.js";

const useColor = process.env.FORCE_COLOR !== undefined
  ? process.env.FORCE_COLOR !== "0"
  : !process.env.NO_COLOR && !!process.stdout.isTTY;

const esc = (code: string) => (s: string) =>
  useColor ? `\x1b[${code}m${s}\x1b[0m` : s;

const bold = esc("1");
const dim = esc("2");
const red = esc("31");
const green = esc("32");
const yellow = esc("33");
const cyan = esc("36");

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
  console.log();
  const entries = [...resultsMap.entries()];
  for (let i = 0; i < entries.length; i++) {
    const [pkg, result] = entries[i];

    if (i > 0) console.log();

    if (result.errors?.length) {
      console.log(`  ${red("✗")} ${bold(pkg)} ${dim(`— invalid: ${result.errors.join("; ")}`)}`);
      if (result.warnings?.length) {
        console.log(`    ${yellow("⚠")} ${yellow(result.warnings.join("; "))}`);
      }
      continue;
    }

    if (!result.exists || !result.matches?.length) {
      console.log(`  ${green("✓")} ${bold(pkg)} ${dim("— available")}`);
      if (result.warnings?.length) {
        console.log(`    ${yellow("⚠")} ${yellow(result.warnings.join("; "))}`);
      }
      continue;
    }

    const pkgMatch = result.matches.find((m) => m.type === "package");
    const scopeMatch = result.matches.find((m) => m.type === "scope");
    const scopeLabel = scopeMatch ? (scopeMatch.scope ?? "scope") : "scope";

    console.log(`  ${bold(pkg)}`);

    if (pkgMatch) {
      console.log(`    ${red("✗")} ${"package".padEnd(8)}  ${cyan(pkgMatch.url)}`);
    } else {
      console.log(`    ${green("✓")} ${"package".padEnd(8)}  ${dim("— available")}`);
    }

    if (scopeMatch) {
      console.log(`    ${red("✗")} ${scopeLabel.padEnd(8)}  ${cyan(scopeMatch.url)}`);
    } else {
      console.log(`    ${green("✓")} ${"scope".padEnd(8)}  ${dim("— available")}`);
    }

    if (result.warnings?.length) {
      console.log(`    ${yellow("⚠")} ${yellow(result.warnings.join("; "))}`);
    }

  }
  console.log();
}

process.exit(allExist ? 0 : 1);
