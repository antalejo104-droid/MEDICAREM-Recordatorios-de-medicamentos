import { useAuth } from "@clerk/expo";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { AppText, BrandMark } from "@/components/AppUi";

function statusCode(error: unknown): number | undefined {
  const value = error as { status?: number; response?: { status?: number } } | undefined;
  return value?.status ?? value?.response?.status;
}

export default function IndexRoute() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const profile = useGetProfile({
    query: {
      queryKey: getGetProfileQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
    },
  });
  if (!isLoaded) return <Loading />;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (profile.isLoading) return <Loading />;
  if (statusCode(profile.error) === 404) return <Redirect href="/onboarding" />;
  if (profile.data) return <Redirect href="/(tabs)" />;
  return (
    <View style={[styles.state, { backgroundColor: colors.background }]}>
      <BrandMark />
      <AppText variant="heading">No pudimos abrir tu espacio</AppText>
      <AppText variant="muted">Revisa tu conexión e inténtalo de nuevo.</AppText>
    </View>
  );
}

function Loading() {
  const colors = useColors();
  return (
    <View style={[styles.state, { backgroundColor: colors.background }]}>
      <BrandMark />
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText variant="muted">Cargando MEDICAREM…</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 28 },
});
