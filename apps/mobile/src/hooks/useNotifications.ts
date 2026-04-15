import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { userApi } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // Register token with backend
    try {
      await userApi.registerDevice(pushToken);
    } catch (err) {
      console.error('Failed to register push token:', err);
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'AI Secretary',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }
  }, []);

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);
        // Navigate based on notification data
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return { registerForPushNotifications };
}
