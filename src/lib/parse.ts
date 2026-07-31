function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

export function extractJsonObject(raw: string): string | null {
  const stripped = stripMarkdownFences(raw);
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    // fall through
  }
  const start = stripped.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }
  return null;
}

export function parseJsonResponse<T>(raw: string, fallback: T): T {
  const json = extractJsonObject(raw);
  if (!json) {
    if (raw.trim()) console.warn('[parse] no JSON object in model response');
    return fallback;
  }
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('[parse] JSON.parse failed on extracted object');
    return fallback;
  }
}
