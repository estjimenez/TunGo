import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CourierMapProps } from './CourierMap.native';

export function CourierMap({
  latitude,
  longitude,
  label,
}: CourierMapProps) {
  const mapLatitude = latitude ?? 5.5353;
  const mapLongitude = longitude ?? -73.3678;
  const span = 0.035;
  const bounds = [
    mapLongitude - span,
    mapLatitude - span,
    mapLongitude + span,
    mapLatitude + span,
  ]
    .map((value) => value.toFixed(6))
    .join('%2C');
  const marker =
    latitude !== null && longitude !== null
      ? `&marker=${latitude}%2C${longitude}`
      : '';
  const source =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik${marker}`;

  return (
    <View style={styles.frame}>
      {createElement('iframe', {
        title: label,
        src: source,
        loading: 'lazy',
        referrerPolicy: 'no-referrer',
        style: { border: 0, height: '100%', width: '100%' },
      })}
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 230, overflow: 'hidden', position: 'relative', width: '100%' },
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
