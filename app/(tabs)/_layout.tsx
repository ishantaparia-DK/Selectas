import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, LayoutAnimation, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store';
import { BORDER, SHADOW_OFFSET, colors, radius } from '../../src/theme';
import { Bounce } from '../../src/ui/Bounce';
import { Txt } from '../../src/ui/Txt';

const ITEMS: Record<string, { label: string; emoji: string; color: string }> = {
  index: { label: 'Inbox', emoji: '📬', color: colors.sky },
  send: { label: 'Send', emoji: '🎵', color: colors.pink },
  friends: { label: 'Friends', emoji: '🫶', color: colors.mint },
  profile: { label: 'Stats', emoji: '🏆', color: colors.yellow },
};

function TabItem({
  focused,
  meta,
  badge,
  onPress,
}: {
  focused: boolean;
  meta: { label: string; emoji: string; color: string };
  badge: number;
  onPress: () => void;
}) {
  // Native-driven pop when this tab becomes active. No JS-driven animation lives in the tab bar.
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!focused) return;
    pop.setValue(0.82);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }).start();
  }, [focused, pop]);

  return (
    <Bounce onPress={onPress} scaleTo={0.88}>
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          minWidth: 52,
          paddingHorizontal: focused ? 14 : 0,
          borderRadius: radius.pill,
          borderWidth: BORDER,
          borderColor: focused ? colors.ink : 'transparent',
          backgroundColor: focused ? meta.color : 'transparent',
          transform: [{ scale: pop }],
        }}
      >
        <Txt style={{ fontSize: 22, lineHeight: 28 }}>{meta.emoji}</Txt>
        {focused ? (
          <Txt v="bold" numberOfLines={1} style={{ fontSize: 14, marginLeft: 6 }}>
            {meta.label}
          </Txt>
        ) : null}
      </Animated.View>
      {badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: 0,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.pink,
            borderWidth: 2,
            borderColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt v="bold" style={{ fontSize: 11, lineHeight: 14 }}>
            {badge}
          </Txt>
        </View>
      ) : null}
    </Bounce>
  );
}

// Mirrors the props expo-router 58 passes to a custom tab bar.
type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  emitter: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  };
  navigateToTab: (routeKey: string) => void;
};

function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: app, meId } = useStore();
  const unrated = app.deliveries.filter((d) => d.toId === meId && !d.rating).length;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 14), alignItems: 'center' }}
    >
      <View style={{ marginRight: SHADOW_OFFSET, marginBottom: SHADOW_OFFSET }}>
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            padding: 6,
            backgroundColor: colors.white,
            borderWidth: BORDER,
            borderColor: colors.ink,
            borderRadius: radius.pill,
          }}
        >
          {state.routes.map((route, i) => {
            const meta = ITEMS[route.name];
            if (!meta) return null;
            const focused = state.index === i;
            return (
              <TabItem
                key={route.key}
                focused={focused}
                meta={meta}
                badge={route.name === 'index' ? unrated : 0}
                onPress={() => {
                  const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    navigateToTab(route.key);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="send" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
