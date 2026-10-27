import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { MedicationEvent } from "@workspace/api-client-react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function scheduleMedicationReminders(
  events: MedicationEvent[],
  enabled: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;
  if (!enabled) {
    await cancelMedicationReminders();
    return;
  }
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );

  const now = Date.now();
  const horizon = now + 7 * 24 * 60 * 60 * 1000;
  const upcoming = events.filter((event) => {
    const scheduledTime = new Date(event.scheduledAt).getTime();
    return (
      event.status === "PENDING" &&
      scheduledTime > now &&
      scheduledTime <= horizon
    );
  });

  for (const event of upcoming) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Recordatorio MEDICAREM",
        body: "Tienes un horario pendiente. Abre la app para registrar lo ocurrido.",
        data: { eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(event.scheduledAt),
      },
    });
  }
}

export async function cancelMedicationReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}
