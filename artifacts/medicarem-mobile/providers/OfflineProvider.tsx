import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Network from "expo-network";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncEvents } from "@workspace/api-client-react";
import type { OfflineEventRecord } from "@/lib/offline";
import { loadPendingEvents, savePendingEvents } from "@/lib/offline";

type OfflineContextValue = {
  isOnline: boolean;
  isReady: boolean;
  pendingEvents: OfflineEventRecord[];
  queueEvent: (event: OfflineEventRecord) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

function connected(state: Network.NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const syncEvents = useSyncEvents();
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<OfflineEventRecord[]>([]);
  const syncInProgress = useRef(false);
  const syncMutation = useRef(syncEvents.mutateAsync);
  const activeUserId = useRef(userId);
  syncMutation.current = syncEvents.mutateAsync;
  activeUserId.current = userId;

  useEffect(() => {
    let active = true;
    Network.getNetworkStateAsync()
      .then((state) => {
        if (active) setIsOnline(connected(state));
      })
      .catch(() => {
        if (active) setIsOnline(false);
      });
    const subscription = Network.addNetworkStateListener((state) =>
      setIsOnline(connected(state)),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsReady(false);
    setPendingEvents([]);
    if (!isSignedIn || !userId) {
      setIsReady(true);
      return () => {
        active = false;
      };
    }
    loadPendingEvents(userId)
      .then((events) => {
        if (active) setPendingEvents(events);
      })
      .catch(() => {
        if (active) setPendingEvents([]);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, [isSignedIn, userId]);

  useEffect(() => {
    if (!isReady || !userId) return;
    void savePendingEvents(userId, pendingEvents).catch(() => undefined);
  }, [isReady, pendingEvents, userId]);

  const queueEvent = useCallback(
    async (event: OfflineEventRecord) => {
      if (!userId) throw new Error("Debes iniciar sesión para guardar el evento.");
      setPendingEvents((current) => {
        if (current.some((item) => item.clientEventId === event.clientEventId)) {
          return current;
        }
        return [...current, event];
      });
      const current = await loadPendingEvents(userId).catch(() => []);
      const next = current.some((item) => item.clientEventId === event.clientEventId)
        ? current
        : [...current, event];
      await savePendingEvents(userId, next);
    },
    [userId],
  );

  useEffect(() => {
    if (
      !isReady ||
      !isSignedIn ||
      !userId ||
      !isOnline ||
      pendingEvents.length === 0 ||
      syncInProgress.current
    ) {
      return;
    }
    syncInProgress.current = true;
    const batch = pendingEvents.slice(0, 100);
    const syncingUserId = userId;
    void syncMutation.current({ data: { events: batch } })
      .then(() => {
        if (activeUserId.current !== syncingUserId) return;
        const sentIds = new Set(batch.map((event) => event.clientEventId));
        setPendingEvents((current) =>
          current.filter((event) => !sentIds.has(event.clientEventId)),
        );
        void queryClient.invalidateQueries();
      })
      .catch(() => {
        // Keep the queue intact. The next connection change or app session retries it.
      })
      .finally(() => {
        syncInProgress.current = false;
      });
  }, [isOnline, isReady, isSignedIn, pendingEvents, queryClient, userId]);

  return (
    <OfflineContext.Provider
      value={{ isOnline, isReady, pendingEvents, queueEvent }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOfflineQueue(): OfflineContextValue {
  const value = useContext(OfflineContext);
  if (!value) throw new Error("useOfflineQueue debe usarse dentro de OfflineProvider.");
  return value;
}
