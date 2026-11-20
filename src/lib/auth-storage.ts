import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthSessionResponse } from './api';

const SESSION_KEY = 'tungo.auth.session';

export async function readAuthSession(): Promise<AuthSessionResponse | null> {
  const value =
    Platform.OS === 'web'
      ? globalThis.localStorage.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);

  if (value === null) {
    return null;
  }

  const session = JSON.parse(value) as Partial<AuthSessionResponse>;

  if (
    typeof session.token !== 'string' ||
    !session.user ||
    typeof session.user.id !== 'number' ||
    typeof session.user.rol !== 'string'
  ) {
    throw new Error('La sesión guardada en este dispositivo no es válida.');
  }

  return session as AuthSessionResponse;
}

export async function writeAuthSession(
  session: AuthSessionResponse,
): Promise<void> {
  const value = JSON.stringify(session);

  if (Platform.OS === 'web') {
    globalThis.localStorage.setItem(SESSION_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, value);
}

export async function clearAuthSession(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}
