import { useCallback, useState } from 'react';
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
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { BrandHeader } from './BrandHeader';
import { PushNotificationsControl } from './PushNotificationsControl';
import {
  BUSINESS_CANCELLATION_REASONS,
  BusinessDashboard as BusinessData,
  BusinessCancellationReason,
  cancelBusinessOrder,
  createBusinessProduct,
  formatOrderCancellationReason,
  getBusinessDashboard,
  getErrorMessage,
  Order,
  Product,
  updateBusinessOrder,
  updateBusinessLocation,
  updateBusinessProduct,
} from '../lib/api';
import { formatCurrency } from '../lib/format';

type Props = {
  token: string | null;
  section?: 'overview' | 'catalog' | 'orders';
};

export function BusinessDashboard({
  token,
  section = 'overview',
}: Props) {
  const [dashboard, setDashboard] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState<BusinessCancellationReason | null>(null);
  const [cancellationDetail, setCancellationDetail] = useState('');
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    if (refresh) setRefreshing(true);
    try {
      setDashboard(await getBusinessDashboard(token));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [load]));

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setEditing(null);
  };

  const editProduct = (product: Product) => {
    setEditing(product);
    setName(product.nombre);
    setDescription(product.descripcion ?? '');
    setPrice(String(product.precio));
  };

  const saveProduct = async () => {
    if (!token) return;
    const productPrice = Number(price.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(productPrice) || productPrice < 0) {
      setError('Escribe el nombre del producto y un precio válido.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const productData = {
        nombre: name.trim(),
        descripcion: description.trim(),
        precio: productPrice,
      };
      if (editing) {
        await updateBusinessProduct(token, editing.id, productData);
      } else {
        await createBusinessProduct(token, productData);
      }
      resetForm();
      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (product: Product) => {
    if (!token) return;
    setError(null);
    try {
      await updateBusinessProduct(token, product.id, {
        disponible: !product.disponible,
      });
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  };

  const saveBusinessLocation = async () => {
    if (!token) return;
    setSavingLocation(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Permite el acceso a la ubicación para guardar dónde está tu establecimiento.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await updateBusinessLocation(token, {
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
      });
      setDashboard((current) => current ? {
        ...current,
        establecimiento: {
          ...current.establecimiento,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        },
      } : current);
    } catch (locationError) {
      setError(getErrorMessage(locationError));
    } finally {
      setSavingLocation(false);
    }
  };

  const confirmOrder = async (order: Order) => {
    if (!token) return;
    setError(null);
    try {
      await updateBusinessOrder(token, order.id, 'confirmado');
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  };

  const cancelOrder = async (order: Order) => {
    if (!token || !cancellationReason) return;
    if (cancellationReason === 'otro' && !cancellationDetail.trim()) {
      setError('Escribe el motivo específico para poder cancelar el pedido.');
      return;
    }

    setBusyOrderId(order.id);
    setError(null);
    try {
      await cancelBusinessOrder(token, order.id, {
        motivo_cancelacion: cancellationReason,
        ...(cancellationDetail.trim()
          ? { detalle_cancelacion: cancellationDetail.trim() }
          : {}),
      });
      setCancelOrderId(null);
      setCancellationReason(null);
      setCancellationDetail('');
      await load();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setBusyOrderId(null);
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
      <Text style={styles.eyebrow}>PANEL COMERCIAL</Text>
      <Text style={styles.title}>
        {section === 'catalog'
          ? 'Mi catálogo'
          : section === 'orders'
            ? 'Pedidos del negocio'
            : dashboard?.establecimiento.nombre ?? 'Tu negocio'}
      </Text>
      <Text style={styles.muted}>
        Administra tu catálogo y atiende los pedidos. Se actualiza automáticamente cada 10 segundos.
      </Text>
      {section !== 'catalog' && <PushNotificationsControl token={token} />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {loading && !dashboard ? (
        <ActivityIndicator color="#FF7A16" size="large" />
      ) : (
        <>
          {section === 'overview' && dashboard && (
            <>
            <View style={styles.stats}>
              <Stat label="Nuevos" value={String(dashboard.pedidos.filter((order) => order.estado === 'recibido').length)} />
              <Stat label="En operación" value={String(dashboard.pedidos.filter((order) => ['confirmado', 'llego_tienda', 'recogido', 'en_camino'].includes(order.estado)).length)} />
              <Stat label="Productos activos" value={String(dashboard.productos.filter((product) => product.disponible).length)} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación del establecimiento</Text>
              <Text style={styles.muted}>
                {dashboard.establecimiento.latitud !== null && dashboard.establecimiento.longitud !== null
                  ? 'Ubicación guardada. TunGo la usa para asignar pedidos al domiciliario automático más cercano.'
                  : 'Guarda tu ubicación para que TunGo pueda elegir al domiciliario automático más cercano. Sin ella, los pedidos quedan disponibles para aceptación manual.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={savingLocation}
                onPress={() => void saveBusinessLocation()}
                style={[styles.primaryButton, savingLocation && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {savingLocation ? 'Guardando ubicación…' : 'Guardar ubicación actual'}
                </Text>
              </Pressable>
            </View>
            </>
          )}

          {section === 'catalog' && (
          <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{editing ? 'Editar producto' : 'Agregar producto'}</Text>
            <TextInput
              accessibilityLabel="Nombre del producto"
              maxLength={120}
              onChangeText={setName}
              placeholder="Nombre"
              placeholderTextColor="#777C75"
              style={styles.input}
              value={name}
            />
            <TextInput
              accessibilityLabel="Descripción del producto"
              maxLength={500}
              onChangeText={setDescription}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#777C75"
              style={styles.input}
              value={description}
            />
            <TextInput
              accessibilityLabel="Precio del producto"
              keyboardType="decimal-pad"
              onChangeText={setPrice}
              placeholder="Precio en pesos"
              placeholderTextColor="#777C75"
              style={styles.input}
              value={price}
            />
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void saveProduct()}
              style={[styles.primaryButton, saving && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar producto'}
              </Text>
            </Pressable>
            {editing && (
              <Pressable onPress={resetForm} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancelar edición</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.sectionTitle}>Mi catálogo</Text>
          {dashboard?.productos.length ? dashboard.productos.map((product) => (
            <View key={product.id} style={styles.card}>
              <Text style={styles.productName}>{product.nombre}</Text>
              <Text style={styles.muted}>{product.descripcion || 'Sin descripción'}</Text>
              <Text style={styles.amount}>{formatCurrency(Number(product.precio))}</Text>
              <Text style={product.disponible ? styles.available : styles.paused}>
                {product.disponible ? 'Visible en catálogo' : 'Pausado'}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={() => editProduct(product)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Editar</Text>
                </Pressable>
                <Pressable onPress={() => void toggleProduct(product)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{product.disponible ? 'Pausar' : 'Activar'}</Text>
                </Pressable>
              </View>
            </View>
          )) : (
            <Text style={styles.muted}>Todavía no publicas productos.</Text>
          )}
          </>
          )}

          {section === 'orders' && (
          <>
          <Text style={[styles.sectionTitle, styles.ordersHeading]}>Pedidos</Text>
          {dashboard?.pedidos.length ? dashboard.pedidos.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.orderHeading}>
                <Text style={styles.productName}>Pedido #{order.id}</Text>
                <Text style={styles.amount}>{formatCurrency(order.total)}</Text>
              </View>
              <Text style={styles.muted}>Cliente: {order.cliente?.name ?? 'Cliente'}</Text>
              <Text style={styles.muted}>Entrega: {order.direccion_entrega}</Text>
              <Text style={styles.muted}>
                {order.detalles.map((line) => `${line.cantidad} × ${line.nombre}`).join(' · ')}
              </Text>
              <Text style={styles.status}>{order.estado.replaceAll('_', ' ')}</Text>
              {order.estado === 'cancelado' && order.motivo_cancelacion && (
                <Text style={styles.muted}>
                  Motivo: {formatOrderCancellationReason(
                    order.motivo_cancelacion,
                    order.detalle_cancelacion,
                  )}
                </Text>
              )}
              {order.codigo_recogida && (
                <View style={styles.pickupCode}>
                  <Text style={styles.muted}>Código de recogida para el domiciliario</Text>
                  <Text style={styles.code}>{order.codigo_recogida}</Text>
                  <Text style={styles.muted}>Compártelo cuando esté en el local para retirar este pedido.</Text>
                </View>
              )}
              {order.domiciliario && (
                <Text style={styles.muted}>Domiciliario: {order.domiciliario.name}</Text>
              )}
              {order.estado === 'recibido' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void confirmOrder(order)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Confirmar y buscar domiciliario</Text>
                </Pressable>
              )}
              {['recibido', 'confirmado'].includes(order.estado)
                && !order.domiciliario
                && !order.pagado && (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setCancelOrderId(cancelOrderId === order.id ? null : order.id);
                        setCancellationReason(null);
                        setCancellationDetail('');
                        setError(null);
                      }}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>
                        {cancelOrderId === order.id ? 'Cerrar opciones' : 'Cancelar pedido'}
                      </Text>
                    </Pressable>
                    {cancelOrderId === order.id && (
                      <View style={styles.cancelPanel}>
                        <Text style={styles.muted}>Selecciona el motivo de cancelación:</Text>
                        {BUSINESS_CANCELLATION_REASONS.map((reason) => (
                          <Pressable
                            accessibilityRole="radio"
                            accessibilityState={{ checked: cancellationReason === reason.value }}
                            key={reason.value}
                            onPress={() => setCancellationReason(reason.value)}
                            style={[
                              styles.reasonOption,
                              cancellationReason === reason.value && styles.selectedReason,
                            ]}
                          >
                            <Text style={styles.reasonText}>
                              {cancellationReason === reason.value ? '● ' : '○ '}
                              {reason.label}
                            </Text>
                          </Pressable>
                        ))}
                        {cancellationReason === 'otro' && (
                          <TextInput
                            accessibilityLabel="Detalle del motivo de cancelación"
                            maxLength={300}
                            multiline
                            onChangeText={setCancellationDetail}
                            placeholder="Explica el motivo"
                            placeholderTextColor="#777C75"
                            style={styles.input}
                            value={cancellationDetail}
                          />
                        )}
                        <Pressable
                          accessibilityRole="button"
                          disabled={
                            busyOrderId === order.id
                            || !cancellationReason
                            || (cancellationReason === 'otro' && !cancellationDetail.trim())
                          }
                          onPress={() => void cancelOrder(order)}
                          style={[
                            styles.cancelButton,
                            (busyOrderId === order.id || !cancellationReason) && styles.disabled,
                          ]}
                        >
                          <Text style={styles.cancelButtonText}>
                            {busyOrderId === order.id ? 'Cancelando…' : 'Confirmar cancelación'}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                )}
              {['recibido', 'confirmado'].includes(order.estado)
                && order.pagado && (
                  <Text style={styles.warning}>
                    No se puede cancelar desde aquí: este pedido ya está pagado y requiere tramitar el reembolso primero.
                  </Text>
                )}
              {['recibido', 'confirmado'].includes(order.estado)
                && order.domiciliario && (
                  <Text style={styles.warning}>
                    El domiciliario ya aceptó este pedido y no se puede cancelar desde el establecimiento.
                  </Text>
                )}
            </View>
          )) : (
            <Text style={styles.muted}>Cuando llegue un pedido, aparecerá aquí.</Text>
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
  section: { backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, marginVertical: 10, padding: 14 },
  sectionTitle: { color: '#F7F3EB', fontSize: 19, fontWeight: '900', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#090A09', borderColor: '#30332F', borderWidth: 1, color: '#F7F3EB', marginTop: 9, padding: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: '#FFB52D', marginTop: 12, padding: 13 },
  primaryButtonText: { color: '#090A09', fontSize: 12, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#FF7A16', borderWidth: 1, marginTop: 9, padding: 10 },
  secondaryButtonText: { color: '#FFB52D', fontSize: 11, fontWeight: '800' },
  cancelButton: { alignItems: 'center', borderColor: '#B6533C', borderWidth: 1, marginTop: 10, padding: 11 },
  cancelButtonText: { color: '#FF9C82', fontSize: 12, fontWeight: '900' },
  cancelPanel: { backgroundColor: '#090A09', borderColor: '#30332F', borderWidth: 1, marginTop: 10, padding: 12 },
  reasonOption: { borderBottomColor: '#30332F', borderBottomWidth: 1, paddingVertical: 11 },
  selectedReason: { backgroundColor: '#261512' },
  reasonText: { color: '#F7F3EB', fontSize: 12, lineHeight: 18 },
  warning: { color: '#F2B080', fontSize: 12, lineHeight: 18, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  card: { backgroundColor: '#141614', borderColor: '#30332F', borderWidth: 1, marginTop: 10, padding: 14 },
  productName: { color: '#F7F3EB', fontSize: 15, fontWeight: '800' },
  amount: { color: '#FFB52D', fontSize: 14, fontWeight: '900', marginTop: 7 },
  available: { color: '#A9D6A0', fontSize: 11, marginTop: 6 },
  paused: { color: '#F2B080', fontSize: 11, marginTop: 6 },
  orderHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  status: { color: '#FFB52D', fontSize: 12, fontWeight: '900', marginTop: 8, textTransform: 'capitalize' },
  pickupCode: { backgroundColor: '#090A09', borderLeftColor: '#FF7A16', borderLeftWidth: 3, marginTop: 12, padding: 11 },
  code: { color: '#FFB52D', fontFamily: 'monospace', fontSize: 26, fontWeight: '900', letterSpacing: 5, marginTop: 3 },
  error: { backgroundColor: '#261512', borderColor: '#7D3A24', borderWidth: 1, color: '#FFB59A', fontSize: 13, lineHeight: 19, marginVertical: 10, padding: 12 },
  ordersHeading: { marginTop: 24 },
  disabled: { opacity: 0.55 },
});
