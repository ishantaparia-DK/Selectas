import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, View } from 'react-native';
import { timeAgo } from '../../src/lib/dates';
import { scoreFor } from '../../src/lib/rating';
import { formatNote } from '../../src/lib/templates';
import { verdictFor } from '../../src/lib/whimsy';
import { useStore } from '../../src/store';
import { BORDER, colors, radius } from '../../src/theme';
import { Bounce } from '../../src/ui/Bounce';
import { Card } from '../../src/ui/Card';
import { FadeSlide, Pulse } from '../../src/ui/FadeSlide';
import { Screen } from '../../src/ui/Screen';
import { Txt } from '../../src/ui/Txt';
import { Artwork, Avatar, ScoreBadge } from '../../src/ui/widgets';
import { Delivery } from '../../src/types';

type Mode = 'in' | 'out';

function Segmented({ mode, onChange, unrated }: { mode: Mode; onChange: (m: Mode) => void; unrated: number }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: mode === 'in' ? 0 : 1, useNativeDriver: true, speed: 16, bounciness: 8 }).start();
  }, [mode, x]);
  const half = w / 2;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderWidth: BORDER,
        borderColor: colors.ink,
        borderRadius: radius.pill,
        padding: 4,
        marginBottom: 20,
      }}
    >
      {w > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: half - 4,
            bottom: 4,
            borderRadius: radius.pill,
            backgroundColor: mode === 'in' ? colors.sky : colors.pink,
            borderWidth: 2,
            borderColor: colors.ink,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, half - 4] }) }],
          }}
        />
      ) : null}
      <Bounce wrapStyle={{ flex: 1 }} onPress={() => onChange('in')} scaleTo={0.96}>
        <View style={{ paddingVertical: 10, alignItems: 'center' }}>
          <Txt v="bold" style={{ fontSize: 15 }}>
            {unrated > 0 ? `For me (${unrated} new)` : 'For me'}
          </Txt>
        </View>
      </Bounce>
      <Bounce wrapStyle={{ flex: 1 }} onPress={() => onChange('out')} scaleTo={0.96}>
        <View style={{ paddingVertical: 10, alignItems: 'center' }}>
          <Txt v="bold" style={{ fontSize: 15 }}>
            I sent
          </Txt>
        </View>
      </Bounce>
    </View>
  );
}

function Row({ d, mine, index }: { d: Delivery; mine: boolean; index: number }) {
  const { state, profileById } = useStore();
  const router = useRouter();
  const other = profileById(mine ? d.toId : d.fromId);
  const live = mine ? d.rating?.score : scoreFor(state.ranking, d.id) ?? d.rating?.score;

  let status: React.ReactNode;
  if (d.rating && live !== undefined) {
    status = <ScoreBadge score={live} bucket={d.rating.bucket} size={52} />;
  } else if (mine) {
    status = (
      <Pulse>
        <Txt style={{ fontSize: 30 }}>⏳</Txt>
      </Pulse>
    );
  } else {
    status = (
      <Pulse>
        <View
          style={{
            backgroundColor: colors.pink,
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: radius.pill,
            paddingVertical: 4,
            paddingHorizontal: 10,
          }}
        >
          <Txt v="bold" style={{ fontSize: 12 }}>
            NEW
          </Txt>
        </View>
      </Pulse>
    );
  }

  const verdict = d.rating ? verdictFor(d.rating.bucket, d.rating.score) : undefined;

  return (
    <FadeSlide delay={index * 70}>
      <Bounce onPress={() => router.push(`/song/${d.id}`)} wrapStyle={{ marginBottom: 14 }} scaleTo={0.97}>
        <Card color={!mine && !d.rating ? '#FFFDF5' : colors.white} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Artwork song={d.song} size={60} />
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Txt v="label" numberOfLines={1}>
                {mine ? `You to ${other.name}` : `${other.name} sent you`} · {timeAgo(d.sentAt)}
              </Txt>
              <Txt v="bold" numberOfLines={1} style={{ marginTop: 2 }}>
                {d.song.title}
              </Txt>
              <Txt v="caption" numberOfLines={1}>
                {d.song.artist}
              </Txt>
              {verdict ? (
                <Txt v="caption" color={colors.ink} style={{ marginTop: 2, fontWeight: '800' }}>
                  {verdict.emoji} {verdict.title}
                </Txt>
              ) : (
                <Txt v="caption" numberOfLines={1} style={{ marginTop: 2 }}>
                  {formatNote(d.note)}
                </Txt>
              )}
            </View>
            {status}
          </View>
        </Card>
      </Bounce>
    </FadeSlide>
  );
}

export default function InboxScreen() {
  const { state, meId } = useStore();
  const [mode, setMode] = useState<Mode>('in');
  const incoming = state.deliveries.filter((d) => d.toId === meId).sort((a, b) => b.sentAt - a.sentAt);
  const outgoing = state.deliveries.filter((d) => d.fromId === meId).sort((a, b) => b.sentAt - a.sentAt);
  const unrated = incoming.filter((d) => !d.rating).length;
  const list = mode === 'in' ? incoming : outgoing;

  return (
    <Screen>
      <FadeSlide>
        <Txt v="label">Selectas</Txt>
        <Txt v="display" style={{ marginBottom: 4 }}>
          {unrated > 0 ? 'Fresh songs 🎶' : 'All caught up ✨'}
        </Txt>
        <Txt v="caption" style={{ marginBottom: 18 }}>
          {unrated > 0
            ? `${unrated} friend${unrated === 1 ? '' : 's'} think${unrated === 1 ? 's' : ''} you will love something.`
            : 'Your friends are out there finding bangers for you.'}
        </Txt>
      </FadeSlide>
      <Segmented mode={mode} onChange={setMode} unrated={unrated} />
      {list.length === 0 ? (
        <Card color="#FFFDF5">
          <Txt v="title">{mode === 'in' ? 'Nothing yet' : 'You have not sent anything'}</Txt>
          <Txt v="caption" style={{ marginTop: 4 }}>
            {mode === 'in' ? 'When a friend sends you a song, it lands here.' : 'You get one song a day. Make it count.'}
          </Txt>
        </Card>
      ) : (
        list.map((d, i) => <Row key={`${mode}-${d.id}`} d={d} mine={mode === 'out'} index={i} />)
      )}
    </Screen>
  );
}
