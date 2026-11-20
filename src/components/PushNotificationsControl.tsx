import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { enablePushNotifications } from '../lib/push-notifications';
import { getErrorMessage } from '../lib/api';

type Props = {
  token: string | null;
};

export function PushNotificationsControl({ token }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';
  const isExpoGo = Boolean(Constants.expoGoConfig);

  const enable = async () => {
    if (!token) {
      setMessage('Inicia sesión para activar las notificaciones de TunGo.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await enablePushNotifications(token);
      setMessage('Notificaciones activadas para los pedidos de TunGo.');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Avisos de pedidos</Text>
      <Text style={styles.description}>
        {isWeb
          ? 'En la web, los pedidos se actualizan automáticamente mientras la pantalla esté abierta.'
          : isExpoGo
            ? 'Las notificaciones push necesitan instalar la build de desarrollo de TunGo; Expo Go no incluye su módulo nativo.'
          : 'Recibe avisos cuando cambie un pedido, incluso si la app está en segundo plano.'}
      </Text>
      {!isWeb && !isExpoGo && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void enable()}
          style={({ pressed }) => [
            styles.button,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {busy ? 'Activando…' : 'Activar notificaciones'}
          </Text>
        </Pressable>
      )}
      {message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderWidth: 1,
    marginVertical: 12,
    padding: 15,
  },
  title: { color: '#F7F3EB', fontSize: 15, fontWeight: '900' },
  description: { color: '#A7AAA3', fontSize: 12, lineHeight: 18, marginTop: 6 },
  button: { alignItems: 'center', backgroundColor: '#FFB52D', marginTop: 12, padding: 12 },
  buttonText: { color: '#090A09', fontSize: 12, fontWeight: '900' },
  message: { color: '#FFB52D', fontSize: 12, lineHeight: 18, marginTop: 9 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.76 },
});
