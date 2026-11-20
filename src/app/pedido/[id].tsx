import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { BrandHeader } from '../../components/BrandHeader';
import { CourierMap } from '../../components/CourierMap';
import { useAuth } from '../../lib/auth';
import { PushNotificationsControl } from '../../components/PushNotificationsControl';
import {
  confirmOrderDelivery,
  formatOrderCancellationReason,
  getErrorMessage,
  getOrder,
  getOrderChat,
  getOrderLocation,
  getOrderPaymentUrl,
  Order,
  OrderMessage,
  sendOrderMessage,
} from '../../lib/api';
import { formatCurrency } from '../../lib/format';

export default function OrderDetailsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const orderId = Number(rawId);
  const { user, token, ready } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showCourierMap, setShowCourierMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!token || !Number.isInteger(orderId) || orderId < 1) {
      setError('No encontramos este pedido.');
      setLoading(false);
      return;
    }
    try {
      const loaded = await getOrder(token, orderId);
      setOrder(loaded);
      if (loaded.domiciliario) {
        const chat = await getOrderChat(token, orderId);
        setMessages(chat);
      }
      if (
        loaded.domiciliario &&
        user?.rol === 'cliente' &&
        ['confirmado', 'llego_tienda', 'recogido', 'en_camino'].includes(loaded.estado)
      ) {
        const location = await getOrderLocation(token, orderId);
        setOrder((current) => current?.id === loaded.id
          ? {
              ...current,
              ubicacion:
                location.latitud !== null && location.longitud !== null
                  ? {
                      latitud: location.latitud,
                      longitud: location.longitud,
                      actualizada_en: location.actualizada_en,
                    }
                  : null,
            }
          : current);
        if (location.latitud !== null && location.longitud !== null) {
          setNotice(`Ubicación del domiciliario actualizada${location.actualizada_en ? ` · ${new Date(location.actualizada_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}.`);
        } else {
          setNotice('El domiciliario aún no ha compartido su ubicación.');
        }
      }
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [orderId, token, user]);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
    else if (user && !user.verified) router.replace('/verificar');
  }, [ready, user]);

  useFocusEffect(useCallback(() => {
    void loadOrder();
    const timer = setInterval(() => void loadOrder(), 10000);
    return () => clearInterval(timer);
  }, [loadOrder]));

  const startPayment = async () => {
    if (!token || !order) return;
    setPaying(true);
    setError(null);
    try {
      const { checkout_url: checkoutUrl } = await getOrderPaymentUrl(token, order.id);
      await Linking.openURL(checkoutUrl);
    } catch (paymentError) {
      setError(getErrorMessage(paymentError));
    } finally {
      setPaying(false);
    }
  };

  const confirmPayment = async (method: 'efectivo' | 'transferencia') => {
    if (!token || !order) return;
    try {
      setOrder(await confirmOrderDelivery(token, order.id, method));
      setNotice('Confirmaste la entrega y el pago. Gracias por usar TunGo.');
    } catch (confirmationError) {
      setError(getErrorMessage(confirmationError));
    }
  };

  const sendMessage = async () => {
    if (!token || !order || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendOrderMessage(token, order.id, message.trim());
      setMessages((current) => [...current, sent]);
      setMessage('');
    } catch (sendError) {
      setError(getErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  const openRoute = async () => {
    if (!order) return;
    const destination = encodeURIComponent(order.direccion_entrega);
    const origin = encodeURIComponent(order.establecimiento?.direccion ?? '');
    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`);
    } catch (linkError) {
      setError(getErrorMessage(linkError));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl colors={['#FF7A16']} onRefresh={() => void loadOrder()} refreshing={false} tintColor="#FF7A16" />}
    >
      <BrandHeader />
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.link}>‹  Volver</Text>
      </Pressable>
      <Text style={styles.eyebrow}>SEGUIMIENTO TUNGO</Text>
      <Text style={styles.title}>Pedido #{orderId}</Text>
      {user?.rol === 'cliente' && <PushNotificationsControl token={token} />}
      {loading && !order ? <ActivityIndicator color="#FF7A16" size="large" /> : null}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {order && (
        <>
          <View style={styles.card}>
            <Text style={styles.status}>{order.estado.replaceAll('_', ' ')}</Text>
            {order.estado === 'cancelado' && order.motivo_cancelacion && (
              <Text style={styles.notice}>
                Motivo de cancelación: {formatOrderCancellationReason(
                  order.motivo_cancelacion,
                  order.detalle_cancelacion,
                )}
              </Text>
            )}
            <Text style={styles.store}>{order.establecimiento?.nombre ?? 'Establecimiento'}</Text>
            <Text style={styles.muted}>{order.direccion_entrega}</Text>
            <Text style={styles.total}>{formatCurrency(order.total)}</Text>
            <Text style={styles.muted}>Domicilio: {formatCurrency(order.tarifa_domicilio)} · Zona {order.zona_entrega ?? 'general'}</Text>
            {order.domiciliario && <Text style={styles.muted}>Domiciliario: {order.domiciliario.name}</Text>}
            {notice && <Text style={styles.notice}>{notice}</Text>}
            {user?.rol === 'cliente' &&
              order.domiciliario &&
              ['confirmado', 'llego_tienda', 'recogido', 'en_camino'].includes(order.estado) && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showCourierMap }}
                    onPress={() => setShowCourierMap((shown) => !shown)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {showCourierMap ? 'Ocultar mapa del domiciliario' : 'Ver mapa del domiciliario'}
                    </Text>
                  </Pressable>
                  {showCourierMap && (
                    <CourierMap
                      label={`Ubicación de ${order.domiciliario.name}`}
                      latitude={order.ubicacion?.latitud ?? null}
                      longitude={order.ubicacion?.longitud ?? null}
                      updatedAt={order.ubicacion?.actualizada_en}
                    />
                  )}
                </>
              )}
            <Pressable onPress={() => void openRoute()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Abrir ruta en Google Maps</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Productos</Text>
            {order.detalles.map((line) => (
              <View key={line.id} style={styles.line}>
                <Text style={styles.muted}>{line.cantidad} × {line.nombre}</Text>
                <Text style={styles.lineAmount}>{formatCurrency(line.cantidad * line.precio_unitario)}</Text>
              </View>
            ))}
          </View>
          {!order.pagado && order.estado !== 'cancelado' && (
            <Pressable disabled={paying} onPress={() => void startPayment()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{paying ? 'Abriendo Wompi…' : 'Pagar en línea con Wompi'}</Text>
            </Pressable>
          )}
          {order.pagado && <Text style={styles.notice}>Pago confirmado{order.metodo_pago ? ` · ${order.metodo_pago}` : ''}.</Text>}
          {user?.rol === 'cliente' && order.estado === 'en_camino' && !order.confirmado_por_cliente && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>¿Ya recibiste el pedido?</Text>
              <Text style={styles.muted}>Confirma cuando tengas el pedido y hayas pagado al domiciliario.</Text>
              <Pressable onPress={() => void confirmPayment('efectivo')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Confirmar pago en efectivo</Text>
              </Pressable>
              <Pressable onPress={() => void confirmPayment('transferencia')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Confirmar pago por transferencia</Text>
              </Pressable>
            </View>
          )}
          {order.domiciliario && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Chat del pedido</Text>
              {messages.map((chatMessage) => (
                <View key={chatMessage.id} style={styles.message}>
                  <Text style={styles.messageAuthor}>{chatMessage.sender.name}</Text>
                  <Text style={styles.muted}>{chatMessage.message}</Text>
                </View>
              ))}
              <TextInput
                maxLength={1000}
                onChangeText={setMessage}
                onSubmitEditing={() => void sendMessage()}
                placeholder="Escribe una actualización…"
                placeholderTextColor="#777C75"
                returnKeyType="send"
                style={styles.input}
                value={message}
              />
              <Pressable disabled={sending || !message.trim()} onPress={() => void sendMessage()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{sending ? 'Enviando…' : 'Enviar mensaje'}</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: '#090A09', flexGrow: 1, padding: 20, paddingBottom: 34 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  eyebrow: { color: '#FF7A16', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.2, marginTop: 12 },
  title: { color: '#F7F3EB', fontSize: 28, fontWeight: '900', marginBottom: 12 },
  card: { backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, marginBottom: 12, padding: 15 },
  status: { color: '#FFB52D', fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  store: { color: '#F7F3EB', fontSize: 19, fontWeight: '900', marginTop: 8 },
  muted: { color: '#A7AAA3', fontSize: 12, lineHeight: 18, marginTop: 6 },
  total: { color: '#FFB52D', fontSize: 22, fontWeight: '900', marginTop: 14 },
  notice: { backgroundColor: '#172016', borderColor: '#344532', borderWidth: 1, color: '#C8E0BD', fontSize: 12, lineHeight: 18, marginTop: 12, padding: 11 },
  sectionTitle: { color: '#F7F3EB', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  line: { alignItems: 'center', borderBottomColor: '#30332F', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lineAmount: { color: '#F7F3EB', fontSize: 12, fontWeight: '700' },
  primaryButton: { alignItems: 'center', backgroundColor: '#FFB52D', marginTop: 10, padding: 13 },
  primaryButtonText: { color: '#090A09', fontSize: 12, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#FF7A16', borderWidth: 1, marginTop: 10, padding: 12 },
  secondaryButtonText: { color: '#FFB52D', fontSize: 12, fontWeight: '800' },
  message: { borderBottomColor: '#30332F', borderBottomWidth: 1, paddingVertical: 8 },
  messageAuthor: { color: '#FF7A16', fontSize: 11, fontWeight: '900' },
  input: { backgroundColor: '#090A09', borderColor: '#30332F', borderWidth: 1, color: '#F7F3EB', marginTop: 12, padding: 12 },
  error: { backgroundColor: '#261512', borderColor: '#7D3A24', borderWidth: 1, color: '#FFB59A', fontSize: 13, lineHeight: 19, marginBottom: 12, padding: 12 },
  link: { color: '#FFB52D', fontSize: 13, fontWeight: '800' },
});
