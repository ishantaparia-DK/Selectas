import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { BORDER, SHADOW_OFFSET, colors, radius } from '../theme';
import { Bounce } from './Bounce';
import { Txt } from './Txt';

export function Button({
  label,
  onPress,
  color = colors.pink,
  textColor = colors.ink,
  disabled,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Bounce onPress={onPress} disabled={disabled} wrapStyle={style} haptic="medium" scaleTo={0.95}>
      <View style={{ marginRight: SHADOW_OFFSET, marginBottom: SHADOW_OFFSET, opacity: disabled ? 0.4 : 1 }}>
        <View
          style={{
            position: 'absolute',
            left: SHADOW_OFFSET,
            top: SHADOW_OFFSET,
            right: -SHADOW_OFFSET,
            bottom: -SHADOW_OFFSET,
            backgroundColor: colors.ink,
            borderRadius: radius.pill,
          }}
        />
        <View
          style={{
            backgroundColor: color,
            borderWidth: BORDER,
            borderColor: colors.ink,
            borderRadius: radius.pill,
            paddingVertical: small ? 10 : 16,
            paddingHorizontal: small ? 16 : 24,
            alignItems: 'center',
          }}
        >
          <Txt v="bold" color={textColor} style={{ fontSize: small ? 14 : 17 }}>
            {label}
          </Txt>
        </View>
      </View>
    </Bounce>
  );
}
