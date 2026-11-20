import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region, UrlTile } from 'react-native-maps';

export type CourierMapProps = {
  latitude: number | null;
  longitude: number | null;
  label: string;
  updatedAt?: string | null;
};

const defaultRegion: Region = {
  latitude: 5.5353,
  longitude: -73.3678,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export function CourierMap({
  latitude,
  longitude,
  label,
  updatedAt,
}: CourierMapProps) {
  const mapRef = useRef<MapView>(null);
  const hasLocation = latitude !== null && longitude !== null;

  useEffect(() => {
    if (hasLocation) {
      mapRef.current?.animateToRegion({
        ...defaultRegion,
        latitude,
        longitude,
      }, 400);
    }
  }, [hasLocation, latitude, longitude]);

  return (
    <View style={styles.frame}>
      <MapView
        accessibilityLabel={label}
        initialRegion={hasLocation ? {
          ...defaultRegion,
          latitude,
          longitude,
        } : defaultRegion}
        mapType="none"
        ref={mapRef}
        style={styles.map}
      >
        <UrlTile
          maximumZ={19}
          tileSize={256}
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasLocation && (
          <Marker
            coordinate={{ latitude, longitude }}
            title={label}
            description={updatedAt ? `Actualizado ${updatedAt}` : undefined}
          />
        )}
      </MapView>
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 230, overflow: 'hidden', position: 'relative', width: '100%' },
  map: StyleSheet.absoluteFill,
  attribution: {
    backgroundColor: '#F7F3EB',
    bottom: 4,
    color: '#171512',
    fontSize: 9,
    paddingHorizontal: 5,
    position: 'absolute',
    right: 4,
  },
});
