import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const COURIER_LOCATION_TASK = 'tungo-active-delivery-location';

function getTrackingOptions(mode: 'delivery' | 'automatic') {
  return {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: mode === 'automatic' ? 0 : 25,
    timeInterval: mode === 'automatic' ? 30000 : 15000,
    pausesUpdatesAutomatically: mode !== 'automatic',
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'TunGo comparte tu ubicación',
      notificationBody: mode === 'automatic'
        ? 'TunGo actualiza tu ubicación para asignarte pedidos cercanos.'
        : 'Solo durante una entrega activa.',
      notificationColor: '#FF7A16',
      killServiceOnDestroy: false,
    },
  };
}

async function configureBackgroundTracking(mode: 'delivery' | 'automatic') {
  if (await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(
    COURIER_LOCATION_TASK,
    getTrackingOptions(mode),
  );
}

export async function startCourierBackgroundTracking(mode: 'delivery' | 'automatic' = 'delivery') {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    throw new Error(
      'Se necesita permiso de ubicación mientras usas la app para iniciar el seguimiento.',
    );
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') {
    throw new Error(
      'Sin permiso de ubicación en segundo plano, el cliente solo verá tu ubicación mientras TunGo esté abierto.',
    );
  }

  if (!(await TaskManager.isAvailableAsync())) {
    throw new Error('Este dispositivo no admite el seguimiento de ubicación en segundo plano.');
  }

  await configureBackgroundTracking(mode);
}

export async function resumeCourierBackgroundTracking(mode: 'delivery' | 'automatic' = 'delivery') {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  if (foreground.status !== 'granted' || background.status !== 'granted') {
    return false;
  }

  if (!(await TaskManager.isAvailableAsync())) {
    return false;
  }

  await configureBackgroundTracking(mode);

  return true;
}

export async function stopCourierBackgroundTracking() {
  if (
    (await TaskManager.isAvailableAsync()) &&
    (await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK))
  ) {
    await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK);
  }
}
