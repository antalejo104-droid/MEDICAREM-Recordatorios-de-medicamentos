import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  EventStatus,
  getGetProfileQueryKey,
  getListEventsQueryKey,
  UserRole,
  useGetProfile,
  useListEvents,
} from "@workspace/api-client-react";
import { Screen, AppText, PageHeading, Card } from "@/components/AppUi";
import { MedicationEventCard } from "@/components/MedicationEventCard";
import { usePatientAccess } from "@/hooks/usePatientAccess";
import { useOfflineQueue } from "@/providers/OfflineProvider";
import { useColors } from "@/hooks/useColors";

const filters: Array<{ label: string; value?: EventStatus }> = [
  { label: "Todos" },
  { label: "Pendientes", value: EventStatus.PENDING },
  { label: "Registrados", value: EventStatus.CONFIRMED },
  { label: "Omisiones", value: EventStatus.DECLARED_OMISSION },
];

export default function HistoryScreen() {
  const colors = useColors();
  const profileQuery = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const profile = profileQuery.data;
  const access = usePatientAccess(profile!);
  const offline = useOfflineQueue();
  const [selectedStatus, setSelectedStatus] = useState<EventStatus | undefined>();
  const queryParams = useMemo(
    () => ({
      ...(access.patientId ? { patientId: access.patientId } : {}),
      ...(selectedStatus ? { status: selectedStatus } : {}),
    }),
    [access.patientId, selectedStatus],
  );
  const events = useListEvents(queryParams, {
    query: {
      queryKey: getListEventsQueryKey(queryParams),
      enabled: Boolean(access.patientId),
    },
  });
  const queuedById = new Map(offline.pendingEvents.map((item) => [item.eventId, item]));

  if (!profile) {
    return <Screen><PageHeading title="Historial" subtitle="Cargando tus registros." /></Screen>;
  }

  return (
    <Screen>
      <PageHeading
        title="Historial"
        subtitle="Consulta los eventos reportados, pendientes y las omisiones declaradas."
      />
      <View style={styles.filters}>
        {filters.map((filter) => {
          const active = selectedStatus === filter.value;
          return (
            <Pressable
              key={filter.label}
              onPress={() => setSelectedStatus(filter.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.filter,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              testID={`filter-history-${filter.label.toLowerCase()}`}
            >
              <AppText variant="label" style={{ color: active ? colors.primaryForeground : colors.foreground }}>
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {!access.patientId ? (
        <Card>
          <AppText variant="heading">Sin acceso a un perfil</AppText>
          <AppText variant="muted">El historial solo aparece cuando una persona titular aprueba tu invitación.</AppText>
        </Card>
      ) : events.isLoading ? (
        <Card><AppText variant="muted">Cargando historial…</AppText></Card>
      ) : events.error ? (
        <Card><AppText variant="muted">No pudimos cargar el historial. Revisa tu conexión.</AppText></Card>
      ) : events.data?.length ? (
        events.data.map((event) => (
          <MedicationEventCard
            key={event.id}
            event={event}
            canRecord={profile.role === UserRole.PATIENT}
            localRecord={queuedById.get(event.id)}
          />
        ))
      ) : (
        <Card>
          <AppText variant="heading">Todavía no hay eventos</AppText>
          <AppText variant="muted">Los registros aparecerán aquí cuando haya horarios creados.</AppText>
        </Card>
      )}
      <AppText variant="muted">
        Los horarios sin respuesta se muestran como pendientes o sin confirmar. No se convierten automáticamente en omisiones.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: { minHeight: 44, borderWidth: 1, borderRadius: 99, justifyContent: "center", paddingHorizontal: 13 },
});
