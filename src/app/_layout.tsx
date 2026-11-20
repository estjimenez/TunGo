import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CartProvider } from '../lib/cart';
import { AuthProvider } from '../lib/auth';
import { NotificationEffects } from '../components/NotificationEffects';
import '../lib/location-task';

export default function RootLayout() {
  return (
    <CartProvider>
      <AuthProvider>
        <NotificationEffects />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#090A09' },
            headerShown: false,
          }}
        />
      </AuthProvider>
    </CartProvider>
  );
}
