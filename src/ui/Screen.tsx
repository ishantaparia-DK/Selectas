import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER, colors } from '../theme';
import { Bounce } from './Bounce';
import { Txt } from './Txt';

function Blobs() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      <View
        style={{
          position: 'absolute',
          top: -70,
          right: -70,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: colors.pink,
          opacity: 0.16,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 120,
          left: -90,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: colors.sky,
          opacity: 0.16,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 280,
          right: -40,
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: colors.yellow,
          opacity: 0.28,
        }}
      />
    </View>
  );
}

/** Page shell: bright background, safe-area padding, room for the floating tab bar. */
export function Screen({
  children,
  tabBar = true,
  scroll = true,
}: {
  children: React.ReactNode;
  tabBar?: boolean;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const bottom = tabBar ? 130 : insets.bottom + 32;
  const pad = { paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: bottom };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
      <Blobs />
      {scroll ? (
        <ScrollView
          contentContainerStyle={pad}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
    </View>
  );
}

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();
  return (
    <Bounce onPress={() => router.back()} wrapStyle={{ alignSelf: 'flex-start', marginBottom: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.white,
          borderWidth: BORDER,
          borderColor: colors.ink,
          borderRadius: 999,
          paddingVertical: 8,
          paddingHorizontal: 14,
        }}
      >
        <Txt v="bold" style={{ fontSize: 14 }}>
          {'<  ' + label}
        </Txt>
      </View>
    </Bounce>
  );
}
