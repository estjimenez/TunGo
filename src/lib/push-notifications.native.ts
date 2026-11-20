import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken, PushPlatform } from './api';

export async function enablePushNotifications(authToken: string) {
  if (Constants.expoGoConfig) {
    throw new Error(
      'Expo Go no incluye el módulo nativo de notificaciones push de TunGo. Instala una build de desarrollo de la app para activarlas.',
    );
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      'Vincula primero la app con EAS y configura EXPO_PUBLIC_EAS_PROJECT_ID para activar las notificaciones.',
    );
  }

  const Notifications = await import('expo-notifications');

  await Notifications.setNotificationCategoryAsync('courier-order', [
    {
      identifier: 'accept-order',
      buttonTitle: 'Aceptar',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'reject-order',
      buttonTitle: 'Rechazar',
      options: { opensAppToForeground: true, isDestructive: true },
    },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('courier-orders-v2', {
      name: 'Pedidos TunGo',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'tungo-order.wav',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission =
    currentPermission.granted ||
    (await Notifications.requestPermissionsAsync()).granted;

  if (!permission) {
    throw new Error(
      'No se concedió el permiso para notificaciones. Puedes activarlo en los ajustes del teléfono.',
    );
  }

  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new Error('Las notificaciones push están disponibles en Android y iOS.');
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushToken(
    authToken,
    pushToken.data,
    Platform.OS as PushPlatform,
  );
  await SecureStore.setItemAsync('tungo-push-token', pushToken.data);
}

export async function disablePushNotifications(authToken: string) {
  const pushToken = await SecureStore.getItemAsync('tungo-push-token');
  if (!pushToken) return;

  await unregisterPushToken(authToken, pushToken);
  await SecureStore.deleteItemAsync('tungo-push-token');
}
