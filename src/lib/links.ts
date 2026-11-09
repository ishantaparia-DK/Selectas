import { colors } from '../theme';
import { ServiceId } from '../types';

export const SERVICES: Record<ServiceId, { name: string; color: string; emoji: string }> = {
  spotify: { name: 'Spotify', color: '#1ED760', emoji: '🟢' },
  apple: { name: 'Apple Music', color: '#FF5C7A', emoji: '🍎' },
  youtube: { name: 'YouTube', color: '#FF4B4B', emoji: '▶️' },
  soundcloud: { name: 'SoundCloud', color: colors.orange, emoji: '☁️' },
  tidal: { name: 'Tidal', color: colors.sky, emoji: '🌊' },
  bandcamp: { name: 'Bandcamp', color: '#5AB3C9', emoji: '🎸' },
  deezer: { name: 'Deezer', color: colors.grape, emoji: '🎚️' },
  amazon: { name: 'Amazon Music', color: colors.sky, emoji: '📦' },
};

const HOSTS: Array<{ id: ServiceId; match: RegExp }> = [
  { id: 'spotify', match: /(^|\.)spotify\.(com|link)$/ },
  { id: 'apple', match: /(^|\.)(music|itunes)\.apple\.com$/ },
  { id: 'youtube', match: /(^|\.)(youtube\.com|youtu\.be)$/ },
  { id: 'soundcloud', match: /(^|\.)soundcloud\.com$/ },
  { id: 'tidal', match: /(^|\.)tidal\.com$/ },
  { id: 'bandcamp', match: /(^|\.)bandcamp\.com$/ },
  { id: 'deezer', match: /(^|\.)(deezer\.com|deezer\.page\.link)$/ },
  { id: 'amazon', match: /(^|\.)music\.amazon\.[a-z.]+$/ },
];

export interface ParsedLink {
  url: string;
  service: ServiceId;
}

/** Accepts a pasted link and returns it only if it is from a supported music service. */
export function parseLink(input: string): ParsedLink | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  const m = withScheme.match(/^https?:\/\/([^/?#:]+)/i);
  if (!m) return null;
  const host = m[1].toLowerCase();
  for (const h of HOSTS) {
    if (h.match.test(host)) return { url: withScheme, service: h.id };
  }
  return null;
}

export interface LinkMeta {
  title?: string;
  artist?: string;
  artwork?: string;
}

/**
 * Best-effort autofill from each service's public oEmbed endpoint. No API keys needed.
 * Spotify only returns the track title, so the sender still adds the artist.
 * Failures (offline, CORS on web, unsupported service) are silent and the sender types it in.
 */
export async function fetchMeta(url: string, service: ServiceId): Promise<LinkMeta | null> {
  const enc = encodeURIComponent(url);
  let endpoint: string | null = null;
  if (service === 'spotify') endpoint = `https://open.spotify.com/oembed?url=${enc}`;
  if (service === 'youtube') endpoint = `https://www.youtube.com/oembed?url=${enc}&format=json`;
  if (service === 'soundcloud') endpoint = `https://soundcloud.com/oembed?format=json&url=${enc}`;
  if (!endpoint) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      title: typeof json.title === 'string' ? json.title : undefined,
      artist: service === 'spotify' ? undefined : (json.author_name as string | undefined),
      artwork: typeof json.thumbnail_url === 'string' ? json.thumbnail_url : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
