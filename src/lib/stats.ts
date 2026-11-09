import { Delivery } from '../types';
import { dayKey, previousDayKey } from './dates';

/** A song counts as approved when the friend put it in the Obsessed bucket. */
export function isApproved(d: Delivery): boolean {
  return d.rating?.bucket === 'love';
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  earned: boolean;
}

export interface Stats {
  sent: number;
  rated: number;
  approved: number;
  hitRate: number;
  avgScore: number;
  currentStreak: number;
  bestStreak: number;
  dailyStreak: number;
  badges: Badge[];
  byFriend: Array<{ friendId: string; sent: number; approved: number }>;
}

export function computeStats(deliveries: Delivery[], meId: string, now: number = Date.now()): Stats {
  const sent = deliveries.filter((d) => d.fromId === meId).sort((a, b) => a.sentAt - b.sentAt);
  const rated = sent.filter((d) => d.rating);
  const approved = rated.filter(isApproved);

  // Streak of approved sends in a row. Songs still waiting for a verdict are skipped.
  let current = 0;
  let best = 0;
  for (const d of rated) {
    if (isApproved(d)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  // Consecutive days with a send, counting back from today (or yesterday if today is still open).
  const days = new Set(sent.map((d) => d.sentDay));
  let cursor = dayKey(now);
  if (!days.has(cursor)) cursor = previousDayKey(cursor);
  let dailyStreak = 0;
  while (days.has(cursor)) {
    dailyStreak += 1;
    cursor = previousDayKey(cursor);
  }

  const scores = rated.map((d) => d.rating!.score);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const hitRate = rated.length ? approved.length / rated.length : 0;

  const friendMap = new Map<string, { sent: number; approved: number }>();
  for (const d of rated) {
    const row = friendMap.get(d.toId) ?? { sent: 0, approved: 0 };
    row.sent += 1;
    if (isApproved(d)) row.approved += 1;
    friendMap.set(d.toId, row);
  }
  const byFriend = Array.from(friendMap.entries())
    .map(([friendId, v]) => ({ friendId, ...v }))
    .sort((a, b) => b.approved / b.sent - a.approved / a.sent);

  const badges: Badge[] = [
    { id: 'first', label: 'First Hit', emoji: '🎯', desc: 'Get one song approved', earned: approved.length >= 1 },
    { id: 'hot', label: 'Hot Hand', emoji: '🔥', desc: '3 approved in a row', earned: best >= 3 },
    { id: 'fire', label: 'On Fire', emoji: '☄️', desc: '5 approved in a row', earned: best >= 5 },
    { id: 'rookie', label: 'DJ Rookie', emoji: '🎧', desc: 'Send 10 songs', earned: sent.length >= 10 },
    {
      id: 'bold',
      label: 'Bold Choice',
      emoji: '🫡',
      desc: 'Send a song that gets a Not for me',
      earned: rated.some((d) => d.rating!.bucket === 'nope'),
    },
    {
      id: 'crowd',
      label: 'Crowd Pleaser',
      emoji: '🎪',
      desc: '80%+ hit rate over 5 rated songs',
      earned: rated.length >= 5 && hitRate >= 0.8,
    },
    {
      id: 'ten',
      label: 'Perfect 10',
      emoji: '💎',
      desc: 'Land a 9.5 or higher',
      earned: rated.some((d) => d.rating!.score >= 9.5),
    },
    { id: 'daily', label: 'Daily Devotee', emoji: '📆', desc: 'Send 7 days in a row', earned: dailyStreak >= 7 },
  ];

  return {
    sent: sent.length,
    rated: rated.length,
    approved: approved.length,
    hitRate,
    avgScore,
    currentStreak: current,
    bestStreak: best,
    dailyStreak,
    badges,
    byFriend,
  };
}
