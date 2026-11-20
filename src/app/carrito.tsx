import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { BrandHeader } from '../components/BrandHeader';
import { useCart } from '../lib/cart';
import { formatCurrency } from '../lib/format';
import { createOrder, getErrorMessage } from '../lib/api';

export default function CartScreen() {
  const { user, token, ready } = useAuth();
  const { establishment, items, total, clearCart, setQuantity } = useCart();
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (user && !user.verified) {
      router.replace('/verificar');
    } else if (user && user.rol !== 'cliente') {
      router.replace('/panel');
    }
  }, [ready, user]);

  const handleCheckout = async () => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    if (!address.trim()) {
      setError('Escribe la dirección donde quieres recibir el pedido.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrder(token, {
        direccion_entrega: address.trim(),
        items: items.map(({ product, quantity }) => ({
          product_id: product.id,
          quantity,
        })),
      });
      clearCart();
      router.replace(`/pedido/${order.id}`);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError));
    } finally {
      setSubmitting(false);
    }
  };

  if (
    !ready ||
    (user && (!user.verified || user.rol !== 'cliente'))
  ) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#FF7A16" size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BrandHeader />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Seguir explorando</Text>
      </Pressable>
      <Text style={styles.eyebrow}>TU PEDIDO</Text>
      <Text style={styles.title}>Mi carrito</Text>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>T</Text>
          </View>
          <Text style={styles.emptyTitle}>Tu carrito está esperando</Text>
          <Text style={styles.emptyText}>
            Explora los aliados de Tunja y agrega algo que te guste.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Descubrir aliados</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.allyCard}>
            <View style={styles.allyMark}>
              <Text style={styles.allyMarkText}>T</Text>
            </View>
            <View style={styles.allyInfo}>
              <Text style={styles.allyLabel}>TU ALIADO</Text>
              <Text style={styles.allyName}>{establishment?.nombre}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vaciar carrito"
              onPress={() =>
                Alert.alert('¿Vaciar carrito?', 'Se quitarán todos los productos.', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Vaciar', style: 'destructive', onPress: clearCart },
                ])
              }
            >
              <Text style={styles.clearButton}>Vaciar</Text>
            </Pressable>
          </View>
          {items.map(({ product, quantity }) => (
            <View key={product.id} style={styles.itemCard}>
              <View style={styles.itemMark}>
                <Text style={styles.itemMarkText}>T</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{product.nombre}</Text>
                <Text style={styles.itemUnitPrice}>
                  {formatCurrency(Number(product.precio))}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatCurrency(Number(product.precio) * quantity)}
                </Text>
              </View>
              <View style={styles.quantityControl}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar una unidad de ${product.nombre}`}
                  onPress={() => setQuantity(product.id, quantity - 1)}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </Pressable>
                <Text style={styles.quantity}>{quantity}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar una unidad de ${product.nombre}`}
                  onPress={() => setQuantity(product.id, quantity + 1)}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Productos</Text>
              <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Domicilio</Text>
              <Text style={styles.summaryPending}>Según la zona</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Productos</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
          <Text style={styles.addressLabel}>Dirección de entrega</Text>
          <TextInput
            autoComplete="street-address"
            multiline
            onChangeText={setAddress}
            placeholder="Barrio, calle, número y referencias"
            placeholderTextColor="#777C75"
            style={styles.addressField}
            value={address}
          />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void handleCheckout()}
            style={({ pressed }) => [
              styles.checkoutButton,
              submitting && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.checkoutText}>
              {submitting ? 'Enviando pedido…' : `Confirmar pedido · ${formatCurrency(total)}`}
            </Text>
          </Pressable>
          <Text style={styles.footerNote}>
            El domicilio se calcula en el servidor según la zona de entrega.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    backgroundColor: '#090A09',
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 4,
  },
  backText: {
    color: '#FFB52D',
    fontSize: 13,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#FF7A16',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    color: '#F7F3EB',
    fontSize: 27,
    fontWeight: '900',
    marginBottom: 17,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    borderColor: '#30332F',
    borderRadius: 2,
    height: 54,
    justifyContent: 'center',
    borderWidth: 1,
    width: 54,
  },
  emptyIconText: {
    color: '#FF7A16',
    fontSize: 36,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#F7F3EB',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: '#A7AAA3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    marginTop: 17,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#090A09',
    fontSize: 12,
    fontWeight: '800',
  },
  allyCard: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 11,
    padding: 13,
  },
  allyMark: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    borderColor: '#30332F',
    borderRadius: 2,
    height: 42,
    justifyContent: 'center',
    borderWidth: 1,
    width: 42,
  },
  allyMarkText: {
    color: '#FF7A16',
    fontSize: 27,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  allyInfo: {
    flex: 1,
    marginLeft: 11,
  },
  allyLabel: {
    color: '#FF7A16',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  allyName: {
    color: '#F7F3EB',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  clearButton: {
    color: '#FF7A16',
    fontSize: 11,
    fontWeight: '700',
    padding: 5,
  },
  itemCard: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  itemMark: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    borderColor: '#30332F',
    borderRadius: 2,
    height: 42,
    justifyContent: 'center',
    borderWidth: 1,
    width: 42,
  },
  itemMarkText: {
    color: '#FF7A16',
    fontSize: 27,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 10,
  },
  itemName: {
    color: '#F7F3EB',
    fontSize: 12,
    fontWeight: '800',
  },
  itemUnitPrice: {
    color: '#A7AAA3',
    fontSize: 10,
    marginTop: 3,
  },
  itemPrice: {
    color: '#FFB52D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  quantityControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  quantityButton: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    borderColor: '#30332F',
    borderRadius: 2,
    height: 29,
    justifyContent: 'center',
    borderWidth: 1,
    width: 29,
  },
  quantityButtonText: {
    color: '#F7F3EB',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
  },
  quantity: {
    color: '#F7F3EB',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 13,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  summaryTitle: {
    color: '#F7F3EB',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 13,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: '#A7AAA3',
    fontSize: 12,
  },
  summaryValue: {
    color: '#F7F3EB',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryPending: {
    color: '#FF7A16',
    fontSize: 10,
  },
  divider: {
    backgroundColor: '#30332F',
    height: 1,
    marginBottom: 12,
    marginTop: 1,
  },
  totalLabel: {
    color: '#F7F3EB',
    fontSize: 13,
    fontWeight: '800',
  },
  totalValue: {
    color: '#FFB52D',
    fontSize: 15,
    fontWeight: '900',
  },
  notice: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    flexDirection: 'row',
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
  },
  noticeIcon: {
    alignItems: 'center',
    borderColor: '#FF7A16',
    borderRadius: 2,
    borderWidth: 1,
    color: '#FFB52D',
    fontSize: 12,
    fontWeight: '800',
    height: 20,
    lineHeight: 19,
    marginRight: 9,
    textAlign: 'center',
    width: 20,
  },
  noticeText: {
    color: '#A7AAA3',
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  checkoutButton: {
    alignItems: 'center',
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    marginTop: 14,
    paddingVertical: 15,
  },
  checkoutText: {
    color: '#090A09',
    fontSize: 13,
    fontWeight: '800',
  },
  addressLabel: {
    color: '#F7F3EB',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },
  addressField: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    color: '#F7F3EB',
    minHeight: 76,
    padding: 12,
    textAlignVertical: 'top',
  },
  error: {
    backgroundColor: '#261512',
    borderColor: '#7D3A24',
    borderWidth: 1,
    color: '#FFB59A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    padding: 12,
  },
  disabled: {
    opacity: 0.58,
  },
  footerNote: {
    color: '#A7AAA3',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 9,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
