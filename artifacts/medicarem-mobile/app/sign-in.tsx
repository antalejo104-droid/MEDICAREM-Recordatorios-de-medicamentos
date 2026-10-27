import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSignIn } from "@clerk/expo";
import { Link, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ActionButton, AppInput, AppText, BrandMark } from "@/components/AppUi";
import { useColors } from "@/hooks/useColors";

function messageForAuthError(error: unknown): string {
  const item = (error as { errors?: Array<{ code?: string }> })?.errors?.[0];
  if (item?.code === "form_password_incorrect") return "El correo o la contraseña no coinciden.";
  if (item?.code === "form_identifier_not_found") return "No encontramos una cuenta con ese correo.";
  return "No pudimos iniciar sesión. Revisa los datos e inténtalo de nuevo.";
}

export default function SignInScreen() {
  const colors = useColors();
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    await signIn.finalize();
    router.replace("/");
  };

  const submit = async () => {
    setBusy(true);
    try {
      const result = await signIn.password({ emailAddress: email.trim(), password });
      if (result.error) {
        Alert.alert("No pudimos ingresar", messageForAuthError(result.error));
        return;
      }
      if (signIn.status === "complete") {
        await finish();
      } else if (signIn.status === "needs_client_trust") {
        const emailFactor = signIn.supportedSecondFactors.find(
          (factor) => factor.strategy === "email_code",
        );
        if (emailFactor) {
          await signIn.mfa.sendEmailCode();
          setVerifying(true);
        } else {
          Alert.alert("Verificación requerida", "Continúa desde la versión web para completar este método de verificación.");
        }
      } else if (signIn.status === "needs_second_factor") {
        Alert.alert("Verificación adicional", "Esta cuenta requiere un segundo factor no disponible en este flujo móvil.");
      }
    } catch {
      Alert.alert("No pudimos ingresar", "Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const result = await signIn.mfa.verifyEmailCode({ code });
      if (result.error) {
        Alert.alert("Código no válido", "Comprueba el código enviado a tu correo.");
        return;
      }
      if (signIn.status === "complete") await finish();
      else Alert.alert("Falta un paso", "No se pudo completar la verificación.");
    } catch {
      Alert.alert("Código no válido", "Comprueba el código e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.page, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      bottomOffset={70}
      keyboardShouldPersistTaps="handled"
    >
      <BrandMark />
      <AppText variant="title">Qué bueno verte.</AppText>
      <AppText variant="muted">Ingresa para consultar tu organización diaria.</AppText>
      {verifying ? (
        <>
          <AppInput
            label="Código enviado a tu correo"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
            testID="input-sign-in-code"
          />
          <ActionButton
            title={busy ? "Verificando…" : "Verificar e ingresar"}
            icon={<Feather name="check" size={18} color={colors.primaryForeground} />}
            onPress={() => void verify()}
            disabled={busy || !code.trim()}
            testID="button-verify-code"
          />
          <Pressable onPress={() => void signIn.mfa.sendEmailCode()} accessibilityRole="button">
            <AppText variant="label" style={{ color: colors.primary, textAlign: "center" }}>
              Enviar otro código
            </AppText>
          </Pressable>
        </>
      ) : (
        <>
          <AppInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="input-sign-in-email"
          />
          <AppInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            testID="input-sign-in-password"
          />
          <ActionButton
            title={busy || fetchStatus === "fetching" ? "Ingresando…" : "Ingresar"}
            icon={<Feather name="arrow-right" size={18} color={colors.primaryForeground} />}
            onPress={() => void submit()}
            disabled={busy || !email.trim() || !password}
            testID="button-sign-in"
          />
        </>
      )}
      <View style={styles.footer}>
        <AppText variant="muted">¿Aún no tienes cuenta?</AppText>
        <Link href="/sign-up" asChild>
          <Pressable accessibilityRole="link" testID="link-sign-up">
            <AppText variant="label" style={{ color: colors.primary }}>Crear una cuenta</AppText>
          </Pressable>
        </Link>
      </View>
      <AppText variant="muted" style={styles.privacy}>
        MEDICAREM ayuda a organizar información. No ofrece recomendaciones médicas.
      </AppText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: 18, padding: 26, maxWidth: 520, width: "100%", alignSelf: "center" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 8 },
  privacy: { textAlign: "center", marginTop: 16 },
});
