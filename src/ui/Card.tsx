import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { BORDER, SHADOW_OFFSET, colors, radius } from '../theme';

/** Chunky sticker card: thick ink border with a hard offset shadow. */
export function Card({
  children,
  color = colors.white,
  style,
  outerStyle,
  r = radius.md,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
  outerStyle?: StyleProp<ViewStyle>;
  r?: number;
}) {
  return (
    <View style={[{ marginRight: SHADOW_OFFSET, marginBottom: SHADOW_OFFSET }, outerStyle]}>
      <View
        style={{
          position: 'absolute',
          left: SHADOW_OFFSET,
          top: SHADOW_OFFSET,
          right: -SHADOW_OFFSET,
          bottom: -SHADOW_OFFSET,
          backgroundColor: colors.ink,
          borderRadius: r,
        }}
      />
      <View
        style={[
          {
            backgroundColor: color,
            borderWidth: BORDER,
            borderColor: colors.ink,
            borderRadius: r,
            padding: 16,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
