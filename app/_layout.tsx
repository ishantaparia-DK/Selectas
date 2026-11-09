import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth';
import { configureNotifications, registerForPush } from '../src/lib/push';
import { AuthScreen } from '../src/screens/AuthScreen';
import { OnboardingScreen } from '../src/screens/OnboardingScreen';
import { SetupScreen } from '../src/screens/SetupScreen';
import { StoreProvider } from '../src/store';
import { colors } from '../src/theme';
import { RevealHost } from '../src/ui/RevealHost';

if (Platform.OS !== 'web') configureNotifications();

/** Registers this phone for push and opens the right screen when a notification is tapped. */
function PushHandler() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    registerForPush().catch(() => {});
  }, []);

  useEffect(() => {
    if (!last) return;
    const id = last.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = last.notification.request.content.data as { kind?: string; deliveryId?: string } | undefined;
    if (data?.deliveryId) router.push(`/song/${data.deliveryId}`);
    else if (data?.kind?.startsWith('friend')) router.push('/friends');
  }, [last, router]);

  return null;
}

function Gate() {
  const { loading, configured, session, profile } = useAuth();
  const blank = <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (!configured) return <SetupScreen />;
  if (loading) return blank;
  if (!session) return <AuthScreen />;
  if (!profile) return <OnboardingScreen />;

  return (
    <StoreProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="rate/[id]"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }}
          />
        </Stack>
        <RevealHost />
        {Platform.OS !== 'web' ? <PushHandler /> : null}
      </View>
    </StoreProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
