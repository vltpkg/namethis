import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exists, synonyms, validate } from "../src/index.js";

describe("pkg-exists", () => {
  it("returns false for a non-existent package", async () => {
    assert.equal(await exists("darcyclarke-non-existant-package"), false);
  });

  it("returns true for a scoped org that exists", async () => {
    assert.equal(await exists("@vltpkg/non-existant-package"), true);
  });

  it("returns true for a public package", async () => {
    assert.equal(await exists("darcy"), true);
  });

  it("returns true for an array where all packages exist", async () => {
    assert.equal(await exists(["react", "express"]), true);
  });

  it("returns false for an array where any package does not exist", async () => {
    assert.equal(await exists(["react", "darcyclarke-non-existant-package"]), false);
  });

  it("returns ExistsResult when detailed: true", async () => {
    const result = await exists("react", { detailed: true });
    assert.equal(result.exists, true);
    assert.ok(result.matches?.some((m) => m.type === "package"));
    assert.ok(result.matches?.some((m) => m.url === "https://www.npmjs.com/package/react"));
  });

  it("returns scope detail when detailed: true", async () => {
    const result = await exists("@darcyclarke/fake", { detailed: true });
    assert.equal(result.exists, true);
    const scopeMatch = result.matches?.find((m) => m.type === "scope");
    assert.ok(scopeMatch);
    assert.equal(scopeMatch?.scope, "user");
    assert.ok(scopeMatch?.url.includes("~darcyclarke"));
  });

  it("returns both package and scope when both exist", async () => {
    const result = await exists("darcyclarke", { detailed: true });
    assert.equal(result.exists, true);
    assert.ok(result.matches);
    assert.ok(result.matches.some((m) => m.type === "package"));
    assert.ok(result.matches.some((m) => m.type === "scope" && m.scope === "user"));
  });

  it("returns detailed Map for array with detailed: true", async () => {
    const results = await exists(["react"], { detailed: true });
    const r = results.get("react");
    assert.equal(r?.exists, true);
    assert.ok(r?.matches?.some((m) => m.type === "package"));
    assert.ok(r?.matches?.some((m) => m.url));
  });
});

describe("validate", () => {
  it("accepts a valid package name", () => {
    const result = validate("my-package");
    assert.equal(result.validForNewPackages, true);
    assert.equal(result.validForOldPackages, true);
    assert.equal(result.errors, undefined);
    assert.equal(result.warnings, undefined);
  });

  it("accepts a valid scoped name", () => {
    const result = validate("@scope/my-package");
    assert.equal(result.validForNewPackages, true);
    assert.equal(result.validForOldPackages, true);
  });

  it("rejects empty string", () => {
    const result = validate("");
    assert.equal(result.validForOldPackages, false);
    assert.ok(result.errors?.length);
  });

  it("rejects names starting with a period", () => {
    const result = validate(".hidden");
    assert.equal(result.validForOldPackages, false);
    assert.ok(result.errors?.some((e) => e.includes("period")));
  });

  it("rejects names starting with a hyphen", () => {
    const result = validate("-bad");
    assert.equal(result.validForOldPackages, false);
    assert.ok(result.errors?.some((e) => e.includes("hyphen")));
  });

  it("rejects names with non-URL-safe characters", () => {
    const result = validate("my package");
    assert.equal(result.validForOldPackages, false);
    assert.ok(result.errors?.some((e) => e.includes("URL-friendly")));
  });

  it("warns about uppercase letters", () => {
    const result = validate("MyPackage");
    assert.equal(result.validForNewPackages, false);
    assert.equal(result.validForOldPackages, true);
    assert.ok(result.warnings?.some((w) => w.includes("capital")));
  });

  it("warns about core module names", () => {
    const result = validate("http");
    assert.equal(result.validForNewPackages, false);
    assert.ok(result.warnings?.some((w) => w.includes("core module")));
  });

  it("rejects node_modules", () => {
    const result = validate("node_modules");
    assert.equal(result.validForOldPackages, false);
  });
});

describe("exists + validation", () => {
  it("returns false for an invalid name without hitting the registry", async () => {
    assert.equal(await exists(".invalid-pkg"), false);
  });

  it("includes validation details in detailed mode for invalid names", async () => {
    const result = await exists(".invalid-pkg", { detailed: true });
    assert.equal(result.exists, false);
    assert.equal(result.validForOldPackages, false);
    assert.ok(result.errors?.length);
  });

  it("includes validation fields for valid names in detailed mode", async () => {
    const result = await exists("react", { detailed: true });
    assert.equal(result.validForNewPackages, true);
    assert.equal(result.validForOldPackages, true);
  });
});

describe("synonyms", () => {
  it("generates synonym-based variations of a hyphenated name", async () => {
    const names = await synonyms("fast-logger");
    assert.ok(names.length > 0);
    assert.ok(names.length <= 10);
    assert.ok(names.every((n) => n !== "fast-logger"));
    assert.ok(names.every((n) => n.includes("-")));
  });

  it("respects underscore separators", async () => {
    const names = await synonyms("quick_sort");
    assert.ok(names.length > 0);
    assert.ok(names.every((n) => n.includes("_")));
  });

  it("preserves scope prefix", async () => {
    const names = await synonyms("@scope/fast-runner");
    assert.ok(names.length > 0);
    assert.ok(names.every((n) => n.startsWith("@scope/")));
  });

  it("respects max option", async () => {
    const names = await synonyms("fast-logger", { max: 3 });
    assert.ok(names.length <= 3);
  });
});
