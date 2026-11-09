import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let currentToken: string | null = null;

/** Show notifications as banners even while the app is open. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Asks for permission, gets this phone's Expo push token and saves it to the database.
 * Returns the token, or null if push is not possible here (simulator, web, permission
 * denied, or the project is not linked to Expo yet: run `npx eas-cli init` once).
 */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('Push disabled: no EAS projectId. Run `npx eas-cli init` in the project folder.');
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  currentToken = data;
  await supabase.rpc('register_push_token', { p_token: data });
  return data;
}

/** Called on sign out so this phone stops getting the previous user's notifications. */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await supabase.rpc('unregister_push_token', { p_token: token });
}
