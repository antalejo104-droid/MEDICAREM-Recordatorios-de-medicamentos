import { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useClerk } from "@clerk/expo";
import { Link, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  getGetProfileQueryKey,
  UserRole,
  useGetProfile,
  useSaveProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Screen, AppText, PageHeading, Card, InlineNotice } from "@/components/AppUi";
import { cancelMedicationReminders } from "@/lib/notifications";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const profileQuery = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const profile = profileQuery.data;
  const saveProfile = useSaveProfile();
  const [saving, setSaving] = useState(false);

  if (!profile) {
    return <Screen><PageHeading title="Perfil" subtitle="Cargando tus preferencias." /></Screen>;
  }

  const savePreference = async (
    updates: Partial<Pick<typeof profile, "largeText" | "notificationsEnabled">>,
  ) => {
    setSaving(true);
    try {
      await saveProfile.mutateAsync({
        data: {
          displayName: profile.displayName,
          role: profile.role,
          timezone: profile.timezone,
          largeText: updates.largeText ?? profile.largeText,
          notificationsEnabled:
            updates.notificationsEnabled ?? profile.notificationsEnabled,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    } catch {
      Alert.alert("No se pudo guardar", "Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const setNotifications = async (enabled: boolean) => {
    if (!enabled) {
      await cancelMedicationReminders().catch(() => undefined);
      await savePreference({ notificationsEnabled: false });
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert(
        "Recordatorios en el dispositivo",
        "Activa las notificaciones desde la app móvil para recibir recordatorios locales.",
      );
      return;
    }
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("medicarem", {
          name: "Recordatorios MEDICAREM",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Notifications.requestPermissionsAsync();
      }
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            "Permiso no disponible",
            "Puedes activar las notificaciones MEDICAREM en los ajustes del dispositivo.",
            [
              { text: "Ahora no", style: "cancel" },
              { text: "Abrir ajustes", onPress: () => void Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert("Permiso no concedido", "No activamos los recordatorios.");
        }
        return;
      }
      await savePreference({ notificationsEnabled: true });
    } catch {
      Alert.alert("No se pudo activar", "Revisa los permisos de notificación del dispositivo.");
    }
  };

  return (
    <Screen>
      <PageHeading
        title="Perfil"
        subtitle="Preferencias de accesibilidad, recordatorios y acceso compartido."
      />
      <Card>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={23} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{profile.displayName}</AppText>
            <AppText variant="muted">
              {profile.role === UserRole.PATIENT ? "Persona titular" : "Familiar o cuidador"}
            </AppText>
          </View>
        </View>
        <PreferenceRow
          title="Texto más grande"
          detail="Aumenta el tamaño del texto en la aplicación."
          value={profile.largeText}
          onValueChange={(largeText) => void savePreference({ largeText })}
          disabled={saving}
        />
        <PreferenceRow
          title="Recordatorios locales"
          detail="Permite notificaciones del dispositivo. El aviso no muestra el nombre ni la dosis."
          value={profile.notificationsEnabled}
          onValueChange={(enabled) => void setNotifications(enabled)}
          disabled={saving}
        />
      </Card>
      <Card>
        <AppText variant="heading">Acompañamiento</AppText>
        <AppText variant="muted">
          Solo tú puedes generar un código, aprobar solicitudes y retirar el acceso de una persona cuidadora.
        </AppText>
        <Link href="/caregivers" asChild>
          <Pressable
            accessibilityRole="link"
            style={[styles.linkRow, { borderColor: colors.border }]}
            testID="link-caregiver-management"
          >
            <Feather name="users" size={19} color={colors.primary} />
            <AppText variant="label" style={{ flex: 1 }}>
              {profile.role === UserRole.PATIENT ? "Administrar autorizaciones" : "Ingresar código de invitación"}
            </AppText>
            <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
          </Pressable>
        </Link>
      </Card>
      <InlineNotice>
        MEDICAREM organiza información reportada. No diagnostica, recomienda ni confirma el consumo.
      </InlineNotice>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void signOut().then(() => router.replace("/sign-in"));
        }}
        style={[styles.signOut, { borderColor: colors.border }]}
        testID="button-sign-out"
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <AppText variant="label" style={{ color: colors.destructive }}>Cerrar sesión</AppText>
      </Pressable>
      <AppText variant="muted" style={{ textAlign: "center" }}>MEDICAREM · Herramienta de organización y registro</AppText>
    </Screen>
  );
}

function PreferenceRow({
  title,
  detail,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.preference, { borderColor: colors.border }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="muted">{detail}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.card}
        accessibilityLabel={title}
        testID={`switch-${title.toLowerCase().replaceAll(" ", "-")}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 13, paddingBottom: 4 },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  preference: { borderTopWidth: 1, paddingTop: 13, flexDirection: "row", gap: 14, alignItems: "center" },
  linkRow: { minHeight: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  signOut: { minHeight: 54, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
});
