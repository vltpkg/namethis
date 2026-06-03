# findmy

Check whether a package exists on the npm registry.

## Install

```bash
vlt install findmy
```

## Usage

### As a module

```ts
import exists from "findmy";

// returns a boolean by default — easy to use in conditionals
if (await exists("react")) {
  console.log("react is taken");
}

await exists("nonexistent-pkg-abc123"); // false
await exists("@my-org/unknown-pkg"); // true (org exists)

// multiple packages — returns true only if ALL exist
await exists(["react", "express"]); // true
await exists(["react", "fake-pkg"]); // false

// pass { detailed: true } to get the full result object
const info = await exists("react", { detailed: true });
// { exists: true, type: "package", url: "https://www.npmjs.com/package/react" }

const scopeInfo = await exists("@my-org/pkg", { detailed: true });
// { exists: true, type: "scope", scope: "org", url: "https://www.npmjs.com/org/my-org" }

// detailed mode with arrays — returns Map<string, ExistsResult>
const detailed = await exists(["react", "fake"], { detailed: true });

// custom registry
await exists("my-pkg", { registry: "https://registry.internal.co" });

// generate synonym-based name variations
import { synonyms } from "findmy";

const names = await synonyms("fast-logger");
// ["quick-logger", "rapid-logger", "speedy-logger", ...]

// check which similar names are taken
const taken = await exists(names);
```

### As a CLI

Run directly without installing:

```bash
vlx findmy react
# react: exists (package) https://www.npmjs.com/package/react

vlx findmy @scope/pkg fake-package
# @scope/pkg: exists (scope: org) https://www.npmjs.com/org/scope
# fake-package: not found
```

JSON output with `--view=json`:

```bash
vlx findmy react express --view=json
# {
#   "react": { "exists": true, "type": "package", "url": "..." },
#   "express": { "exists": true, "type": "package", "url": "..." }
# }
```

Check similar/synonym names:

```bash
vlx findmy fast-logger --similar
# fast-logger: exists (package) https://www.npmjs.com/package/fast-logger
# quick-logger: not found
# rapid-logger: not found
# speedy-logger: not found
# ...
```

#### CLI Options

```
Usage: findmy <package-name> [...package-names]

Options:
  --registry <url>   Use a custom registry (default: https://registry.npmjs.org)
  --similar          Also check synonym-based variations of each name
  --view <format>    Output format: "json" for structured JSON (default: human-readable)
  -h, --help         Show this help message
```

Exit codes:
- `0` — all queried packages exist
- `1` — one or more packages do not exist

## Important: Registry-Side Restrictions

Even if `exists()` reports that a name is available, the registry may still reject a publish attempt. npm applies additional server-side validation beyond what can be checked locally, including:

- **Name squatting policies** — names that were previously published (even if later unpublished) may be reserved.
- **Trademark and moniker rules** — names too similar to existing popular packages can be blocked.
- **Spam and abuse filters** — automated systems may flag certain names.

This library validates names against [npm's naming rules](https://github.com/npm/validate-npm-package-name) and checks registry existence, but a successful check is not a guarantee that you will be able to publish under that name.

## API

### `exists(name: string, options?): Promise<boolean>`

Returns `true` if the package or its scope exists on the registry. Names that are invalid per npm's naming rules return `false` immediately without a network request.

### `exists(name: string, { detailed: true }): Promise<ExistsResult>`

Returns a detailed result object with type, scope kind, URL, and validation info.

### `exists(names: string[], options?): Promise<boolean>`

Checks multiple packages concurrently. Returns `true` only if all exist.

### `exists(names: string[], { detailed: true }): Promise<Map<string, ExistsResult>>`

Checks multiple packages concurrently. Returns a `Map` of detailed results.

### `validate(name: string): ValidationResult`

Validates a package name against [npm's naming rules](https://github.com/npm/validate-npm-package-name) without making any network requests.

```ts
import { validate } from "findmy";

validate("my-package");
// { validForNewPackages: true, validForOldPackages: true }

validate("My Package!");
// {
//   validForNewPackages: false,
//   validForOldPackages: false,
//   errors: ["name can only contain URL-friendly characters"],
//   warnings: ["name can no longer contain capital letters", "name can no longer contain special characters (\"~'!()*\")"]
// }
```

### `ExistsResult`

```ts
interface ExistsResult {
  exists: boolean;
  type?: "package" | "scope";
  scope?: "user" | "org";
  url?: string;
  validForNewPackages?: boolean;
  validForOldPackages?: boolean;
  warnings?: string[];
  errors?: string[];
}
```

| Field | Value | Meaning |
|-------|-------|---------|
| `type` | `"package"` | A published package was found on the registry |
| `type` | `"scope"` | The package's scope exists (even if the specific package doesn't) |
| `type` | `undefined` | The package does not exist |
| `scope` | `"user"` | The scope belongs to an individual user |
| `scope` | `"org"` | The scope belongs to an organization |
| `scope` | `undefined` | Not a scope match (either a direct package or not found) |
| `url` | `string` | Link to the package or scope on npmjs.com |
| `validForNewPackages` | `boolean` | Name meets all current npm naming rules |
| `validForOldPackages` | `boolean` | Name meets legacy npm naming rules (less strict) |
| `warnings` | `string[]` | Naming issues that prevent new package registration |
| `errors` | `string[]` | Naming issues that make the name fundamentally invalid |

### `ValidationResult`

```ts
interface ValidationResult {
  validForNewPackages: boolean;
  validForOldPackages: boolean;
  warnings?: string[];
  errors?: string[];
}
```

### `synonyms(name: string, options?: SimilarOptions): Promise<string[]>`

Generates synonym-based variations of a package name using the [Datamuse API](https://www.datamuse.com/api/). Splits the name on `-` or `_`, finds synonyms for each word part, and recombines them.

#### ExistsOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `registry` | `string` | `https://registry.npmjs.org` | Registry URL to check against |
| `detailed` | `boolean` | `false` | Return full `ExistsResult` objects instead of booleans |

#### SimilarOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max` | `number` | `10` | Maximum number of name variations to return (cap: 1000) |
| `perWord` | `number` | `10` | Synonym candidates to fetch per word part from the API (cap: 1000) |

## Development

This project uses [vlt](https://docs.vlt.sh) as its package manager.

```bash
vlt install        # install dependencies
vlt run build      # compile typescript
vlt run test       # run tests
```

## License

MIT
