import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Linking, View } from 'react-native';
import { SERVICES } from '../../src/lib/links';
import { BUCKETS, scoreFor } from '../../src/lib/rating';
import { formatNote } from '../../src/lib/templates';
import { senderLine, verdictFor } from '../../src/lib/whimsy';
import { useStore } from '../../src/store';
import { colors, radius } from '../../src/theme';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide, Pulse } from '../../src/ui/FadeSlide';
import { BackButton, Screen } from '../../src/ui/Screen';
import { Txt } from '../../src/ui/Txt';
import { Artwork, Avatar, NoteTags, ScoreBadge } from '../../src/ui/widgets';

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, profileById, meId } = useStore();
  const d = state.deliveries.find((x) => x.id === id);

  if (!d) {
    return (
      <Screen tabBar={false}>
        <BackButton />
        <Txt v="title">Song not found</Txt>
      </Screen>
    );
  }

  const mine = d.fromId === meId;
  const other = profileById(mine ? d.toId : d.fromId);
  const svc = SERVICES[d.song.service];
  const score = mine ? d.rating?.score : scoreFor(state.ranking, d.id) ?? d.rating?.score;
  const verdict = d.rating && score !== undefined ? verdictFor(d.rating.bucket, score) : undefined;

  return (
    <Screen tabBar={false}>
      <BackButton />

      <FadeSlide>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Artwork song={d.song} size={160} />
          <Txt v="display" style={{ marginTop: 16, textAlign: 'center', fontSize: 28 }}>
            {d.song.title}
          </Txt>
          <Txt v="bold" color={colors.inkSoft}>
            {d.song.artist}
          </Txt>
        </View>
      </FadeSlide>

      <FadeSlide delay={100}>
        <Button
          label={`Open in ${svc.name}`}
          color={svc.color}
          onPress={() => Linking.openURL(d.song.url).catch(() => {})}
        />
      </FadeSlide>

      <FadeSlide delay={200} style={{ marginTop: 20 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Avatar friend={other} size={36} />
            <Txt v="bold" style={{ marginLeft: 10 }}>
              {mine ? `You told ${other.name}` : `${other.name} says`}
            </Txt>
          </View>
          <View
            style={{
              backgroundColor: colors.yellow,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: colors.ink,
              padding: 12,
            }}
          >
            <Txt v="bold">{formatNote(d.note)}</Txt>
          </View>
          <NoteTags note={d.note} />
        </Card>
      </FadeSlide>

      <FadeSlide delay={300} style={{ marginTop: 20 }}>
        {d.rating && verdict && score !== undefined ? (
          <Card color={verdict.color} style={{ alignItems: 'center', paddingVertical: 22 }}>
            <Txt style={{ fontSize: 48, lineHeight: 62 }}>{verdict.emoji}</Txt>
            <Txt v="display" style={{ fontSize: 26, textAlign: 'center' }}>
              {verdict.title}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <ScoreBadge score={score} bucket={d.rating.bucket} size={64} />
              {d.rating.reaction ? <Txt style={{ fontSize: 40, marginLeft: 12 }}>{d.rating.reaction}</Txt> : null}
            </View>
            <Txt v="bold" style={{ marginTop: 12, textAlign: 'center' }}>
              {mine ? senderLine(verdict, other.name, d.id) : verdict.blurb}
            </Txt>
            <Txt v="caption" color={colors.ink} style={{ marginTop: 4 }}>
              {BUCKETS[d.rating.bucket].emoji} {BUCKETS[d.rating.bucket].label}
            </Txt>
          </Card>
        ) : mine ? (
          <Card color="#FFFDF5" style={{ alignItems: 'center', paddingVertical: 22 }}>
            <Pulse>
              <Txt style={{ fontSize: 44 }}>⏳</Txt>
            </Pulse>
            <Txt v="title" style={{ marginTop: 6 }}>
              Waiting on {other.name}
            </Txt>
            <Txt v="caption" style={{ textAlign: 'center', marginTop: 2 }}>
              The verdict will pop up the moment they rate it.
            </Txt>
          </Card>
        ) : (
          <View>
            <Txt v="caption" style={{ textAlign: 'center', marginBottom: 12 }}>
              Give it a listen, then tell {other.name} how it landed.
            </Txt>
            <Button label="Rate this song" color={colors.pink} onPress={() => router.push(`/rate/${d.id}`)} />
          </View>
        )}
      </FadeSlide>
    </Screen>
  );
}
