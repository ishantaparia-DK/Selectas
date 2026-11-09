import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

/**
 * One-shot emoji particles. 'burst' explodes outward (wins), 'rain' falls from the top
 * (flops and disasters). Renders nothing if given no emojis.
 */
export function Burst({
  emojis,
  mode = 'burst',
  count = 18,
}: {
  emojis: string[];
  mode?: 'burst' | 'rain';
  count?: number;
}) {
  const particles = useMemo(
    () =>
      emojis.length === 0
        ? []
        : Array.from({ length: count }, (_, i) => ({
            emoji: emojis[i % emojis.length],
            angle: Math.random() * Math.PI * 2,
            dist: 90 + Math.random() * 140,
            delay: Math.random() * 300,
            size: 22 + Math.random() * 18,
            spin: (Math.random() - 0.5) * 540,
            left: Math.random() * 90,
            v: new Animated.Value(0),
          })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (particles.length === 0) return;
    const anim = Animated.parallel(
      particles.map((p) =>
        Animated.timing(p.v, {
          toValue: 1,
          duration: mode === 'rain' ? 1900 : 1200,
          delay: p.delay,
          easing: mode === 'rain' ? Easing.in(Easing.quad) : Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    );
    anim.start();
    return () => anim.stop();
  }, [particles, mode]);

  if (particles.length === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => {
        const opacity = p.v.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
        const rotate = p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
        if (mode === 'rain') {
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: `${p.left}%`,
                opacity,
                transform: [
                  { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [-60, 640] }) },
                  { rotate },
                ],
              }}
            >
              <Text style={{ fontSize: p.size }}>{p.emoji}</Text>
            </Animated.View>
          );
        }
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '38%',
              opacity,
              transform: [
                { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist] }) },
                {
                  translateY: p.v.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin(p.angle) * p.dist - 30],
                  }),
                },
                { rotate },
              ],
            }}
          >
            <Text style={{ fontSize: p.size }}>{p.emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
