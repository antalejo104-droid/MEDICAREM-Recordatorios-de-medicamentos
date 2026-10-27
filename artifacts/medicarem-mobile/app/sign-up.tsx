import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSignUp } from "@clerk/expo";
import { Link, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ActionButton, AppInput, AppText, BrandMark } from "@/components/AppUi";
import { useColors } from "@/hooks/useColors";

function messageForAuthError(error: unknown): string {
  const item = (error as { errors?: Array<{ code?: string }> })?.errors?.[0];
  if (item?.code === "form_password_pwned") return "Elige una contraseña distinta y difícil de adivinar.";
  if (item?.code === "form_identifier_exists") return "Ya existe una cuenta con ese correo.";
  return "No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.";
}

export default function SignUpScreen() {
  const colors = useColors();
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    await signUp.finalize();
    router.replace("/");
  };

  const submit = async () => {
    setBusy(true);
    try {
      const result = await signUp.password({
        emailAddress: email.trim(),
        password,
      });
      if (result.error) {
        Alert.alert("No pudimos crear la cuenta", messageForAuthError(result.error));
        return;
      }
      if (signUp.status === "complete") {
        await finish();
        return;
      }
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        Alert.alert("No se pudo enviar el código", "Revisa el correo y vuelve a intentarlo.");
        return;
      }
      setVerificationSent(true);
    } catch {
      Alert.alert("No pudimos crear la cuenta", "Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const result = await signUp.verifications.verifyEmailCode({ code });
      if (result.error) {
        Alert.alert("Código no válido", "Comprueba el código recibido por correo.");
        return;
      }
      if (signUp.status === "complete") await finish();
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
      <AppText variant="title">Crea tu cuenta.</AppText>
      <AppText variant="muted">
        Tu información queda bajo tu control. Confirma el correo para continuar.
      </AppText>
      {!verificationSent ? (
        <>
          <AppInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="input-sign-up-email"
          />
          <AppInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            testID="input-sign-up-password"
          />
          <AppText variant="muted">Usa una contraseña larga que no compartas con otras personas.</AppText>
          <ActionButton
            title={busy || fetchStatus === "fetching" ? "Creando cuenta…" : "Crear cuenta"}
            icon={<Feather name="arrow-right" size={18} color={colors.primaryForeground} />}
            onPress={() => void submit()}
            disabled={busy || !email.trim() || password.length < 8}
            testID="button-sign-up"
          />
        </>
      ) : (
        <>
          <AppInput
            label="Código enviado a tu correo"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
            testID="input-sign-up-code"
          />
          <ActionButton
            title={busy ? "Verificando…" : "Verificar correo"}
            icon={<Feather name="check" size={18} color={colors.primaryForeground} />}
            onPress={() => void verify()}
            disabled={busy || !code.trim()}
            testID="button-verify-sign-up"
          />
          <Pressable onPress={() => void signUp.verifications.sendEmailCode()} accessibilityRole="button">
            <AppText variant="label" style={{ color: colors.primary, textAlign: "center" }}>
              Enviar otro código
            </AppText>
          </Pressable>
        </>
      )}
      <View style={styles.footer}>
        <AppText variant="muted">¿Ya tienes cuenta?</AppText>
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="link" testID="link-sign-in">
            <AppText variant="label" style={{ color: colors.primary }}>Ingresar</AppText>
          </Pressable>
        </Link>
      </View>
      <AppText variant="muted" style={styles.privacy}>
        MEDICAREM es una herramienta de organización, no un servicio de orientación médica.
      </AppText>
      <View nativeID="clerk-captcha" />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: 18, padding: 26, maxWidth: 520, width: "100%", alignSelf: "center" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 8 },
  privacy: { textAlign: "center", marginTop: 16 },
});
