import { useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import type { NotificationResponse } from 'expo-notifications';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { getErrorMessage, rejectCourierOrder, takeCourierOrder } from '../lib/api';
import { useAuth } from '../lib/auth';

export function NotificationEffects() {
  const { ready, token, user } = useAuth();
  const handledResponses = useRef(new Set<string>());

  useEffect(() => {
    if (Constants.expoGoConfig || !ready) {
      return undefined;
    }

    let active = true;
    let subscription: { remove: () => void } | undefined;

    const openNotification = (response: NotificationResponse) => {
      const data = response.notification.request.content.data;
      const orderId = Number(data?.orderId);

      if (data?.screen === 'order' && Number.isInteger(orderId) && orderId > 0) {
        router.push(`/pedido/${orderId}`);
      } else {
        router.push('/panel');
      }
    };

    const handleResponse = async (response: NotificationResponse) => {
      const requestId = response.notification.request.identifier;
      const responseKey = `${requestId}:${response.actionIdentifier}`;
      if (handledResponses.current.has(responseKey)) return;
      handledResponses.current.add(responseKey);

      const data = response.notification.request.content.data;
      const orderId = Number(data?.orderId);
      if (
        user?.rol === 'domiciliario' &&
        token &&
        Number.isInteger(orderId) &&
        orderId > 0 &&
        ['accept-order', 'reject-order'].includes(response.actionIdentifier)
      ) {
        try {
          if (response.actionIdentifier === 'accept-order') {
            await takeCourierOrder(token, orderId);
          } else {
            await rejectCourierOrder(token, orderId);
          }
          router.push('/panel');
        } catch (actionError) {
          Alert.alert('No se pudo actualizar el pedido', getErrorMessage(actionError));
          router.push('/panel');
        }
        return;
      }

      openNotification(response);
    };

    void import('expo-notifications')
      .then(async (Notifications) => {
        if (!active) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        subscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            void handleResponse(response);
          });
        const response = await Notifications.getLastNotificationResponseAsync();
        if (active && response) {
          void handleResponse(response);
        }
      })
      .catch((error: unknown) => {
        console.error('No se pudo iniciar el soporte de notificaciones TunGo.', error);
      });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [ready, token, user?.rol]);

  return null;
}
