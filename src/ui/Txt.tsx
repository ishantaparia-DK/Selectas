import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { colors } from '../theme';

const variants = {
  display: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  body: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  bold: { fontSize: 16, fontWeight: '800' },
  caption: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
} satisfies Record<string, TextStyle>;

export type TxtVariant = keyof typeof variants;

export function Txt({
  v = 'body',
  color,
  style,
  ...rest
}: TextProps & { v?: TxtVariant; color?: string }) {
  return <Text {...rest} style={[{ color: colors.ink }, variants[v], color ? { color } : null, style]} />;
}
