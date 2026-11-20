import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BrandHeader } from '../../components/BrandHeader';
import { useAuth } from '../../lib/auth';
import {
  EstablishmentMenu,
  getErrorMessage,
  getEstablishmentMenu,
  Product,
} from '../../lib/api';
import { useCart } from '../../lib/cart';
import { formatCurrency } from '../../lib/format';

export default function EstablishmentScreen() {
  const { user, ready: authReady } = useAuth();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [menu, setMenu] = useState<EstablishmentMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    addItem,
    clearCart,
    establishment: cartEstablishment,
  } = useCart();

  useEffect(() => {
    if (!authReady || !user) {
      return;
    }

    if (!user.verified) {
      router.replace('/verificar');
    } else if (user.rol !== 'cliente') {
      router.replace('/panel');
    }
  }, [authReady, user]);

  const requestMenu = useCallback(
    () =>
      id
        ? getEstablishmentMenu(id)
        : Promise.reject(
            new Error('No encontramos el identificador del establecimiento.'),
          ),
    [id],
  );

  useEffect(() => {
    let active = true;

    void requestMenu()
      .then((result) => {
        if (active) {
          setMenu(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [requestMenu]);

  const retryMenu = () => {
    setLoading(true);

    void requestMenu()
      .then((result) => {
        setMenu(result);
        setError(null);
      })
      .catch((loadError: unknown) => {
        setError(getErrorMessage(loadError));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleAdd = (product: Product) => {
    if (!menu) {
      return;
    }

    if (cartEstablishment && cartEstablishment.id !== menu.id) {
      Alert.alert(
        'Un solo aliado por pedido',
        `Tu carrito ya tiene productos de ${cartEstablishment.nombre}. ¿Quieres vaciarlo y empezar con ${menu.nombre}?`,
        [
          { text: 'Seguir en este menú', style: 'cancel' },
          {
            text: 'Vaciar y agregar',
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem(menu, product);
            },
          },
        ],
      );
      return;
    }

    addItem(menu, product);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BrandHeader />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Explorar aliados</Text>
      </Pressable>
      {loading && (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#FF7A16" size="large" />
          <Text style={styles.stateText}>Cargando menú…</Text>
        </View>
      )}
      {!loading && error && (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>No pudimos cargar este menú</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={retryMenu}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Intentar de nuevo</Text>
          </Pressable>
        </View>
      )}
      {!loading && !error && menu && (
        <>
          <View style={styles.storeHero}>
            <View style={styles.storeHeroMark}>
              <Text style={styles.storeHeroLetter}>T</Text>
            </View>
            <Text style={styles.heroEyebrow}>ALIADO LOCAL · TUNJA</Text>
            <Text style={styles.storeTitle}>{menu.nombre}</Text>
            <Text style={styles.storeDescription}>
              {menu.descripcion || 'Productos locales, hechos para disfrutar.'}
            </Text>
            {!!menu.direccion && (
              <Text style={styles.address}>⌖  {menu.direccion}</Text>
            )}
          </View>
          <View style={styles.menuHeading}>
            <Text style={styles.menuEyebrow}>HECHO CERCA DE TI</Text>
            <Text style={styles.menuTitle}>El menú</Text>
            <Text style={styles.menuSubtitle}>
              {menu.productos.length} productos disponibles
            </Text>
          </View>
          {menu.productos.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.stateTitle}>Menú en preparación</Text>
              <Text style={styles.stateText}>
                Este aliado aún no tiene productos disponibles.
              </Text>
            </View>
          ) : (
            menu.productos.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productBadge}>
                  <Text style={styles.productBadgeText}>T</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.nombre}</Text>
                  {!!product.descripcion && (
                    <Text style={styles.productDescription}>
                      {product.descripcion}
                    </Text>
                  )}
                  <Text style={styles.productPrice}>
                    {formatCurrency(Number(product.precio))}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar ${product.nombre} al carrito`}
                  onPress={() => handleAdd(product)}
                  style={({ pressed }) => [
                    styles.addButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.addButtonText}>+</Text>
                </Pressable>
              </View>
            ))
          )}
          <View style={styles.cartNote}>
            <Text style={styles.cartNoteTitle}>¿Ya elegiste?</Text>
            <Text style={styles.cartNoteText}>
              Tu pedido se arma con productos de un solo aliado.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/carrito')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Ver mi carrito  ›</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#090A09',
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 15,
    paddingVertical: 5,
  },
  backText: {
    color: '#FFB52D',
    fontSize: 13,
    fontWeight: '700',
  },
  storeHero: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  storeHeroMark: {
    alignItems: 'center',
    borderColor: '#FF7A16',
    borderRadius: 29,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    marginBottom: 14,
    width: 58,
  },
  storeHeroLetter: {
    color: '#FF7A16',
    fontSize: 40,
    fontStyle: 'italic',
    fontWeight: '900',
    lineHeight: 48,
  },
  heroEyebrow: {
    color: '#FF7A16',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  storeTitle: {
    color: '#F7F3EB',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 7,
    textAlign: 'center',
  },
  storeDescription: {
    color: '#A7AAA3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  address: {
    color: '#FFB52D',
    fontSize: 11,
    marginTop: 13,
  },
  menuHeading: {
    marginBottom: 14,
    marginTop: 27,
  },
  menuEyebrow: {
    color: '#FF7A16',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  menuTitle: {
    color: '#F7F3EB',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 3,
  },
  menuSubtitle: {
    color: '#A7AAA3',
    fontSize: 11,
    marginTop: 3,
  },
  productCard: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 11,
    padding: 13,
  },
  productBadge: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  productBadgeText: {
    color: '#FF7A16',
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  productInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  productName: {
    color: '#F7F3EB',
    fontSize: 14,
    fontWeight: '800',
  },
  productDescription: {
    color: '#A7AAA3',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  productPrice: {
    color: '#FFB52D',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 7,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  addButtonText: {
    color: '#090A09',
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 29,
  },
  cartNote: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    marginTop: 14,
    padding: 17,
  },
  cartNoteTitle: {
    color: '#F7F3EB',
    fontSize: 15,
    fontWeight: '800',
  },
  cartNoteText: {
    color: '#A7AAA3',
    fontSize: 12,
    marginTop: 4,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 5,
  },
  secondaryButtonText: {
    color: '#FFB52D',
    fontSize: 12,
    fontWeight: '800',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    padding: 22,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    padding: 22,
  },
  stateTitle: {
    color: '#F7F3EB',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#A7AAA3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    marginTop: 15,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#090A09',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.76,
  },
});
