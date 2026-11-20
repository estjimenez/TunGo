import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';

export function BrandHeader() {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const ordersRoute = '/app/pedidos';
  const accountRoute = user ? '/app/perfil' : '/cuenta';

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image
          source={require('../../assets/tungo-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Logo de TunGo"
        />
        <View>
          <Text style={styles.locationLabel}>TU CIUDAD</Text>
          <Text style={styles.location}>Tunja, Boyacá</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {user?.rol === 'cliente' && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver mis pedidos"
              onPress={() => router.push(ordersRoute)}
              style={({ pressed }) => [
                styles.accountButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.accountLabel}>PEDIDOS</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir carrito, ${itemCount} productos`}
              onPress={() => router.push('/app/carrito')}
              style={({ pressed }) => [
                styles.cartButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cartLabel}>PEDIDO</Text>
              {itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {itemCount > 99 ? '99+' : itemCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={user ? 'Abrir mi cuenta' : 'Ingresar o crear cuenta'}
          onPress={() => router.push(accountRoute)}
          style={({ pressed }) => [
            styles.accountButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.accountLabel}>
            {user ? 'CUENTA' : 'ENTRAR'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    width: '100%',
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logo: {
    height: 76,
    width: 74,
  },
  locationLabel: {
    color: '#FF7A16',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  location: {
    color: '#F7F3EB',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  cartButton: {
    alignItems: 'center',
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    height: 40,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 8,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  accountButton: {
    alignItems: 'center',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 8,
  },
  cartLabel: {
    color: '#090A09',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  accountLabel: {
    color: '#FFB52D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#FF7A16',
    borderColor: '#090A09',
    borderRadius: 9,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  badgeText: {
    color: '#171512',
    fontSize: 9,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
