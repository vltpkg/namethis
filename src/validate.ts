// Implements npm's package-name validation heuristics.
// See: https://github.com/npm/validate-npm-package-name

const SCOPED_RE = /^(?:@([^/]+?)\/)?([^/]+?)$/;

const EXCLUDED = ["node_modules", "favicon.ico"];

const BUILTINS = [
  "assert", "buffer", "child_process", "cluster", "console", "constants",
  "crypto", "dgram", "dns", "domain", "events", "fs", "http", "https",
  "module", "net", "os", "path", "punycode", "querystring", "readline",
  "repl", "stream", "string_decoder", "sys", "timers", "tls", "tty",
  "url", "util", "vm", "zlib",
];

export interface ValidationResult {
  validForNewPackages: boolean;
  validForOldPackages: boolean;
  warnings?: string[];
  errors?: string[];
}

export function validate(name: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!name.length) {
    errors.push("name length must be greater than zero");
  }

  if (name.startsWith(".")) {
    errors.push("name cannot start with a period");
  }

  if (name.startsWith("-")) {
    errors.push("name cannot start with a hyphen");
  }

  if (name.startsWith("_")) {
    errors.push("name cannot start with an underscore");
  }

  if (name.trim() !== name) {
    errors.push("name cannot contain leading or trailing spaces");
  }

  for (const excluded of EXCLUDED) {
    if (name.toLowerCase() === excluded) {
      errors.push(`${excluded} is not a valid package name`);
    }
  }

  if (BUILTINS.includes(name.toLowerCase())) {
    warnings.push(`${name} is a core module name`);
  }

  if (name.length > 214) {
    warnings.push("name can no longer contain more than 214 characters");
  }

  if (name.toLowerCase() !== name) {
    warnings.push("name can no longer contain capital letters");
  }

  if (/[~'!()*]/.test(name.split("/").slice(-1)[0])) {
    warnings.push('name can no longer contain special characters ("~\'!()*")');
  }

  if (encodeURIComponent(name) !== name) {
    const match = name.match(SCOPED_RE);
    if (match) {
      const [, user, pkg] = match;

      if (pkg.startsWith(".")) {
        errors.push("name cannot start with a period");
      }

      if (
        encodeURIComponent(user) === user &&
        encodeURIComponent(pkg) === pkg
      ) {
        return done(warnings, errors);
      }
    }

    errors.push("name can only contain URL-friendly characters");
  }

  return done(warnings, errors);
}

function done(warnings: string[], errors: string[]): ValidationResult {
  const result: ValidationResult = {
    validForNewPackages: errors.length === 0 && warnings.length === 0,
    validForOldPackages: errors.length === 0,
  };
  if (warnings.length) result.warnings = warnings;
  if (errors.length) result.errors = errors;
  return result;
}
