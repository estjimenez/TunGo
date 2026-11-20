import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { COURIER_LOCATION_TASK } from './courier-location.native';
import { getCourierDashboard, updateCourierLocation } from './api';
import { readAuthSession } from './auth-storage';

const activeStates = new Set(['confirmado', 'llego_tienda', 'recogido', 'en_camino']);

TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
  COURIER_LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      console.error('Falló una actualización de ubicación de TunGo.', error);
      return;
    }

    const location = data.locations?.[data.locations.length - 1];
    if (!location) {
      return;
    }

    const session = await readAuthSession();
    if (!session || session.user.rol !== 'domiciliario') {
      return;
    }

    const dashboard = await getCourierDashboard(session.token);
    const activeOrders = dashboard.pedidos.filter((order) =>
      activeStates.has(order.estado),
    );

    if (activeOrders.length === 0 && !dashboard.aceptacion_automatica) {
      await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK);
      return;
    }

    if (activeOrders.length === 0) {
      await updateCourierLocation(session.token, {
        latitud: location.coords.latitude,
        longitud: location.coords.longitude,
      });
      return;
    }

    await Promise.all(
      activeOrders.map((order) =>
        updateCourierLocation(
          session.token,
          {
            latitud: location.coords.latitude,
            longitud: location.coords.longitude,
          },
          order.id,
        ),
      ),
    );
  },
);
