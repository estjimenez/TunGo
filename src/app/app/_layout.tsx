import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../lib/auth';

const tabBarStyle = {
  backgroundColor: '#141614',
  borderTopColor: '#30332F',
  height: 62,
  paddingBottom: 7,
  paddingTop: 7,
};

export default function RoleTabsLayout() {
  const { user, ready } = useAuth();
  const isCustomer = user?.rol === 'cliente';
  const isBusiness = user?.rol === 'establecimiento';
  const isCourier = user?.rol === 'domiciliario';

  useEffect(() => {
    if (ready && !user) {
      router.replace('/login');
    } else if (user && !user.verified) {
      router.replace('/verificar');
    }
  }, [ready, user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFB52D',
        tabBarInactiveTintColor: '#A7AAA3',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
        tabBarStyle,
        sceneStyle: { backgroundColor: '#090A09' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isCustomer ? 'Explorar' : isBusiness ? 'Resumen' : 'Entregas',
          tabBarLabel: isCustomer ? 'Explorar' : isBusiness ? 'Resumen' : 'Entregas',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌂</Text>,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarLabel: 'Pedidos',
          href: isCustomer || isBusiness ? undefined : null,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>▤</Text>,
        }}
      />
      <Tabs.Screen
        name="carrito"
        options={{
          title: 'Carrito',
          tabBarLabel: 'Carrito',
          href: isCustomer ? undefined : null,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>＋</Text>,
        }}
      />
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Catálogo',
          tabBarLabel: 'Catálogo',
          href: isBusiness ? undefined : null,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◇</Text>,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarLabel: 'Mapa',
          href: isCourier ? undefined : null,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌖</Text>,
        }}
      />
      <Tabs.Screen
        name="ganancias"
        options={{
          title: 'Ganancias',
          tabBarLabel: 'Ganancias',
          href: isCourier ? undefined : null,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>$</Text>,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarLabel: 'Historial',
          href: isCourier ? undefined : null,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◷</Text>,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>●</Text>,
        }}
      />
    </Tabs>
  );
}
