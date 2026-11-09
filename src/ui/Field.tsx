import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { BORDER, colors, radius } from '../theme';
import { Txt } from './Txt';

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & {
  label: string;
  hint?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Txt v="label" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
        autoCorrect={false}
        placeholderTextColor={colors.inkSoft}
        {...input}
        style={{
          backgroundColor: colors.white,
          borderWidth: BORDER,
          borderColor: colors.ink,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 14,
          fontSize: 16,
          fontWeight: '600',
          color: colors.ink,
        }}
      />
      {hint ? (
        <Txt v="caption" style={{ marginTop: 4 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}
