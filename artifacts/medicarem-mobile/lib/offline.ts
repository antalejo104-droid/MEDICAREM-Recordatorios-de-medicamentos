import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { EventRecordInput } from "@workspace/api-client-react";

export type OfflineEventRecord = EventRecordInput;

function indexKey(userId: string): string {
  return `medicarem:pending-index:${userId}`;
}

function eventKey(userId: string, clientEventId: string): string {
  return `medicarem:pending:${userId}:${clientEventId}`;
}

export async function loadPendingEvents(userId: string): Promise<OfflineEventRecord[]> {
  const saved = await AsyncStorage.getItem(indexKey(userId));
  if (!saved) return [];
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    return [];
  }
  const stored = await Promise.all(
    parsed.map((clientEventId) =>
      Platform.OS === "web"
        ? AsyncStorage.getItem(eventKey(userId, clientEventId))
        : SecureStore.getItemAsync(eventKey(userId, clientEventId)),
    ),
  );
  return stored.flatMap((raw): OfflineEventRecord[] => {
    if (!raw) return [];
    try {
      const event: unknown = JSON.parse(raw);
      if (
        typeof event === "object" &&
        event !== null &&
        typeof (event as OfflineEventRecord).eventId === "number" &&
        typeof (event as OfflineEventRecord).clientEventId === "string" &&
        typeof (event as OfflineEventRecord).status === "string"
      ) {
        return [event as OfflineEventRecord];
      }
    } catch {
      return [];
    }
    return [];
  });
}

export async function savePendingEvents(
  userId: string,
  events: OfflineEventRecord[],
): Promise<void> {
  const oldIndex = await AsyncStorage.getItem(indexKey(userId));
  const oldIds: string[] = oldIndex ? JSON.parse(oldIndex) as string[] : [];
  const nextIds = events.map((event) => event.clientEventId);
  const removedIds = oldIds.filter((id) => !nextIds.includes(id));

  await Promise.all(
    events.map((event) => {
      const key = eventKey(userId, event.clientEventId);
      return Platform.OS === "web"
        ? AsyncStorage.setItem(key, JSON.stringify(event))
        : SecureStore.setItemAsync(key, JSON.stringify(event));
    }),
  );
  await Promise.all(
    removedIds.map((id) => {
      const key = eventKey(userId, id);
      return Platform.OS === "web"
        ? AsyncStorage.removeItem(key)
        : SecureStore.deleteItemAsync(key);
    }),
  );
  await AsyncStorage.setItem(indexKey(userId), JSON.stringify(nextIds));
}

export function createClientEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
