import { colors } from '../theme';
import { Bucket } from '../types';
import { hashString } from './dates';
import options from './noteOptions.json';

export const REACTIONS: Array<{ emoji: string; label: string }> = options.reactions;

export type Tone = 'win' | 'approved' | 'meh' | 'flop' | 'disaster';

export interface Verdict {
  tone: Tone;
  title: string;
  emoji: string;
  blurb: string;
  color: string;
  /** Confetti for wins, falling trash for disasters. */
  particles: string[];
  mode: 'burst' | 'rain';
  senderLines: string[];
}

const VERDICTS: Record<Tone, Verdict> = {
  win: {
    tone: 'win',
    title: 'Certified Banger',
    emoji: '🏆',
    blurb: 'Instant classic. Frame this one.',
    color: colors.mint,
    particles: ['🎉', '✨', '🏆', '🔥', '💚'],
    mode: 'burst',
    senderLines: [
      '{name} is already on the second listen.',
      '{name} added it to THE good playlist.',
      'Taste confirmed. {name} will now ask you for recommendations forever.',
    ],
  },
  approved: {
    tone: 'approved',
    title: 'Approved!',
    emoji: '✅',
    blurb: 'Solid pick. The friendship is thriving.',
    color: colors.mint,
    particles: ['🎵', '✨', '👏', '💚'],
    mode: 'burst',
    senderLines: [
      '{name} gave it the stamp of approval.',
      '{name} nodded slowly, which is the highest honor.',
      '{name} says: okay, you get it.',
    ],
  },
  meh: {
    tone: 'meh',
    title: 'Mixed Reviews',
    emoji: '🤷',
    blurb: 'Fine, but not a feeling.',
    color: colors.yellow,
    particles: [],
    mode: 'burst',
    senderLines: [
      '{name} gave it a polite shrug.',
      '{name} listened once and said "huh".',
      'Not a miss, not a hit. {name} is thinking about it.',
    ],
  },
  flop: {
    tone: 'flop',
    title: 'Swing and a Miss',
    emoji: '🙈',
    blurb: 'Bold choice. Brave, even.',
    color: colors.orange,
    particles: ['🙈', '💨', '🫠'],
    mode: 'rain',
    senderLines: [
      '{name} thanks you for thinking of them. Genuinely.',
      '{name} lasted 40 seconds and has questions.',
      'Bold choice! {name} is still your friend. Probably.',
    ],
  },
  disaster: {
    tone: 'disaster',
    title: 'Crimes Against Ears',
    emoji: '🚨',
    blurb: 'This song has been sentenced to The Bin.',
    color: colors.pink,
    particles: ['🗑️', '🚨', '💀', '🙉'],
    mode: 'rain',
    senderLines: [
      '{name} has filed a formal complaint. Your ears were not consulted.',
      '{name} would like to be compensated for the three minutes.',
      'The jury of {name} has reached a verdict. It is not good.',
    ],
  },
};

export function verdictFor(bucket: Bucket, score: number): Verdict {
  if (bucket === 'love') return score >= 9 ? VERDICTS.win : VERDICTS.approved;
  if (bucket === 'fine') return VERDICTS.meh;
  return score >= 1.7 ? VERDICTS.flop : VERDICTS.disaster;
}

export function senderLine(v: Verdict, friendName: string, seed: string): string {
  const line = v.senderLines[hashString(seed) % v.senderLines.length];
  return line.split('{name}').join(friendName);
}
