import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

/** Fades and slides children in on mount. Stagger lists by passing an increasing delay. */
export function FadeSlide({
  children,
  delay = 0,
  from = 18,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Gentle looping pulse for "waiting" and "new" states. */
export function Pulse({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
