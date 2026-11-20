import { ActivityIndicator, View } from 'react-native';
import HomeScreen from '../index';
import { BusinessDashboard } from '../../components/BusinessDashboard';
import { CourierDashboard } from '../../components/CourierDashboard';
import { useAuth } from '../../lib/auth';

export default function RoleHomeScreen() {
  const { user, token, ready } = useAuth();

  if (!ready || !user?.verified) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: '#090A09', flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color="#FF7A16" size="large" />
      </View>
    );
  }

  if (user.rol === 'cliente') {
    return <HomeScreen />;
  }
  if (user.rol === 'establecimiento') {
    return <BusinessDashboard section="overview" token={token} />;
  }

  return <CourierDashboard section="deliveries" token={token} />;
}
