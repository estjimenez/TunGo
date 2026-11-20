import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Href, router } from 'expo-router';
import { BrandHeader } from '../components/BrandHeader';
import { useAuth } from '../lib/auth';
import {
  Establishment,
  getErrorMessage,
  getEstablishments,
  getImageUrl,
} from '../lib/api';

export default function HomeScreen() {
  const { user, ready } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getEstablishments()
      .then((results) => {
        if (active) {
          setEstablishments(results);
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
  }, []);

  useEffect(() => {
    if (!ready || !user) {
      return;
    }

    if (!user.verified) {
      router.replace('/verificar');
    } else {
      router.replace('/app' as Href);
    }
  }, [ready, user]);

  const refreshEstablishments = () => {
    setRefreshing(true);

    void getEstablishments()
      .then((results) => {
        setEstablishments(results);
        setError(null);
      })
      .catch((loadError: unknown) => {
        setError(getErrorMessage(loadError));
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  const filteredEstablishments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');

    if (!normalizedQuery) {
      return establishments;
    }

    return establishments.filter((establishment) =>
      `${establishment.nombre} ${establishment.descripcion ?? ''}`
        .toLocaleLowerCase('es')
        .includes(normalizedQuery),
    );
  }, [establishments, query]);

  const renderEstablishment = ({ item, index }: { item: Establishment; index: number }) => {
    const imageUrl = item.imagen ? getImageUrl(item.imagen) : null;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/establecimiento/${item.id}`)}
        style={({ pressed }) => [
          styles.storeCard,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.storeArtwork, index % 2 === 1 && styles.artworkAlt]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.storeImage} />
          ) : (
            <>
              <Text style={styles.artworkWord}>TUNGO</Text>
              <View style={styles.artworkMark}>
                <Text style={styles.artworkMarkText}>T</Text>
              </View>
              <Text style={styles.artworkCaption}>SABOR LOCAL</Text>
            </>
          )}
          <View style={styles.allyPill}>
            <Text style={styles.allyPillText}>ALIADO TUNGO</Text>
          </View>
        </View>
        <View style={styles.storeBody}>
          <Text numberOfLines={1} style={styles.storeTitle}>
            {item.nombre}
          </Text>
          <Text numberOfLines={2} style={styles.storeDescription}>
            {item.descripcion || 'Descubre los productos de este aliado local.'}
          </Text>
          <View style={styles.storeFooter}>
            <Text style={styles.storeMeta}>
              {item.productos_count ?? 0} productos
            </Text>
            <Text style={styles.storeLink}>Ver menú  ›</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={filteredEstablishments}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderEstablishment}
      refreshControl={
        <RefreshControl
          onRefresh={refreshEstablishments}
          refreshing={refreshing}
          tintColor="#FF7A16"
        />
      }
      ListHeaderComponent={
        <>
          <BrandHeader />
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>
              RED LOCAL DE COMERCIO Y ÚLTIMA MILLA
            </Text>
            <Image
              accessibilityLabel="TunGo conecta, pide y recibe"
              resizeMode="contain"
              source={require('../../assets/tungo-logo.png')}
              style={styles.heroLogo}
            />
            <Text style={styles.heroTitle}>
              Conecta.{'\n'}
              <Text style={styles.heroAccent}>Pide.</Text>
              {'\n'}Recibe.
            </Text>
            <Text style={styles.heroDescription}>
              TunGo integra establecimientos aliados, clientes y operadores
              logísticos para que cada pedido avance con claridad, seguimiento y
              confianza.
            </Text>
          </View>
          <View style={styles.heroPanel}>
            <Text style={styles.panelIndex}>01 / 03</Text>
            <View style={styles.routeLine}>
              <Text style={styles.routeLabel}>Solicitud</Text>
              <View style={styles.routeRule} />
              <Text style={styles.routeLabel}>Preparación</Text>
              <View style={styles.routeRule} />
              <Text style={styles.routeLabel}>Entrega</Text>
            </View>
            <Text style={styles.panelTitle}>
              Una operación visible de principio a fin.
            </Text>
          </View>
          <View style={styles.roleStrip}>
            <View style={styles.roleCard}>
              <Text style={styles.roleNumber}>01</Text>
              <Text style={styles.roleTitle}>Cliente solicitante</Text>
              <Text style={styles.roleDescription}>
                Consulta menús, arma tu pedido y recibe en tu dirección.
              </Text>
            </View>
            <View style={styles.roleCard}>
              <Text style={styles.roleNumber}>02</Text>
              <Text style={styles.roleTitle}>Establecimiento aliado</Text>
              <Text style={styles.roleDescription}>
                Publica tu oferta y amplía tus canales de venta local.
              </Text>
            </View>
            <View style={styles.roleCard}>
              <Text style={styles.roleNumber}>03</Text>
              <Text style={styles.roleTitle}>Operador logístico</Text>
              <Text style={styles.roleDescription}>
                Toma entregas disponibles y actualiza cada estado.
              </Text>
            </View>
          </View>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>OFERTA LOCAL</Text>
              <Text style={styles.sectionTitle}>Establecimientos aliados</Text>
              <Text style={styles.sectionDescription}>
                Productos disponibles para solicitar ahora
              </Text>
            </View>
            {!loading && !error && (
              <Text style={styles.resultCount}>
                {filteredEstablishments.length}{' '}
                {filteredEstablishments.length === 1 ? 'lugar' : 'lugares'}
              </Text>
            )}
          </View>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              accessibilityLabel="Buscar establecimientos"
              onChangeText={setQuery}
              placeholder="¿Qué lugar estás buscando?"
              placeholderTextColor="#A7AAA3"
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                onPress={() => setQuery('')}
              >
                <Text style={styles.clearSearch}>×</Text>
              </Pressable>
            )}
          </View>
          {loading && (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#FF7A16" size="large" />
              <Text style={styles.stateText}>Buscando lugares cerca de ti…</Text>
            </View>
          )}
          {!loading && error && (
            <View style={styles.stateBox}>
              <Text style={styles.stateIcon}>!</Text>
              <Text style={styles.stateTitle}>No pudimos conectar</Text>
              <Text style={styles.stateText}>{error}</Text>
              <Text style={styles.connectionHint}>
                Revisa que Laravel esté activo y que el teléfono pueda llegar a
                la URL configurada en EXPO_PUBLIC_API_URL.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setLoading(true);
                  void getEstablishments()
                    .then((results) => {
                      setEstablishments(results);
                      setError(null);
                    })
                    .catch((loadError: unknown) => {
                      setError(getErrorMessage(loadError));
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Intentar de nuevo</Text>
              </Pressable>
            </View>
          )}
          {!loading && !error && filteredEstablishments.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>⌕</Text>
              <Text style={styles.stateTitle}>
                {query ? 'No encontramos ese lugar' : 'Pronto habrá más aliados'}
              </Text>
              <Text style={styles.stateText}>
                {query
                  ? 'Prueba con otro nombre o palabra.'
                  : 'Vuelve pronto para descubrir nuevos lugares en Tunja.'}
              </Text>
            </View>
          )}
        </>
      }
      ListFooterComponent={<View style={styles.listFooter} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#090A09',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hero: {
    alignItems: 'flex-start',
    paddingBottom: 20,
  },
  eyebrow: {
    color: '#FF7A16',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroLogo: {
    alignSelf: 'center',
    height: 278,
    marginVertical: 4,
    maxWidth: 320,
    width: '100%',
  },
  heroTitle: {
    color: '#F7F3EB',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 49,
    marginTop: 6,
  },
  heroAccent: {
    color: '#FF7A16',
  },
  heroDescription: {
    color: '#A7AAA3',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 15,
    maxWidth: 540,
  },
  heroPanel: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderWidth: 1,
    gap: 20,
    marginBottom: 28,
    minHeight: 205,
    overflow: 'hidden',
    padding: 20,
  },
  panelIndex: {
    color: '#FFB52D',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1,
  },
  routeLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  routeLabel: {
    color: '#F7F3EB',
    fontFamily: 'monospace',
    fontSize: 9,
  },
  routeRule: {
    backgroundColor: '#FF7A16',
    flex: 1,
    height: 1,
  },
  panelTitle: {
    color: '#F7F3EB',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 31,
    maxWidth: 290,
    marginTop: 'auto',
  },
  roleStrip: {
    backgroundColor: '#30332F',
    borderColor: '#30332F',
    borderWidth: 1,
    gap: 1,
    marginBottom: 52,
  },
  roleCard: {
    backgroundColor: '#141614',
    gap: 8,
    minHeight: 132,
    padding: 18,
  },
  roleNumber: {
    color: '#FF7A16',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1,
  },
  roleTitle: {
    color: '#F7F3EB',
    fontSize: 17,
    fontWeight: '800',
  },
  roleDescription: {
    color: '#A7AAA3',
    fontSize: 13,
    lineHeight: 19,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    flexDirection: 'row',
    height: 54,
    marginBottom: 16,
    paddingHorizontal: 15,
  },
  searchIcon: {
    color: '#FFB52D',
    fontSize: 28,
    lineHeight: 34,
    marginRight: 10,
  },
  searchInput: {
    color: '#F7F3EB',
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearch: {
    color: '#A7AAA3',
    fontSize: 25,
    paddingLeft: 10,
  },
  sectionHeading: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 5,
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: '#FF7A16',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  sectionTitle: {
    color: '#F7F3EB',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 5,
  },
  sectionDescription: {
    color: '#A7AAA3',
    fontSize: 13,
    marginTop: 3,
  },
  resultCount: {
    color: '#A7AAA3',
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 4,
  },
  storeCard: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  storeArtwork: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    borderBottomColor: '#30332F',
    borderBottomWidth: 1,
    height: 150,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artworkAlt: {
    backgroundColor: '#141614',
  },
  storeImage: {
    height: '100%',
    width: '100%',
  },
  artworkWord: {
    color: '#30332F',
    fontSize: 39,
    fontWeight: '900',
    letterSpacing: 8,
    position: 'absolute',
    right: 15,
    top: 36,
  },
  artworkMark: {
    alignItems: 'center',
    borderColor: '#FF7A16',
    borderRadius: 28,
    borderWidth: 1.5,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  artworkMarkText: {
    color: '#FF7A16',
    fontSize: 39,
    fontStyle: 'italic',
    fontWeight: '900',
    lineHeight: 47,
  },
  artworkCaption: {
    bottom: 16,
    color: '#A7AAA3',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2.2,
    position: 'absolute',
  },
  allyPill: {
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    top: 12,
  },
  allyPillText: {
    color: '#090A09',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  storeBody: {
    paddingHorizontal: 15,
    paddingTop: 14,
  },
  storeTitle: {
    color: '#F7F3EB',
    fontSize: 20,
    fontWeight: '800',
  },
  storeDescription: {
    color: '#A7AAA3',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    minHeight: 34,
  },
  storeFooter: {
    alignItems: 'center',
    borderTopColor: '#30332F',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 12,
  },
  storeMeta: {
    color: '#A7AAA3',
    fontSize: 11,
    fontWeight: '600',
  },
  storeLink: {
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
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: '#30332F',
    borderRadius: 20,
    color: '#FFB52D',
    fontSize: 18,
    fontWeight: '900',
    height: 40,
    lineHeight: 40,
    marginBottom: 10,
    textAlign: 'center',
    width: 40,
  },
  emptyIcon: {
    color: '#FF7A16',
    fontSize: 39,
    marginBottom: 6,
  },
  stateTitle: {
    color: '#F7F3EB',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  stateText: {
    color: '#A7AAA3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  connectionHint: {
    color: '#A7AAA3',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    marginTop: 16,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },
  retryText: {
    color: '#090A09',
    fontSize: 12,
    fontWeight: '800',
  },
  listFooter: {
    height: 40,
  },
  pressed: {
    opacity: 0.84,
  },
});
