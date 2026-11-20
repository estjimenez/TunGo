import { useEffect } from 'react';
import { Href, router } from 'expo-router';
import { useAuth } from '../lib/auth';

export default function RoleDashboardScreen() {
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace('/login');
    } else if (!user.verified) {
      router.replace('/verificar');
    } else {
      router.replace('/app' as Href);
    }
  }, [ready, user]);

  return null;
}
