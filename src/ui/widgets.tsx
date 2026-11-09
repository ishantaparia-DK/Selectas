import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, View } from 'react-native';
import { BORDER, colors } from '../theme';
import { SERVICES } from '../lib/links';
import { BUCKETS } from '../lib/rating';
import { noteTags } from '../lib/templates';
import { Bucket, Profile, Song, SongNote } from '../types';
import { Tag } from './Chip';
import { Txt } from './Txt';

export function Avatar({ friend, size = 48 }: { friend: Profile; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: friend.color,
        borderWidth: BORDER,
        borderColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{friend.emoji}</Txt>
    </View>
  );
}

export function Artwork({ song, size = 64 }: { song: Song; size?: number }) {
  const r = size * 0.25;
  const frame = { width: size, height: size, borderRadius: r, borderWidth: BORDER, borderColor: colors.ink };
  if (song.artwork) {
    return <Image source={{ uri: song.artwork }} style={frame} />;
  }
  return (
    <View style={[frame, { overflow: 'hidden' }]}>
      <LinearGradient
        colors={[SERVICES[song.service].color, colors.yellow] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Txt style={{ fontSize: size * 0.45 }}>🎵</Txt>
      </LinearGradient>
    </View>
  );
}

export function ScoreBadge({ score, bucket, size = 56 }: { score: number; bucket: Bucket; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: BUCKETS[bucket].color,
        borderWidth: BORDER,
        borderColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt style={{ fontWeight: '900', fontSize: size * 0.34 }}>{score.toFixed(1)}</Txt>
    </View>
  );
}

export function NoteTags({ note }: { note: SongNote }) {
  const tags = noteTags(note);
  if (tags.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
      {tags.map((t) => (
        <Tag key={t.key} text={t.text} />
      ))}
    </View>
  );
}
