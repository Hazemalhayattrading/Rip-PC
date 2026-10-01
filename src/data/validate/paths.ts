/** A value at a dot path inside a record. Array indices are numeric string segments. */
export interface Leaf {
  path: readonly string[];
  value: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Every leaf value of a record: primitives, nulls, and empty arrays or objects (an empty list is a
 * claim too, e.g. "this board shares no lanes", so it needs a source like any other value).
 */
export function collectLeaves(value: unknown, prefix: readonly string[] = []): Leaf[] {
  const out: Leaf[] = [];
  const walk = (v: unknown, path: readonly string[]): void => {
    if (Array.isArray(v)) {
      if (v.length === 0) out.push({ path, value: v });
      v.forEach((item: unknown, i) => {
        walk(item, [...path, String(i)]);
      });
      return;
    }
    if (isPlainObject(v)) {
      const keys = Object.keys(v);
      if (keys.length === 0) out.push({ path, value: v });
      for (const key of keys) walk(v[key], [...path, key]);
      return;
    }
    out.push({ path, value: v });
  };
  walk(value, prefix);
  return out;
}

export function splitPath(path: string): string[] {
  return path.split('.');
}

export function joinPath(path: readonly string[]): string {
  return path.join('.');
}

/**
 * True when `pattern` covers `path`: the pattern's segments are a prefix of the path's, and `*`
 * matches any array index.
 */
export function covers(pattern: readonly string[], path: readonly string[]): boolean {
  if (pattern.length > path.length) return false;
  return pattern.every((seg, i) => {
    const actual = path[i];
    if (actual === undefined) return false;
    return seg === actual || (seg === '*' && /^\d+$/.test(actual));
  });
}

export function coversAny(patterns: readonly (readonly string[])[], path: readonly string[]): boolean {
  return patterns.some((p) => covers(p, path));
}

/** True when `pattern` points at something that exists in the record (a leaf or a branch). */
export function patternExists(pattern: readonly string[], leaves: readonly Leaf[]): boolean {
  return leaves.some((leaf) => covers(pattern, leaf.path));
}
