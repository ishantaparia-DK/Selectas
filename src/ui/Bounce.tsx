import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  /** Layout style for the pressable wrapper (flex, width, margins). */
  wrapStyle?: StyleProp<ViewStyle>;
  /** Style for the animated content. */
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'success' | 'none';
  children: React.ReactNode;
};

/** Pressable that squishes on touch and springs back. Used for every tappable thing. */
export function Bounce({
  wrapStyle,
  style,
  scaleTo = 0.94,
  haptic = 'light',
  onPress,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 12 }).start();

  const buzz = () => {
    if (haptic === 'none') return;
    const p =
      haptic === 'success'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(
            haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          );
    p.catch(() => {});
  };

  return (
    <Pressable
      {...rest}
      style={wrapStyle}
      onPressIn={(e) => {
        to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        buzz();
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
