import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { CourierMap } from './CourierMap';
import { BrandHeader } from './BrandHeader';
import { PushNotificationsControl } from './PushNotificationsControl';
import {
  CourierDashboard as CourierData,
  getCourierDashboard,
  getErrorMessage,
  Order,
  rejectCourierOrder,
  takeCourierOrder,
  updateCourierAcceptancePreference,
  updateCourierLocation,
  updateCourierOrderStatus,
} from '../lib/api';
import {
  resumeCourierBackgroundTracking,
  startCourierBackgroundTracking,
  stopCourierBackgroundTracking,
} from '../lib/courier-location';
import { formatCurrency } from '../lib/format';

type Props = {
  token: string | null;
  section?: 'deliveries' | 'map' | 'earnings' | 'history';
};

const activeStates = new Set(['confirmado', 'llego_tienda', 'recogido', 'en_camino']);

export function CourierDashboard({
  token,
  section = 'deliveries',
}: Props) {
  const [dashboard, setDashboard] = useState<CourierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [uploadFromForeground, setUploadFromForeground] = useState(false);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [busyOrder, setBusyOrder] = useState<number | null>(null);
  const [savingAcceptanceMode, setSavingAcceptanceMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    if (refresh) setRefreshing(true);
    try {
      setDashboard(await getCourierDashboard(token));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    setScreenActive(true);
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      clearInterval(timer);
      setScreenActive(false);
    };
  }, [load]));

  const activeOrders = useMemo(
    () => dashboard?.pedidos.filter((order) => activeStates.has(order.estado)) ?? [],
    [dashboard],
  );
  const activeOrderKey = activeOrders.map((order) => order.id).join(',');
  const automaticAcceptance = dashboard?.aceptacion_automatica ?? false;

  useEffect(() => {
    if (!activeOrderKey && !automaticAcceptance) {
      void stopCourierBackgroundTracking().then(() => {
        setSharingLocation(false);
        setUploadFromForeground(false);
      }).catch((trackingError: unknown) => {
        setError(getErrorMessage(trackingError));
      });
      return;
    }

    let active = true;
    void Location.getForegroundPermissionsAsync()
      .then(async (permission) => {
        if (permission.status !== 'granted') {
          throw new Error('Permite la ubicación para compartirla durante tus entregas o la aceptación automática.');
        }
        return resumeCourierBackgroundTracking(
          automaticAcceptance ? 'automatic' : 'delivery',
        );
      })
      .then((resumed) => {
        if (active) {
          setSharingLocation(true);
          setUploadFromForeground(!resumed);
          setLocationMessage(resumed
            ? automaticAcceptance
              ? 'Ubicación activa en segundo plano para asignarte pedidos cercanos.'
              : 'Compartiendo ubicación solo durante tus entregas activas.'
            : 'La ubicación se comparte mientras TunGo esté abierto. Activa permiso en segundo plano para no perder asignaciones automáticas.');
        }
      })
      .catch((trackingError: unknown) => {
        if (active) setError(getErrorMessage(trackingError));
      });

    return () => {
      active = false;
    };
  }, [activeOrderKey, automaticAcceptance]);

  useEffect(() => {
    if (!screenActive || !sharingLocation || (!activeOrderKey && !automaticAcceptance)) return;
    let mounted = true;

    const updatePosition = async (position: Location.LocationObject) => {
      if (!mounted) return;
      setLocation(position.coords);
      const updatedAt = new Date(position.timestamp).toISOString();
      setLocationUpdatedAt(updatedAt);

      if (!uploadFromForeground || !token) return;
      const activeIds = activeOrderKey
        ? activeOrderKey.split(',').map(Number)
        : [];
      try {
        const coordinates = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        };
        if (activeIds.length === 0) {
          await updateCourierLocation(token, coordinates);
        } else {
          await Promise.all(activeIds.map((id) =>
            updateCourierLocation(token, coordinates, id),
          ));
        }
      } catch (locationError) {
        setError(getErrorMessage(locationError));
      }
    };

    void Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).then(updatePosition).catch((locationError: unknown) => {
      if (mounted) setError(getErrorMessage(locationError));
    });

    let subscription: Location.LocationSubscription | null = null;
    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25,
        timeInterval: 15000,
      },
      (position) => void updatePosition(position),
    ).then((watcher) => {
      if (mounted) subscription = watcher;
      else watcher.remove();
    }).catch((locationError: unknown) => {
      if (mounted) setError(getErrorMessage(locationError));
    });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [
    activeOrderKey,
    automaticAcceptance,
    screenActive,
    sharingLocation,
    token,
    uploadFromForeground,
  ]);

  const enableLocation = async () => {
    setError(null);
    setLocationMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Necesitas permitir la ubicación para compartirla durante una entrega.');
      }

      setSharingLocation(true);
      if (Platform.OS === 'web') {
        setUploadFromForeground(true);
        setLocationMessage('La ubicación se comparte mientras este panel web está abierto.');
        return;
      }

      try {
        await startCourierBackgroundTracking();
        setUploadFromForeground(false);
        setLocationMessage('Ubicación activa solo mientras tengas una entrega pendiente.');
      } catch (trackingError) {
        setUploadFromForeground(true);
        setLocationMessage('Sin permiso en segundo plano; la ubicación se compartirá mientras TunGo esté abierto.');
        setError(getErrorMessage(trackingError));
      }
    } catch (permissionError) {
      setError(getErrorMessage(permissionError));
    }
  };

  const acceptOrder = async (orderId: number) => {
    if (!token) return;
    setBusyOrder(orderId);
    setError(null);
    try {
      await takeCourierOrder(token, orderId);
      await load();
    } catch (takeError) {
      setError(getErrorMessage(takeError));
      await load();
    } finally {
      setBusyOrder(null);
    }
  };

  const rejectOrder = async (orderId: number) => {
    if (!token) return;
    setBusyOrder(orderId);
    setError(null);
    try {
      await rejectCourierOrder(token, orderId);
      await load();
    } catch (rejectError) {
      setError(getErrorMessage(rejectError));
      await load();
    } finally {
      setBusyOrder(null);
    }
  };

  const toggleAutomaticAcceptance = async () => {
    if (!token) return;
    setSavingAcceptanceMode(true);
    setError(null);
    try {
      if (!automaticAcceptance) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          throw new Error('Permite la ubicación para activar la asignación automática.');
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const preference = await updateCourierAcceptancePreference(token, true);
        setDashboard((current) => current ? {
          ...current,
          aceptacion_automatica: preference.aceptacion_automatica,
        } : current);
        setLocation(position.coords);
        setLocationUpdatedAt(new Date(position.timestamp).toISOString());
        await updateCourierLocation(token, {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        });

        if (Platform.OS === 'web') {
          setSharingLocation(true);
          setUploadFromForeground(true);
          setLocationMessage('Asignación automática activa mientras este panel web esté abierto.');
        } else {
          try {
            await startCourierBackgroundTracking('automatic');
            setSharingLocation(true);
            setUploadFromForeground(false);
            setLocationMessage('TunGo actualizará tu ubicación para asignarte pedidos cercanos.');
          } catch (trackingError) {
            setSharingLocation(true);
            setUploadFromForeground(true);
            setLocationMessage(
              `Asignación automática activa mientras TunGo esté abierto. Para recibir asignaciones cuando la app esté minimizada, permite ubicación en segundo plano. ${getErrorMessage(trackingError)}`,
            );
          }
        }
      } else {
        const preference = await updateCourierAcceptancePreference(token, false);
        setDashboard((current) => current ? {
          ...current,
          aceptacion_automatica: preference.aceptacion_automatica,
        } : current);
        setLocationMessage(
          activeOrders.length
            ? 'Aceptación automática desactivada. La ubicación seguirá compartiéndose para la entrega activa.'
            : 'Aceptación manual activa. Los pedidos rechazados se ocultan solo para ti.',
        );
      }

      await load();
    } catch (preferenceError) {
      setError(getErrorMessage(preferenceError));
    } finally {
      setSavingAcceptanceMode(false);
    }
  };

  const advanceOrder = async (order: Order) => {
    if (!token) return;
    const nextStatus = {
      confirmado: 'llego_tienda',
      llego_tienda: 'recogido',
      recogido: 'en_camino',
      en_camino: 'entregado',
    }[order.estado] as 'llego_tienda' | 'recogido' | 'en_camino' | 'entregado' | undefined;

    if (!nextStatus) return;
    const pickupCode = codes[order.id]?.trim();
    if (nextStatus === 'recogido' && !/^\d{6}$/.test(pickupCode ?? '')) {
      setError('Ingresa el código de recogida de 6 dígitos que muestra el establecimiento.');
      return;
    }
    if (nextStatus === 'entregado' && (!order.pagado || !order.confirmado_por_cliente)) {
      setError('El cliente debe confirmar la entrega y el pago antes de cerrar el pedido.');
      return;
    }

    setBusyOrder(order.id);
    setError(null);
    try {
      await updateCourierOrderStatus(token, order.id, nextStatus, pickupCode);
      setCodes((current) => ({ ...current, [order.id]: '' }));
      await load();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setBusyOrder(null);
    }
  };

  const openRoute = async (destination: string, origin?: string) => {
    const params = new URLSearchParams({
      api: '1',
      destination,
      ...(origin ? { origin } : {}),
    });
    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?${params.toString()}`);
    } catch (linkError) {
      setError(getErrorMessage(linkError));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          colors={['#FF7A16']}
          onRefresh={() => void load(true)}
          refreshing={refreshing}
          tintColor="#FF7A16"
        />
      }
    >
      <BrandHeader />
      <Text style={styles.eyebrow}>PANEL LOGÍSTICO</Text>
      <Text style={styles.title}>
        {section === 'map'
          ? 'Mapa de entregas'
          : section === 'earnings'
            ? 'Mis ganancias'
            : section === 'history'
              ? 'Historial'
              : 'Mis entregas'}
      </Text>
      <Text style={styles.muted}>
        Los pedidos disponibles y los estados se actualizan cada 10 segundos.
      </Text>
      {section === 'deliveries' && <PushNotificationsControl token={token} />}
      {section === 'deliveries' && dashboard && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo de asignación</Text>
          <Text style={styles.muted}>
            {automaticAcceptance
              ? 'Automático: TunGo te asigna el pedido más cercano si tu ubicación está actualizada y no tienes otra entrega activa.'
              : 'Manual: revisa los pedidos disponibles y elige aceptar o rechazar. Un rechazo solo lo oculta para ti.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={savingAcceptanceMode}
            onPress={() => void toggleAutomaticAcceptance()}
            style={[styles.primaryButton, savingAcceptanceMode && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {savingAcceptanceMode
                ? 'Actualizando modo…'
                : automaticAcceptance
                  ? 'Cambiar a aceptación manual'
                  : 'Activar aceptación automática'}
            </Text>
          </Pressable>
          {automaticAcceptance && locationMessage && (
            <Text style={styles.notice}>{locationMessage}</Text>
          )}
        </View>
      )}
      {section === 'deliveries' && dashboard && (
        <View style={styles.stats}>
          <Stat label="Disponibles" value={String(dashboard.disponibles.length)} />
          <Stat label="En ruta" value={String(activeOrders.length)} />
          <Stat label="Completados" value={String(dashboard.pedidos.filter((order) => order.estado === 'entregado').length)} />
        </View>
      )}
      {section === 'earnings' && <View style={styles.earnings}>
        <Text style={styles.sectionTitle}>Ganancias por entregas</Text>
        <Text style={styles.earningsAmount}>{formatCurrency(dashboard?.ganancias ?? 0)}</Text>
        <Text style={styles.muted}>
          {formatCurrency(dashboard?.total_tarifa ?? 0)} en tarifas de domicilio completadas.
        </Text>
      </View>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {loading && !dashboard ? (
        <ActivityIndicator color="#FF7A16" size="large" />
      ) : (
        <>
          {section === 'map' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu ubicación y destinos</Text>
              <CourierMap
                label="Tu ubicación actual"
                latitude={location?.latitude ?? null}
                longitude={location?.longitude ?? null}
                updatedAt={locationUpdatedAt}
              />
              <Text style={styles.muted}>
                {locationMessage ?? 'Tu ubicación solo se comparte con el cliente durante un pedido activo.'}
              </Text>
              {!sharingLocation && (
                <Pressable onPress={() => void enableLocation()} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {activeOrders.length
                      ? 'Activar ubicación para esta entrega'
                      : 'Activar ubicación cuando aceptes un pedido'}
                  </Text>
                </Pressable>
              )}
              {activeOrders.length ? activeOrders.map((order) => {
                const headingToCustomer = ['recogido', 'en_camino'].includes(order.estado);
                const destination = headingToCustomer
                  ? order.direccion_entrega
                  : order.establecimiento?.direccion;

                return (
                  <View key={order.id} style={styles.card}>
                    <Text style={styles.orderTitle}>Pedido #{order.id} · {order.estado.replaceAll('_', ' ')}</Text>
                    <Text style={styles.muted}>
                      {headingToCustomer ? 'Entrega' : 'Recogida'}: {destination ?? 'Dirección no disponible'}
                    </Text>
                    <Pressable
                      disabled={!destination}
                      onPress={() => destination && void openRoute(destination)}
                      style={[styles.secondaryButton, !destination && styles.disabled]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Navegar a {headingToCustomer ? 'cliente' : 'establecimiento'}
                      </Text>
                    </Pressable>
                    {!headingToCustomer && (
                      <Pressable
                        onPress={() => void openRoute(order.direccion_entrega)}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>Ver dirección del cliente</Text>
                      </Pressable>
                    )}
                  </View>
                );
              }) : (
                <Text style={styles.muted}>El mapa está disponible. Acepta un pedido para ver sus destinos.</Text>
              )}
            </View>
          )}

          {section === 'deliveries' && (
          <>
          <Text style={styles.sectionTitle}>Pedidos disponibles</Text>
          {dashboard?.disponibles.length ? dashboard.disponibles.map((order) => (
            <View key={order.id} style={styles.card}>
              <Text style={styles.orderTitle}>Pedido #{order.id}</Text>
              <Text style={styles.muted}>Establecimiento: {order.establecimiento?.nombre ?? 'TunGo'}</Text>
              <Text style={styles.muted}>Recoger en: {order.establecimiento?.direccion ?? 'Dirección no disponible'}</Text>
              <Text style={styles.muted}>Entregar en: {order.direccion_entrega}</Text>
              <Text style={styles.amount}>Tu ganancia: {formatCurrency(order.ganancia_domiciliario)}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={busyOrder === order.id}
                onPress={() => void acceptOrder(order.id)}
                style={[styles.primaryButton, busyOrder === order.id && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {busyOrder === order.id ? 'Aceptando…' : 'Aceptar pedido'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busyOrder === order.id}
                onPress={() => void rejectOrder(order.id)}
                style={[styles.secondaryButton, busyOrder === order.id && styles.disabled]}
              >
                <Text style={styles.secondaryButtonText}>
                  {busyOrder === order.id ? 'Actualizando…' : 'Rechazar este pedido'}
                </Text>
              </Pressable>
            </View>
          )) : (
            <Text style={styles.muted}>No hay pedidos nuevos en este momento.</Text>
          )}

          <Text style={styles.sectionTitle}>Entregas activas</Text>
          {activeOrders.length ? activeOrders.map((order) => (
            <View key={order.id} style={styles.card}>
              <Text style={styles.orderTitle}>Pedido #{order.id} · {order.estado.replaceAll('_', ' ')}</Text>
              <Text style={styles.muted}>Recoger: {order.establecimiento?.nombre ?? 'Establecimiento'}</Text>
              <Text style={styles.muted}>Destino: {order.direccion_entrega}</Text>
              <Text style={styles.amount}>Ganancia: {formatCurrency(order.ganancia_domiciliario)}</Text>
              {order.estado === 'confirmado' && (
                <Pressable
                  onPress={() => void openRoute(order.establecimiento?.direccion ?? 'Tunja')}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Navegar al establecimiento</Text>
                </Pressable>
              )}
              {order.estado === 'llego_tienda' && (
                <>
                  <Text style={styles.muted}>Solicita el código de recogida de 6 dígitos al establecimiento.</Text>
                  <TextInput
                    accessibilityLabel={`Código de recogida del pedido ${order.id}`}
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) => setCodes((current) => ({ ...current, [order.id]: value.replace(/\D/g, '') }))}
                    placeholder="Código de recogida"
                    placeholderTextColor="#777C75"
                    style={styles.input}
                    value={codes[order.id] ?? ''}
                  />
                </>
              )}
              {order.estado === 'recogido' && (
                <Pressable
                  onPress={() => void openRoute(order.direccion_entrega, order.establecimiento?.direccion ?? undefined)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Navegar a la entrega</Text>
                </Pressable>
              )}
              {order.cliente && (
                <Text style={styles.muted}>
                  Cliente: {order.cliente.name}{order.cliente.telefono ? ` · ${order.cliente.telefono}` : ''}
                </Text>
              )}
              {order.estado === 'en_camino' && !order.confirmado_por_cliente && (
                <Text style={styles.notice}>Espera a que el cliente confirme la entrega y el pago.</Text>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={
                  busyOrder === order.id ||
                  (order.estado === 'en_camino' && (!order.pagado || !order.confirmado_por_cliente))
                }
                onPress={() => void advanceOrder(order)}
                style={[
                  styles.primaryButton,
                  (busyOrder === order.id || (order.estado === 'en_camino' && (!order.pagado || !order.confirmado_por_cliente))) && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {busyOrder === order.id
                    ? 'Actualizando…'
                    : order.estado === 'confirmado'
                      ? 'Llegué al establecimiento'
                      : order.estado === 'llego_tienda'
                        ? 'Validar código y recoger'
                        : order.estado === 'recogido'
                          ? 'Iniciar entrega'
                          : 'Confirmar entrega finalizada'}
                </Text>
              </Pressable>
            </View>
          )) : (
            <Text style={styles.muted}>Acepta un pedido para iniciar una entrega.</Text>
          )}

          </>
          )}

          {section === 'history' && (
          <>
          <Text style={styles.sectionTitle}>Historial de entregas</Text>
          {dashboard?.pedidos.filter((order) => order.estado === 'entregado').length ? (
            dashboard.pedidos.filter((order) => order.estado === 'entregado').map((order) => (
              <View key={order.id} style={styles.historyRow}>
                <View style={styles.historyInfo}>
                  <Text style={styles.orderTitle}>Pedido #{order.id}</Text>
                  <Text style={styles.muted}>{order.establecimiento?.nombre ?? 'Establecimiento'} · {order.created_at ? new Date(order.created_at).toLocaleDateString('es-CO') : 'Fecha no disponible'}</Text>
                </View>
                <Text style={styles.amount}>{formatCurrency(order.ganancia_domiciliario)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Las entregas completadas aparecerán aquí.</Text>
          )}
          </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: '#090A09', flexGrow: 1, padding: 20, paddingBottom: 36 },
  eyebrow: { color: '#FF7A16', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.2, marginTop: 8 },
  title: { color: '#F7F3EB', fontSize: 27, fontWeight: '900', marginTop: 4 },
  muted: { color: '#A7AAA3', fontSize: 12, lineHeight: 18, marginTop: 6 },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  stat: { backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, flex: 1, padding: 11 },
  statValue: { color: '#FFB52D', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#A7AAA3', fontSize: 10, marginTop: 4 },
  earnings: { backgroundColor: '#141614', borderColor: '#30332F', borderLeftColor: '#FF7A16', borderLeftWidth: 3, borderWidth: 1, marginVertical: 8, padding: 14 },
  earningsAmount: { color: '#FFB52D', fontSize: 28, fontWeight: '900', marginTop: 4 },
  sectionTitle: { color: '#F7F3EB', fontSize: 19, fontWeight: '900', marginBottom: 8, marginTop: 18 },
  section: { backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, marginTop: 12, padding: 13 },
  card: { backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, marginTop: 10, padding: 14 },
  orderTitle: { color: '#F7F3EB', fontSize: 15, fontWeight: '900' },
  amount: { color: '#FFB52D', fontSize: 13, fontWeight: '900', marginTop: 8 },
  input: { backgroundColor: '#090A09', borderColor: '#30332F', borderWidth: 1, color: '#F7F3EB', fontSize: 18, letterSpacing: 4, marginTop: 10, padding: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: '#FFB52D', marginTop: 12, padding: 13 },
  primaryButtonText: { color: '#090A09', fontSize: 12, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#FF7A16', borderWidth: 1, marginTop: 10, padding: 11 },
  secondaryButtonText: { color: '#FFB52D', fontSize: 12, fontWeight: '800' },
  notice: { backgroundColor: '#172016', borderColor: '#344532', borderWidth: 1, color: '#C8E0BD', fontSize: 12, lineHeight: 18, marginTop: 10, padding: 10 },
  error: { backgroundColor: '#261512', borderColor: '#7D3A24', borderWidth: 1, color: '#FFB59A', fontSize: 13, lineHeight: 19, marginVertical: 10, padding: 12 },
  historyRow: { alignItems: 'center', backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 12 },
  historyInfo: { flex: 1, paddingRight: 8 },
  disabled: { opacity: 0.5 },
});
