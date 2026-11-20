import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Href, router } from 'expo-router';
import { CourierDashboard } from '../../components/CourierDashboard';
import { useAuth } from '../../lib/auth';

export default function CourierMapScreen() {
  const { user, token, ready } = useAuth();

  useEffect(() => {
    if (ready && user?.verified && user.rol !== 'domiciliario') {
      router.replace('/app' as Href);
    }
  }, [ready, user]);

  if (!ready || !user?.verified) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: '#090A09', flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color="#FF7A16" size="large" />
      </View>
    );
  }
  if (user.rol !== 'domiciliario') return null;

  return <CourierDashboard section="map" token={token} />;
}
