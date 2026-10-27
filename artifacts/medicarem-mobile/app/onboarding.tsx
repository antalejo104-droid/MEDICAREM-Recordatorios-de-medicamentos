import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { UserRole, getGetProfileQueryKey, useSaveProfile } from "@workspace/api-client-react";
import { Redirect, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ActionButton, AppInput, AppText, BrandMark, Card } from "@/components/AppUi";
import { useUser } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";

export default function OnboardingScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const saveProfile = useSaveProfile();
  const [displayName, setDisplayName] = useState(user?.fullName ?? "");
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  const save = async () => {
    if (!displayName.trim()) return;
    try {
      await saveProfile.mutateAsync({
        data: {
          displayName: displayName.trim(),
          role,
          timezone: "America/Bogota",
          largeText: false,
          notificationsEnabled: false,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      router.replace("/");
    } catch {
      Alert.alert("No se pudo guardar", "Comprueba tu conexión e inténtalo de nuevo.");
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.page, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      bottomOffset={70}
    >
      <View style={styles.brand}>
        <BrandMark />
        <AppText variant="heading">Bienvenido a MEDICAREM</AppText>
      </View>
      <Card>
        <AppText variant="title">Empecemos por conocerte.</AppText>
        <AppText variant="muted">
          Esta cuenta es personal. Puedes cambiar tus preferencias después.
        </AppText>
        <AppInput
          label="¿Cómo te llamas?"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
          maxLength={80}
          testID="input-onboarding-name"
        />
        <AppText variant="label">¿Cómo usarás MEDICAREM?</AppText>
        <RoleChoice
          title="Organizar mi rutina"
          detail="Registrar mis propios horarios"
          selected={role === UserRole.PATIENT}
          onPress={() => setRole(UserRole.PATIENT)}
        />
        <RoleChoice
          title="Acompañar a alguien"
          detail="Ingresar un código de invitación"
          selected={role === UserRole.CAREGIVER}
          onPress={() => setRole(UserRole.CAREGIVER)}
        />
        <ActionButton
          title={saveProfile.isPending ? "Guardando…" : "Continuar"}
          icon={<Feather name="arrow-right" size={18} color={colors.primaryForeground} />}
          onPress={() => void save()}
          disabled={!displayName.trim() || saveProfile.isPending}
          testID="button-onboarding-continue"
        />
      </Card>
      <AppText variant="muted" style={{ textAlign: "center" }}>
        Tus datos se comparten solo con permisos que tú apruebas.
      </AppText>
    </KeyboardAwareScrollViewCompat>
  );
}

function RoleChoice({
  title,
  detail,
  selected,
  onPress,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.choice,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.secondary : colors.card,
        },
      ]}
    >
      <Feather
        name={selected ? "check-circle" : "circle"}
        size={21}
        color={colors.primary}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="muted">{detail}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: 20, padding: 22, maxWidth: 600, width: "100%", alignSelf: "center" },
  brand: { alignItems: "center", gap: 10 },
  choice: { minHeight: 70, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
});
