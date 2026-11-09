import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { senderLine, verdictFor } from '../lib/whimsy';
import { useStore } from '../store';
import { BORDER, colors, radius } from '../theme';
import { Burst } from './Burst';
import { Button } from './Button';
import { Card } from './Card';
import { Txt } from './Txt';
import { Artwork, Avatar, ScoreBadge } from './widgets';

/**
 * Full-screen popup that appears when a friend's reaction to a song I sent arrives.
 * Wins get confetti. Flops get falling trash. Both are meant to be fun.
 */
export function RevealHost() {
  const { state, profileById, dismissReveal } = useStore();
  const router = useRouter();
  const id = state.reveals[0];
  const delivery = id ? state.deliveries.find((d) => d.id === id) : undefined;

  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!id) return;
    v.setValue(0);
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 14 }).start();
  }, [id, v]);

  if (!delivery || !delivery.rating) return null;

  const friend = profileById(delivery.toId);
  const { bucket, score, reaction } = delivery.rating;
  const verdict = verdictFor(bucket, score);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,19,64,0.6)', justifyContent: 'center', padding: 24 }]}>
      <Burst key={id} emojis={verdict.particles} mode={verdict.mode} />
      <Animated.View
        style={{
          opacity: v,
          transform: [
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '0deg'] }) },
          ],
        }}
      >
        <Card color={verdict.color} r={radius.lg} style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Txt v="label" color={colors.ink}>
            {friend.name} rated your song
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            <Avatar friend={friend} size={44} />
            <View style={{ width: 12 }} />
            <Artwork song={delivery.song} size={44} />
          </View>
          <Txt v="bold" style={{ marginTop: 10, textAlign: 'center' }}>
            {delivery.song.title}
          </Txt>
          <View
            style={{
              marginTop: 16,
              backgroundColor: colors.white,
              borderRadius: radius.pill,
              borderWidth: BORDER,
              borderColor: colors.ink,
              paddingVertical: 4,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Txt style={{ fontSize: 40, lineHeight: 52, fontWeight: '900' }}>{verdict.emoji}</Txt>
            <View style={{ width: 8 }} />
            <ScoreBadge score={score} bucket={bucket} size={58} />
            {reaction ? <Txt style={{ fontSize: 34, marginLeft: 10 }}>{reaction}</Txt> : null}
          </View>
          <Txt v="display" style={{ marginTop: 14, textAlign: 'center', fontSize: 28 }}>
            {verdict.title}
          </Txt>
          <Txt style={{ marginTop: 6, textAlign: 'center', fontWeight: '700' }}>
            {senderLine(verdict, friend.name, delivery.id)}
          </Txt>
          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            <Button
              small
              label="Close"
              color={colors.white}
              onPress={() => dismissReveal(delivery.id)}
              style={{ marginRight: 10 }}
            />
            <Button
              small
              label="See details"
              color={colors.yellow}
              onPress={() => {
                dismissReveal(delivery.id);
                router.push(`/song/${delivery.id}`);
              }}
            />
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}
