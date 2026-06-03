import { validate } from "./validate.js";
export type { ValidationResult } from "./validate.js";
export { validate } from "./validate.js";

const DEFAULT_REGISTRY = "https://registry.npmjs.org";

export interface ExistsOptions {
  registry?: string;
  detailed?: boolean;
}

export type ExistsType = "package" | "scope";
export type ScopeKind = "user" | "org";

export interface ExistsMatch {
  type: ExistsType;
  scope?: ScopeKind;
  url: string;
}

export interface ExistsResult {
  exists: boolean;
  matches?: ExistsMatch[];
  validForNewPackages?: boolean;
  validForOldPackages?: boolean;
  warnings?: string[];
  errors?: string[];
}

async function isPublic(
  pkg: string,
  registry: string,
): Promise<boolean> {
  const encoded = encodeURIComponent(pkg);
  const res = await fetch(`${registry}/${encoded}/latest`);
  return res.status === 200;
}

async function checkScope(
  pkg: string,
  registry: string,
): Promise<{ exists: boolean; kind?: ScopeKind }> {
  const scopeName = pkg.startsWith("@")
    ? pkg.split("/")[0].replace("@", "")
    : pkg;

  const res = await fetch(`${registry}/-/org/${scopeName}/user`);
  const data = (await res.json()) as Record<string, string>;

  if (data.error) return { exists: false };

  const members = Object.keys(data);
  const isUser = members.length === 1 && members[0] === scopeName;

  return { exists: true, kind: isUser ? "user" : "org" };
}

function npmUrl(pkg: string, type: ExistsType, scopeKind?: ScopeKind): string {
  if (type === "package") {
    return `https://www.npmjs.com/package/${pkg}`;
  }
  const scopeName = pkg.startsWith("@")
    ? pkg.split("/")[0].replace("@", "")
    : pkg;
  if (scopeKind === "user") {
    return `https://www.npmjs.com/~${scopeName}`;
  }
  return `https://www.npmjs.com/org/${scopeName}`;
}

async function checkOne(
  pkg: string,
  registry: string,
): Promise<ExistsResult> {
  const v = validate(pkg);
  const validationFields: Partial<ExistsResult> = {
    validForNewPackages: v.validForNewPackages,
    validForOldPackages: v.validForOldPackages,
    ...(v.warnings && { warnings: v.warnings }),
    ...(v.errors && { errors: v.errors }),
  };

  if (!v.validForOldPackages) {
    return { exists: false, ...validationFields };
  }

  const [pub, scope] = await Promise.all([
    isPublic(pkg, registry),
    checkScope(pkg, registry),
  ]);

  const matches: ExistsMatch[] = [];

  if (pub) {
    matches.push({ type: "package", url: npmUrl(pkg, "package") });
  }

  if (scope.exists) {
    matches.push({
      type: "scope",
      scope: scope.kind,
      url: npmUrl(pkg, "scope", scope.kind),
    });
  }

  return {
    exists: matches.length > 0,
    ...(matches.length > 0 && { matches }),
    ...validationFields,
  };
}

// Single package, default (boolean)
export async function exists(
  pkg: string,
  options?: ExistsOptions & { detailed?: false },
): Promise<boolean>;
// Single package, detailed
export async function exists(
  pkg: string,
  options: ExistsOptions & { detailed: true },
): Promise<ExistsResult>;
// Array, default (boolean)
export async function exists(
  pkg: string[],
  options?: ExistsOptions & { detailed?: false },
): Promise<boolean>;
// Array, detailed
export async function exists(
  pkg: string[],
  options: ExistsOptions & { detailed: true },
): Promise<Map<string, ExistsResult>>;
// Implementation
export async function exists(
  pkg: string | string[],
  options: ExistsOptions = {},
): Promise<boolean | ExistsResult | Map<string, ExistsResult>> {
  const registry = options.registry ?? DEFAULT_REGISTRY;
  const detailed = options.detailed ?? false;

  if (Array.isArray(pkg)) {
    const results = await Promise.all(
      pkg.map(async (name) => [name, await checkOne(name, registry)] as const),
    );
    if (detailed) {
      return new Map(results);
    }
    return results.every(([, r]) => r.exists);
  }

  const result = await checkOne(pkg, registry);
  return detailed ? result : result.exists;
}

export { synonyms } from "./similar.js";
export type { SimilarOptions } from "./similar.js";

export default exists;
