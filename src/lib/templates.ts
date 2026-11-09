import { SongNote } from '../types';
import options from './noteOptions.json';

/**
 * There is deliberately no free text box. A sender can only say things from this file,
 * so every message stays about the song.
 */
export type Tag = { id: string; label: string; emoji: string };

export interface Template {
  id: string;
  label: string;
  prompt: string;
  options: string[];
}

export const TEMPLATES: Template[] = options.templates;

export const MOODS: Tag[] = options.moods;
export const BEST_FOR: Tag[] = options.bestFor;
export const FOUND_VIA: Tag[] = options.foundVia;

export const BPM_PRESETS = [
  { label: 'Slow jam', bpm: 70 },
  { label: 'Hip hop', bpm: 90 },
  { label: 'House', bpm: 124 },
  { label: 'Techno', bpm: 135 },
  { label: 'D&B', bpm: 174 },
];

export function tempoLabel(bpm: number): string {
  if (bpm < 80) return 'Slow burn';
  if (bpm < 100) return 'Head nod';
  if (bpm < 120) return 'Groove';
  if (bpm < 135) return 'Dance floor';
  if (bpm < 160) return 'Peak hour';
  return 'Hyperdrive';
}

export function formatNote(n: SongNote): string {
  const t = TEMPLATES.find((x) => x.id === n.templateId);
  return `${t ? t.prompt : ''} ${n.option}`.trim();
}

function find(list: Tag[], id?: string): Tag | undefined {
  return id ? list.find((x) => x.id === id) : undefined;
}

/** Flavor chips shown alongside the sentence: mood, BPM, best for, found via. */
export function noteTags(n: SongNote): Array<{ key: string; text: string }> {
  const out: Array<{ key: string; text: string }> = [];
  const mood = find(MOODS, n.mood);
  if (mood) out.push({ key: 'mood', text: `${mood.emoji} ${mood.label}` });
  if (n.bpm) out.push({ key: 'bpm', text: `🥁 ${n.bpm} BPM · ${tempoLabel(n.bpm)}` });
  const best = find(BEST_FOR, n.bestFor);
  if (best) out.push({ key: 'best', text: `${best.emoji} Best for: ${best.label}` });
  const via = find(FOUND_VIA, n.foundVia);
  if (via) out.push({ key: 'via', text: `${via.emoji} Found via: ${via.label}` });
  return out;
}
