import { useEffect } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getListEventsQueryKey,
  getListMedicationsQueryKey,
  UserRole,
  useGetDashboard,
  useGetProfile,
  useListEvents,
  useListMedications,
} from "@workspace/api-client-react";
import type { MedicationEvent } from "@workspace/api-client-react";
import { Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen, AppText, Card, PageHeading, InlineNotice } from "@/components/AppUi";
import { MedicationEventCard } from "@/components/MedicationEventCard";
import { usePatientAccess } from "@/hooks/usePatientAccess";
import { useOfflineQueue } from "@/providers/OfflineProvider";
import { scheduleMedicationReminders } from "@/lib/notifications";
import { useColors } from "@/hooks/useColors";

function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function shiftDate(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function TodayScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const profileQuery = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const profile = profileQuery.data;
  const access = usePatientAccess(profile);
  const offline = useOfflineQueue();
  const today = dateKey(new Date());
  const dashboardParams = access.patientId
    ? { patientId: access.patientId }
    : undefined;
  const todayParams = access.patientId
    ? { patientId: access.patientId, from: today, to: today }
    : undefined;
  const reminderParams = access.patientId
    ? { patientId: access.patientId, from: today, to: shiftDate(today, 7) }
    : undefined;
  const medicationParams = access.patientId
    ? { patientId: access.patientId }
    : undefined;
  const dashboard = useGetDashboard(dashboardParams, {
    query: {
      queryKey: getGetDashboardQueryKey(dashboardParams),
      enabled: Boolean(access.patientId),
    },
  });
  const todayEvents = useListEvents(todayParams, {
    query: {
      queryKey: getListEventsQueryKey(todayParams),
      enabled: Boolean(access.patientId),
    },
  });
  const reminderEvents = useListEvents(reminderParams, {
    query: {
      queryKey: getListEventsQueryKey(reminderParams),
      enabled: Boolean(access.patientId && profile?.notificationsEnabled),
    },
  });
  const medications = useListMedications(medicationParams, {
    query: {
      queryKey: getListMedicationsQueryKey(medicationParams),
      enabled: Boolean(access.patientId),
    },
  });

  useEffect(() => {
    if (!profile || !reminderEvents.data) return;
    void scheduleMedicationReminders(
      reminderEvents.data,
      profile.notificationsEnabled,
    ).catch(() => undefined);
  }, [profile, reminderEvents.data]);

  const queuedByEventId = new Map(
    offline.pendingEvents.map((event) => [event.eventId, event]),
  );
  const activeMedications = (medications.data ?? []).filter((item) => item.active);
  const patientEvents = todayEvents.data ?? [];
  const isPatient = profile?.role === UserRole.PATIENT;

  if (!profile) {
    return (
      <Screen>
        <PageHeading title="Cargando…" subtitle="Estamos preparando tu espacio." />
      </Screen>
    );
  }

  const choosePatient = () => {
    if (access.activeLinks.length < 2) return;
    Alert.alert(
      "Elegir perfil",
      "Selecciona a la persona cuyo seguimiento quieres consultar.",
      access.activeLinks.map((link) => ({
        text: link.patientName,
        onPress: () => access.setSelectedPatientId(link.patientId),
      })),
    );
  };

  return (
    <Screen>
      <View style={styles.top}>
        <View>
          <AppText variant="muted">
            {isPatient ? "TU ORGANIZACIÓN" : "SEGUIMIENTO COMPARTIDO"}
          </AppText>
          <AppText variant="title">
            {isPatient ? `Hola, ${profile.displayName.split(" ")[0]}` : "Hoy"}
          </AppText>
          <AppText variant="muted">
            {new Date().toLocaleDateString("es-CO", {
              timeZone: "America/Bogota",
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </AppText>
        </View>
        <View style={[styles.brandIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="sun" size={24} color={colors.primary} />
        </View>
      </View>
      {offline.isOnline ? null : (
        <InlineNotice tone="warning">
          Sin conexión. Los registros nuevos se guardarán en este dispositivo para sincronizarse después.
        </InlineNotice>
      )}
      {offline.pendingEvents.length > 0 ? (
        <InlineNotice>
          {offline.pendingEvents.length} evento(s) pendiente(s) de sincronizar.
        </InlineNotice>
      ) : null}
      {!isPatient && access.patientId && access.activeLinks.length > 1 ? (
        <Pressable
          onPress={choosePatient}
          accessibilityRole="button"
          style={[styles.patientPicker, { borderColor: colors.border }]}
        >
          <Feather name="users" size={18} color={colors.primary} />
          <AppText variant="label">Viendo a {access.patientName}</AppText>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
      {!access.patientId ? (
        <Card>
          <AppText variant="heading">Aún no hay un perfil autorizado</AppText>
          <AppText variant="muted">
            La persona titular debe aprobar tu solicitud para que puedas consultar su seguimiento.
          </AppText>
          <Link href="/caregivers" asChild>
            <Pressable
              accessibilityRole="link"
              style={[styles.linkButton, { backgroundColor: colors.secondary }]}
            >
              <AppText variant="label" style={{ color: colors.primary }}>
                Ingresar código de invitación
              </AppText>
            </Pressable>
          </Link>
        </Card>
      ) : (
        <>
          <Card style={{ backgroundColor: colors.secondary }}>
            <AppText variant="label">RESUMEN DE HOY</AppText>
            {dashboard.isLoading ? (
              <AppText variant="muted">Cargando resumen…</AppText>
            ) : dashboard.error ? (
              <AppText variant="muted">No pudimos cargar el resumen. Revisa tu conexión.</AppText>
            ) : (
              <>
                <AppText variant="heading">
                  {dashboard.data?.todayScheduled ?? 0} horarios programados
                </AppText>
                <View style={styles.metrics}>
                  <Metric label="Registrados" value={dashboard.data?.confirmed ?? 0} />
                  <Metric label="Pendientes" value={dashboard.data?.pending ?? 0} />
                  <Metric label="Omisiones declaradas" value={dashboard.data?.declaredOmissions ?? 0} />
                </View>
              </>
            )}
          </Card>
          <View style={styles.sectionHeader}>
            <AppText variant="heading">Tus medicamentos</AppText>
            <Link href="/(tabs)/medications" asChild>
              <Pressable accessibilityRole="link" testID="link-all-medications">
                <AppText variant="label" style={{ color: colors.primary }}>Ver todos</AppText>
              </Pressable>
            </Link>
          </View>
          {medications.isLoading ? (
            <Card><AppText variant="muted">Cargando medicamentos…</AppText></Card>
          ) : activeMedications.length === 0 ? (
            <Card>
              <AppText variant="heading">Tu lista está vacía</AppText>
              <AppText variant="muted">Agrega los datos tal como aparecen en la indicación que recibiste.</AppText>
            </Card>
          ) : activeMedications.slice(0, 4).map((medication) => (
            <Card key={medication.id} style={styles.medicationSummary}>
              <View style={[styles.medicineDot, { backgroundColor: colors.accent }]} />
              <View style={{ flex: 1 }}>
                <AppText variant="label">{medication.name}</AppText>
                <AppText variant="muted">{medication.prescribedDose}</AppText>
              </View>
              <AppText variant="muted">
                {medication.schedules.map((schedule) => schedule.time).join(" · ")}
              </AppText>
            </Card>
          ))}
          <View style={styles.sectionHeader}>
            <AppText variant="heading">Horarios de hoy</AppText>
            <AppText variant="muted">{patientEvents.length} en total</AppText>
          </View>
          {todayEvents.isLoading ? (
            <Card><AppText variant="muted">Cargando horarios…</AppText></Card>
          ) : patientEvents.length === 0 ? (
            <Card>
              <AppText variant="heading">No hay horarios para hoy</AppText>
              <AppText variant="muted">Puedes consultar el historial o agregar un medicamento.</AppText>
            </Card>
          ) : patientEvents.map((event: MedicationEvent) => (
            <MedicationEventCard
              key={event.id}
              event={event}
              canRecord={isPatient}
              localRecord={queuedByEventId.get(event.id)}
            />
          ))}
          <InlineNotice>
            MEDICAREM guarda lo que se reporta. No recomienda tratamientos ni verifica el consumo.
          </InlineNotice>
          <Pressable
            onPress={() => {
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
                queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }),
                queryClient.invalidateQueries({ queryKey: getListMedicationsQueryKey() }),
              ]);
            }}
            accessibilityRole="button"
            style={[styles.refresh, { borderColor: colors.border }]}
            testID="button-refresh-dashboard"
          >
            <Feather name="refresh-cw" size={17} color={colors.primary} />
            <AppText variant="label" style={{ color: colors.primary }}>Actualizar información</AppText>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const colors = useColors();
  return (
    <View style={[styles.metric, { borderColor: colors.border }]}>
      <AppText variant="heading" style={{ color: colors.primary }}>{value}</AppText>
      <AppText variant="muted">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  brandIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { flexGrow: 1, minWidth: 92, borderWidth: 1, borderRadius: 14, padding: 11, gap: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  medicationSummary: { flexDirection: "row", alignItems: "center", gap: 10 },
  medicineDot: { width: 12, height: 12, borderRadius: 6 },
  patientPicker: { minHeight: 54, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  linkButton: { minHeight: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  refresh: { minHeight: 50, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
});
