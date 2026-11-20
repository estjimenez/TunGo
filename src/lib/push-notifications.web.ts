export async function enablePushNotifications(_authToken: string): Promise<void> {
  throw new Error(
    'Las notificaciones push están disponibles en la app Android/iOS. En la web, los pedidos se actualizan mientras esta pantalla esté abierta.',
  );
}

export async function disablePushNotifications(_authToken: string): Promise<void> {}
