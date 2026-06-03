const DATAMUSE_API = "https://api.datamuse.com/words";
const API_MAX_RESULTS = 1000;
const API_DEFAULT_RESULTS = 100;

function splitName(name: string): { scope: string | null; parts: string[] } {
  let scope: string | null = null;
  let base = name;

  if (base.startsWith("@")) {
    const slashIdx = base.indexOf("/");
    if (slashIdx !== -1) {
      scope = base.slice(0, slashIdx);
      base = base.slice(slashIdx + 1);
    }
  }

  const parts = base.split(/[-_]+/).filter(Boolean);
  return { scope, parts };
}

function detectSeparator(name: string): string {
  if (name.includes("_")) return "_";
  return "-";
}

async function fetchSynonyms(word: string, max: number): Promise<string[]> {
  const clamped = Math.min(Math.max(1, max), API_MAX_RESULTS);
  try {
    const res = await fetch(`${DATAMUSE_API}?rel_syn=${encodeURIComponent(word)}&max=${clamped}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { word: string }[];
    return data
      .map((d) => d.word)
      .filter((w) => /^[a-z]+$/.test(w));
  } catch {
    return [];
  }
}

export interface SimilarOptions {
  /** Maximum number of name variations to return (default: 10, max: 1000) */
  max?: number;
  /** Number of synonym candidates to fetch per word part from the API (default: 10, max: 1000) */
  perWord?: number;
}

export async function synonyms(
  name: string,
  options: SimilarOptions = {},
): Promise<string[]> {
  const max = Math.min(Math.max(1, options.max ?? 10), API_MAX_RESULTS);
  const perWord = Math.min(Math.max(1, options.perWord ?? 10), API_MAX_RESULTS);
  const { scope, parts } = splitName(name);
  const sep = detectSeparator(name);

  if (parts.length === 0) return [];

  const synonymsByPart = await Promise.all(
    parts.map((part) => fetchSynonyms(part, perWord)),
  );

  const candidates = new Set<string>();

  for (let i = 0; i < parts.length; i++) {
    for (const syn of synonymsByPart[i]) {
      const variant = [...parts];
      variant[i] = syn;
      const joined = variant.join(sep);
      const full = scope ? `${scope}/${joined}` : joined;
      if (full !== name) candidates.add(full);
      if (candidates.size >= max) break;
    }
    if (candidates.size >= max) break;
  }

  return [...candidates].slice(0, max);
}
