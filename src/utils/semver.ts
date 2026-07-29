function parsePart(raw: string | undefined): number {
  const n = parseInt(raw ?? '0', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function parseSemver(version: string): [number, number, number] {
  const parts = String(version ?? '').trim().split('.');
  return [parsePart(parts[0]), parsePart(parts[1]), parsePart(parts[2])];
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function isVersionBelow(installed: string, minimum: string): boolean {
  return compareSemver(installed, minimum) < 0;
}
