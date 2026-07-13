/**
 * Podium-only titles — ranks 1–3 each get a distinct title.
 * Ranks 4+ have no title.
 */
const PODIUM_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Champion',
  2: 'Runner-up',
  3: 'Podium finish',
};

/** Title for top-3 only; null for everyone else. */
export function getPodiumTitle(rank: number): string | null {
  if (rank === 1 || rank === 2 || rank === 3) {
    return PODIUM_TITLES[rank];
  }
  return null;
}
