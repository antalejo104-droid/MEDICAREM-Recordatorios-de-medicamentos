import { useState } from "react";
import { Alert, View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  EventRecordInputStatus,
  getGetDashboardQueryKey,
  getListEventsQueryKey,
  useRecordEvent,
} from "@workspace/api-client-react";
import type { MedicationEvent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useOfflineQueue } from "@/providers/OfflineProvider";
import { createClientEventId } from "@/lib/offline";
import { ActionButton, AppText, Card } from "@/components/AppUi";
import type { OfflineEventRecord } from "@/lib/offline";

function statusDescription(status: string, pendingSync: boolean): string {
  if (pendingSync) {
    return status === EventRecordInputStatus.CONFIRMED
      ? "Registrado; pendiente de sincronizar"
      : "Omisión declarada; pendiente de sincronizar";
  }
  switch (status) {
    case "CONFIRMED":
      return "Registrado como tomada";
    case "DECLARED_OMISSION":
      return "Omisión declarada";
    case "UNCONFIRMED":
      return "Sin confirmar";
    default:
      return "Pendiente";
  }
}

export function MedicationEventCard({
  event,
  canRecord,
  localRecord,
}: {
  event: MedicationEvent;
  canRecord: boolean;
  localRecord?: OfflineEventRecord;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const offline = useOfflineQueue();
  const recordMutation = useRecordEvent();
  const [errorText, setErrorText] = useState("");
  const effectiveStatus = localRecord?.status ?? event.status;
  const needsAction =
    canRecord &&
    !localRecord &&
    (event.status === "PENDING" || event.status === "UNCONFIRMED");

  const submit = async (status: EventRecordInputStatus) => {
    setErrorText("");
    const data: OfflineEventRecord = {
      eventId: event.id,
      status,
      clientEventId: createClientEventId(),
      reportedAt: new Date().toISOString(),
    };
    if (offline.isOnline) {
      try {
        await recordMutation.mutateAsync({ data });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
        ]);
        return;
      } catch (error) {
        const failure = error as { status?: number; response?: { status?: number } };
        if (
          typeof failure.status === "number" ||
          typeof failure.response?.status === "number"
        ) {
          setErrorText("No pudimos guardar el registro. Inténtalo de nuevo.");
          return;
        }
      }
    }
    try {
      await offline.queueEvent(data);
    } catch {
      setErrorText("No se pudo guardar en este dispositivo. Inténtalo de nuevo.");
    }
  };

  const confirmAction = (status: EventRecordInputStatus) => {
    if (status === EventRecordInputStatus.CONFIRMED) {
      Alert.alert(
        "¿Confirmas este registro?",
        "MEDICAREM guardará lo que reportas, pero no puede comprobar por sí misma que el medicamento se haya tomado.",
        [
          { text: "Volver", style: "cancel" },
          { text: "Registrar", onPress: () => void submit(status) },
        ],
      );
      return;
    }
    Alert.alert(
      "¿Declarar una omisión?",
      "Solo se registrará como omisión si tú confirmas esta decisión. Los horarios sin respuesta no se convierten automáticamente en omisiones.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Declarar omisión",
          style: "destructive",
          onPress: () => void submit(status),
        },
      ],
    );
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
          <Feather name="clock" size={20} color={colors.primary} />
        </View>
        <View style={styles.details}>
          <AppText variant="heading">{event.medicationName}</AppText>
          <AppText variant="muted">
            {event.prescribedDose ? `Dosis indicada: ${event.prescribedDose}` : "Horario de medicamento"}
          </AppText>
          <AppText variant="label">
            {new Date(event.scheduledAt).toLocaleString("es-CO", {
              timeZone: "America/Bogota",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </AppText>
        </View>
      </View>
      <View style={[styles.status, { backgroundColor: colors.muted }]}>
        <Feather
          name={
            effectiveStatus === "CONFIRMED"
              ? "check-circle"
              : effectiveStatus === "DECLARED_OMISSION"
                ? "alert-circle"
                : "clock"
          }
          size={17}
          color={
            effectiveStatus === "DECLARED_OMISSION"
              ? colors.destructive
              : colors.primary
          }
        />
        <AppText variant="label">
          {statusDescription(effectiveStatus, Boolean(localRecord))}
        </AppText>
      </View>
      {errorText ? (
        <AppText variant="muted" accessibilityRole="alert" style={{ color: colors.destructive }}>
          {errorText}
        </AppText>
      ) : null}
      {needsAction ? (
        <View style={styles.actions}>
          <ActionButton
            title="Registrar como tomada"
            icon={<Feather name="check" size={18} color={colors.primaryForeground} />}
            disabled={recordMutation.isPending}
            onPress={() => confirmAction(EventRecordInputStatus.CONFIRMED)}
            testID={`record-event-${event.id}`}
            style={{ flex: 1 }}
          />
          <ActionButton
            title="Declarar omisión"
            variant="secondary"
            disabled={recordMutation.isPending}
            onPress={() => confirmAction(EventRecordInputStatus.DECLARED_OMISSION)}
            testID={`omit-event-${event.id}`}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  details: { flex: 1, gap: 3 },
  status: {
    alignSelf: "flex-start",
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  actions: { gap: 9 },
});
