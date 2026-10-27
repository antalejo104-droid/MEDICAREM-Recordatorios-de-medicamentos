import React from "react";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useAuth } from "@clerk/expo";
import {
  getGetProfileQueryKey,
  useGetProfile,
} from "@workspace/api-client-react";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useColors } from "@/hooks/useColors";
import { TextScaleProvider } from "@/components/AppUi";
import { UserRole } from "@workspace/api-client-react";
import { AppText } from "@/components/AppUi";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} />
        <NativeTabs.Trigger.Label>Hoy</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="medications">
        <NativeTabs.Trigger.Icon sf={{ default: "pills", selected: "pills.fill" }} />
        <NativeTabs.Trigger.Label>Medicamentos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <NativeTabs.Trigger.Label>Historial</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoy",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="sun.max" tintColor={color} size={23} /> : <Feather name="sun" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "Medicamentos",
          tabBarIcon: ({ color }) => <Feather name="plus-square" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="clock" tintColor={color} size={23} /> : <Feather name="clock" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.crop.circle" tintColor={color} size={23} /> : <Feather name="user" size={21} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const profile = useGetProfile({
    query: {
      queryKey: getGetProfileQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
    },
  });
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (profile.isLoading) return null;
  if (profile.error) {
    const failure = profile.error as { status?: number; response?: { status?: number } };
    if (failure.status === 404 || failure.response?.status === 404) {
      return <Redirect href="/onboarding" />;
    }
    return (
      <View style={styles.error}>
        <AppText variant="heading">No se pudo cargar tu perfil</AppText>
        <AppText variant="muted">Revisa la conexión e inténtalo de nuevo.</AppText>
      </View>
    );
  }
  if (!profile.data) return null;
  const content = isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
  return (
    <TextScaleProvider large={profile.data.role === UserRole.PATIENT && profile.data.largeText}>
      {content}
    </TextScaleProvider>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
});
