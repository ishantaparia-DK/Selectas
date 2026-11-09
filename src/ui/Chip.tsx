import React from 'react';
import { View } from 'react-native';
import { BORDER, colors, radius } from '../theme';
import { Bounce } from './Bounce';
import { Txt } from './Txt';

export function Chip({
  label,
  selected,
  onPress,
  color = colors.yellow,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Bounce onPress={onPress} scaleTo={0.9} wrapStyle={{ marginRight: 8, marginBottom: 8 }}>
      <View
        style={{
          backgroundColor: selected ? color : colors.white,
          borderWidth: BORDER,
          borderColor: colors.ink,
          borderRadius: radius.pill,
          paddingVertical: 8,
          paddingHorizontal: 14,
          transform: [{ translateY: selected ? -2 : 0 }],
        }}
      >
        <Txt v="bold" style={{ fontSize: 14 }}>
          {label}
        </Txt>
      </View>
    </Bounce>
  );
}

/** Read-only tag, used to show the flavor details on a delivered song. */
export function Tag({ text, color = colors.white }: { text: string; color?: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderWidth: 2,
        borderColor: colors.ink,
        borderRadius: radius.pill,
        paddingVertical: 5,
        paddingHorizontal: 11,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Txt v="bold" style={{ fontSize: 12 }}>
        {text}
      </Txt>
    </View>
  );
}
