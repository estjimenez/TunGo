import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { BrandHeader } from '../components/BrandHeader';
import { PushNotificationsControl } from '../components/PushNotificationsControl';
import { useAuth } from '../lib/auth';
import {
  formatOrderCancellationReason,
  getErrorMessage,
  getMyOrders,
  Order,
} from '../lib/api';
import { formatCurrency } from '../lib/format';

export default function CustomerOrdersScreen() {
  const { user, token, ready } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (refresh = false) => {
    if (!token) return;
    if (refresh) setRefreshing(true);
    try {
      setOrders(await getMyOrders(token));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
    else if (user && !user.verified) router.replace('/verificar');
    else if (user && user.rol !== 'cliente') router.replace('/panel');
  }, [ready, user]);

  useFocusEffect(useCallback(() => {
    void loadOrders();
    const timer = setInterval(() => void loadOrders(), 10000);
    return () => clearInterval(timer);
  }, [loadOrders]));

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={orders}
      keyExtractor={(order) => String(order.id)}
      refreshControl={
        <RefreshControl
          colors={['#FF7A16']}
          onRefresh={() => void loadOrders(true)}
          refreshing={refreshing}
          tintColor="#FF7A16"
        />
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color="#FF7A16" size="large" />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>Aún no tienes pedidos</Text>
            <Text style={styles.muted}>Explora TunGo y tu actividad aparecerá aquí.</Text>
            <Pressable onPress={() => router.replace('/')} style={styles.button}>
              <Text style={styles.buttonText}>Explorar aliados</Text>
            </Pressable>
          </View>
        )
      }
      ListHeaderComponent={
        <View>
          <BrandHeader />
          <Text style={styles.eyebrow}>TU ACTIVIDAD</Text>
          <Text style={styles.title}>Mis pedidos</Text>
          <Text style={styles.muted}>Toca un pedido para revisar su estado, pago y seguimiento.</Text>
          <PushNotificationsControl token={token} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/pedido/${item.id}`)}
          style={({ pressed }) => [styles.orderCard, pressed && styles.pressed]}
        >
          <View style={styles.orderHead}>
            <Text style={styles.kicker}>PEDIDO #{item.id}</Text>
            <Text style={styles.amount}>{formatCurrency(item.total)}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.establecimiento?.nombre ?? 'TunGo'}</Text>
          <Text style={styles.muted}>
            {item.detalles.reduce((count, line) => count + line.cantidad, 0)} productos · {item.direccion_entrega}
          </Text>
          <Text style={styles.status}>{item.estado.replaceAll('_', ' ')}</Text>
          {item.estado === 'cancelado' && item.motivo_cancelacion && (
            <Text style={styles.muted}>
              Motivo: {formatOrderCancellationReason(item.motivo_cancelacion, item.detalle_cancelacion)}
            </Text>
          )}
          <Text style={styles.link}>Ver pedido ›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: '#090A09', flexGrow: 1, padding: 20, paddingBottom: 32 },
  eyebrow: { color: '#FF7A16', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.2, marginTop: 15 },
  title: { color: '#F7F3EB', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  orderCard: { backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, marginTop: 12, padding: 15 },
  orderHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { color: '#FF7A16', fontFamily: 'monospace', fontSize: 10, fontWeight: '800' },
  amount: { color: '#FFB52D', fontSize: 14, fontWeight: '900' },
  cardTitle: { color: '#F7F3EB', fontSize: 17, fontWeight: '800', marginTop: 10 },
  muted: { color: '#A7AAA3', fontSize: 12, lineHeight: 18, marginTop: 6 },
  status: { color: '#FFB52D', fontSize: 12, fontWeight: '800', marginTop: 12, textTransform: 'capitalize' },
  link: { color: '#FF7A16', fontSize: 12, fontWeight: '800', marginTop: 12 },
  emptyCard: { alignItems: 'center', backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, marginTop: 24, padding: 22 },
  button: { alignItems: 'center', backgroundColor: '#FFB52D', marginTop: 16, padding: 13 },
  buttonText: { color: '#090A09', fontSize: 12, fontWeight: '900' },
  error: { backgroundColor: '#261512', borderColor: '#7D3A24', borderWidth: 1, color: '#FFB59A', fontSize: 13, marginTop: 12, padding: 12 },
  pressed: { opacity: 0.75 },
});
