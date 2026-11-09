import { colors } from '../theme';
import { Bucket, Ranking } from '../types';

/**
 * Beli-style scoring. The recipient first picks a bucket, then answers
 * "do you like this more or less than X?" a few times. A binary search
 * finds the song's position in their personal ranking, and the score is
 * derived from that position inside the bucket's score range.
 */
export const BUCKETS: Record<
  Bucket,
  { label: string; emoji: string; lo: number; hi: number; color: string; blurb: string }
> = {
  love: { label: 'Obsessed', emoji: '😍', lo: 6.7, hi: 10, color: colors.mint, blurb: 'Instant replay' },
  fine: { label: 'It is fine', emoji: '🙂', lo: 3.4, hi: 6.6, color: colors.yellow, blurb: 'Pleasant, forgettable' },
  nope: { label: 'Not for me', emoji: '🙉', lo: 0, hi: 3.3, color: colors.pink, blurb: 'Skip, skip, skip' },
};

export const BUCKET_ORDER: Bucket[] = ['love', 'fine', 'nope'];

export const EMPTY_RANKING: Ranking = { love: [], fine: [], nope: [] };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function scoreAt(bucket: Bucket, index: number, size: number): number {
  const { lo, hi } = BUCKETS[bucket];
  const slot = (index + 0.5) / Math.max(size, 1);
  return round1(hi - slot * (hi - lo));
}

export function scoreFor(ranking: Ranking, id: string): number | undefined {
  for (const bucket of BUCKET_ORDER) {
    const index = ranking[bucket].indexOf(id);
    if (index >= 0) return scoreAt(bucket, index, ranking[bucket].length);
  }
  return undefined;
}

export function insertRanked(ranking: Ranking, bucket: Bucket, id: string, index: number): Ranking {
  const list = ranking[bucket].filter((x) => x !== id);
  const at = Math.min(Math.max(index, 0), list.length);
  const next = [...list.slice(0, at), id, ...list.slice(at)];
  return { ...ranking, [bucket]: next };
}

/** Binary search state. The new song belongs somewhere in [lo, hi]. */
export interface Probe {
  lo: number;
  hi: number;
}

export function startProbe(listSize: number): Probe {
  return { lo: 0, hi: listSize };
}

/** Index of the ranked song to compare against, or null when the position is settled. */
export function probeTarget(p: Probe): number | null {
  if (p.lo >= p.hi) return null;
  return Math.floor((p.lo + p.hi) / 2);
}

export type ProbeAnswer = 'more' | 'less' | 'same';

export function answerProbe(p: Probe, answer: ProbeAnswer): Probe {
  const mid = Math.floor((p.lo + p.hi) / 2);
  if (answer === 'more') return { lo: p.lo, hi: mid };
  if (answer === 'less') return { lo: mid + 1, hi: p.hi };
  return { lo: mid + 1, hi: mid + 1 };
}

/** Rough number of comparisons left, for the progress hint. */
export function comparisonsLeft(p: Probe): number {
  const span = p.hi - p.lo;
  return span <= 0 ? 0 : Math.ceil(Math.log2(span + 1));
}
