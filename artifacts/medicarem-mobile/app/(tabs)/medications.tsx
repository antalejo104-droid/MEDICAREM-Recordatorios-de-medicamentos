import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getListEventsQueryKey,
  getListMedicationsQueryKey,
  UserRole,
  useCreateMedication,
  useDeactivateMedication,
  useGetProfile,
  useListMedications,
} from "@workspace/api-client-react";
import type { ScheduleInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Screen, AppText, Card, PageHeading, ActionButton, AppInput, InlineNotice } from "@/components/AppUi";
import { usePatientAccess } from "@/hooks/usePatientAccess";
import { useColors } from "@/hooks/useColors";

type ScheduleDraft = {
  id: number;
  time: string;
  weekdays: number[];
};

const weekdayOptions = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

function todayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toDateKey(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export default function MedicationsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const profileQuery = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const profile = profileQuery.data;
  const access = usePatientAccess(profile!);
  const isPatient = profile?.role === UserRole.PATIENT;
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [presentation, setPresentation] = useState("");
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(() => todayKey().split("-").reverse().join("/"));
  const [endDate, setEndDate] = useState("");
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([
    { id: Date.now(), time: "08:00", weekdays: [] },
  ]);
  const [formError, setFormError] = useState("");

  const medicationParams = access.patientId
    ? { patientId: access.patientId, includeInactive }
    : undefined;
  const medications = useListMedications(medicationParams, {
    query: {
      queryKey: getListMedicationsQueryKey(medicationParams),
      enabled: Boolean(access.patientId),
    },
  });
  const createMedication = useCreateMedication();
  const deactivateMedication = useDeactivateMedication();

  const scheduleInput = useMemo(() => {
    const start = toDateKey(startDate);
    const end = endDate.trim() ? toDateKey(endDate) : null;
    if (!start) return null;
    const output: ScheduleInput[] = schedules.map((schedule) => ({
      time: schedule.time,
      weekdays: schedule.weekdays,
      startDate: start,
      ...(end ? { endDate: end } : {}),
    }));
    return output;
  }, [endDate, schedules, startDate]);

  const saveMedication = async () => {
    setFormError("");
    const dateStart = toDateKey(startDate);
    const dateEnd = endDate.trim() ? toDateKey(endDate) : null;
    if (!name.trim() || !dose.trim() || !dateStart) {
      setFormError("Escribe el nombre, la dosis y una fecha inicial válida en formato dd/mm/aaaa.");
      return;
    }
    if (endDate.trim() && !dateEnd) {
      setFormError("La fecha final debe tener el formato dd/mm/aaaa.");
      return;
    }
    if (dateEnd && dateEnd < dateStart) {
      setFormError("La fecha final debe ser igual o posterior a la fecha inicial.");
      return;
    }
    if (schedules.some((schedule) => schedule.weekdays.length === 0)) {
      setFormError("Selecciona al menos un día para cada horario.");
      return;
    }
    if (schedules.some((schedule) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time))) {
      setFormError("Escribe cada horario en formato de 24 horas, por ejemplo 08:30.");
      return;
    }
    if (!scheduleInput) {
      setFormError("Revisa las fechas del horario.");
      return;
    }
    try {
      await createMedication.mutateAsync({
        data: {
          name: name.trim(),
          presentation: presentation.trim(),
          prescribedDose: dose.trim(),
          notes: notes.trim() || null,
          startDate: dateStart,
          endDate: dateEnd,
          schedules: scheduleInput,
        },
      });
      setShowForm(false);
      setName("");
      setPresentation("");
      setDose("");
      setNotes("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListMedicationsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
      ]);
    } catch {
      setFormError("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const deactivate = (id: number, medicationName: string) => {
    Alert.alert(
      "Desactivar medicamento",
      `¿Quieres dejar de mostrar ${medicationName} en tu lista activa? El historial se conservará.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: () => {
            void deactivateMedication.mutateAsync({ id }).then(() =>
              Promise.all([
                queryClient.invalidateQueries({ queryKey: getListMedicationsQueryKey() }),
                queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }),
                queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
              ]),
            ).catch(() => Alert.alert("No se pudo desactivar", "Inténtalo de nuevo."));
          },
        },
      ],
    );
  };

  if (!profile) {
    return <Screen><PageHeading title="Medicamentos" subtitle="Cargando tu lista." /></Screen>;
  }

  return (
    <Screen>
      <PageHeading
        title="Medicamentos"
        subtitle={isPatient ? "Organiza los datos y horarios que recibiste." : `Información compartida de ${access.patientName || "la persona titular"}.`}
      />
      {isPatient ? (
        <ActionButton
          title={showForm ? "Cerrar formulario" : "Agregar medicamento"}
          icon={<Feather name={showForm ? "x" : "plus"} size={19} color={showForm ? colors.primary : colors.primaryForeground} />}
          variant={showForm ? "secondary" : "primary"}
          onPress={() => setShowForm((value) => !value)}
          testID="button-add-medication"
        />
      ) : (
        <InlineNotice>Modo de consulta: solo la persona titular puede cambiar medicamentos.</InlineNotice>
      )}
      {showForm && isPatient ? (
        <Card>
          <AppText variant="heading">Nuevo medicamento</AppText>
          <AppText variant="muted">
            Copia la información tal como aparece en la indicación. MEDICAREM no revisa ni recomienda dosis.
          </AppText>
          <AppInput label="Nombre" value={name} onChangeText={setName} maxLength={120} testID="input-medication-name" />
          <AppInput label="Presentación" value={presentation} onChangeText={setPresentation} maxLength={120} placeholder="Tableta, cápsula…" testID="input-medication-presentation" />
          <AppInput label="Dosis indicada" value={dose} onChangeText={setDose} maxLength={120} placeholder="Escribe el texto indicado" testID="input-medication-dose" />
          <AppInput label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} testID="input-medication-notes" />
          <AppInput label="Fecha inicial (dd/mm/aaaa)" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" placeholder="dd/mm/aaaa" testID="input-medication-start-date" />
          <AppInput label="Fecha final (opcional)" value={endDate} onChangeText={setEndDate} keyboardType="numbers-and-punctuation" placeholder="dd/mm/aaaa" testID="input-medication-end-date" />
          {schedules.map((schedule, index) => (
            <View key={schedule.id} style={[styles.schedule, { borderColor: colors.border }]}>
              <View style={styles.scheduleHeader}>
                <AppText variant="label">Horario {index + 1}</AppText>
                {schedules.length > 1 ? (
                  <Pressable
                    onPress={() => setSchedules((current) => current.filter((item) => item.id !== schedule.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar horario ${index + 1}`}
                    style={styles.removeSchedule}
                  >
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </Pressable>
                ) : null}
              </View>
              <AppInput
                label="Hora (24 horas)"
                value={schedule.time}
                onChangeText={(time) =>
                  setSchedules((current) =>
                    current.map((item) => item.id === schedule.id ? { ...item, time } : item),
                  )
                }
                keyboardType="numbers-and-punctuation"
                placeholder="08:00"
                testID={`input-schedule-time-${index}`}
              />
              <AppText variant="label">Días</AppText>
              <View style={styles.days}>
                {weekdayOptions.map((day) => {
                  const selected = schedule.weekdays.includes(day.value);
                  return (
                    <Pressable
                      key={day.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][day.value]}
                      onPress={() =>
                        setSchedules((current) =>
                          current.map((item) =>
                            item.id !== schedule.id
                              ? item
                              : {
                                  ...item,
                                  weekdays: selected
                                    ? item.weekdays.filter((value) => value !== day.value)
                                    : [...item.weekdays, day.value],
                                },
                          ),
                        )
                      }
                      style={[
                        styles.day,
                        {
                          backgroundColor: selected ? colors.primary : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                      testID={`button-weekday-${index}-${day.value}`}
                    >
                      <AppText variant="label" style={{ color: selected ? colors.primaryForeground : colors.foreground }}>
                        {day.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <ActionButton
            title="Agregar otro horario"
            variant="secondary"
            icon={<Feather name="plus" size={18} color={colors.secondaryForeground} />}
            onPress={() => setSchedules((current) => [...current, { id: Date.now(), time: "12:00", weekdays: [] }])}
            testID="button-add-schedule"
          />
          {formError ? <AppText variant="muted" accessibilityRole="alert" style={{ color: colors.destructive }}>{formError}</AppText> : null}
          <ActionButton
            title={createMedication.isPending ? "Guardando…" : "Guardar medicamento"}
            onPress={() => void saveMedication()}
            disabled={createMedication.isPending}
            testID="button-save-medication"
          />
        </Card>
      ) : null}

      <View style={styles.sectionHeader}>
        <AppText variant="heading">{includeInactive ? "Todos" : "Activos"}</AppText>
        <Pressable
          onPress={() => setIncludeInactive((value) => !value)}
          accessibilityRole="button"
          testID="button-toggle-inactive"
        >
          <AppText variant="label" style={{ color: colors.primary }}>
            {includeInactive ? "Ver solo activos" : "Ver inactivos"}
          </AppText>
        </Pressable>
      </View>
      {medications.isLoading ? (
        <Card><AppText variant="muted">Cargando medicamentos…</AppText></Card>
      ) : medications.error ? (
        <Card><AppText variant="muted">No pudimos cargar la lista. Revisa tu conexión.</AppText></Card>
      ) : (medications.data ?? []).length === 0 ? (
        <Card>
          <AppText variant="heading">No hay medicamentos para mostrar</AppText>
          <AppText variant="muted">Al agregar uno, copia los datos de la indicación que recibiste.</AppText>
        </Card>
      ) : (medications.data ?? []).map((medication) => (
        <Card key={medication.id}>
          <View style={styles.medHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{medication.name}</AppText>
              <AppText variant="muted">{medication.presentation || "Presentación no especificada"}</AppText>
            </View>
            {medication.active && isPatient ? (
              <Pressable
                onPress={() => deactivate(medication.id, medication.name)}
                accessibilityRole="button"
                accessibilityLabel={`Desactivar ${medication.name}`}
                style={styles.removeSchedule}
                testID={`button-deactivate-medication-${medication.id}`}
              >
                <Feather name="archive" size={19} color={colors.destructive} />
              </Pressable>
            ) : null}
          </View>
          <AppText variant="label">Dosis indicada: {medication.prescribedDose}</AppText>
          {medication.notes ? <AppText variant="muted">{medication.notes}</AppText> : null}
          {medication.schedules.map((schedule) => (
            <View key={schedule.id} style={styles.savedSchedule}>
              <Feather name="clock" size={17} color={colors.primary} />
              <AppText variant="label">{schedule.time}</AppText>
              <AppText variant="muted">{schedule.weekdays.map((day) => weekdayOptions.find((item) => item.value === day)?.label).join(" · ")}</AppText>
            </View>
          ))}
          <AppText variant="muted">
            {medication.endDate
              ? `Vigencia registrada hasta ${new Date(`${medication.endDate}T12:00:00`).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`
              : "Sin fecha final registrada"}
          </AppText>
        </Card>
      ))}
      <InlineNotice>
        MEDICAREM organiza la información que escribes. No interpreta indicaciones ni hace recomendaciones.
      </InlineNotice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  schedule: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 10 },
  scheduleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  removeSchedule: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  days: { flexDirection: "row", justifyContent: "space-between", gap: 5 },
  day: { width: 39, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  medHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  savedSchedule: { flexDirection: "row", alignItems: "center", gap: 9 },
});
