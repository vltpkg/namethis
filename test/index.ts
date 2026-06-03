import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exists, synonyms } from "../src/index.js";

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
    assert.equal(result.type, "package");
    assert.equal(result.url, "https://www.npmjs.com/package/react");
  });

  it("returns scope detail when detailed: true", async () => {
    const result = await exists("@darcyclarke/fake", { detailed: true });
    assert.equal(result.exists, true);
    assert.equal(result.type, "scope");
    assert.equal(result.scope, "user");
    assert.ok(result.url?.includes("~darcyclarke"));
  });

  it("returns detailed Map for array with detailed: true", async () => {
    const results = await exists(["react"], { detailed: true });
    const r = results.get("react");
    assert.equal(r?.exists, true);
    assert.equal(r?.type, "package");
    assert.ok(r?.url);
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
