import { useState } from "react";
import { Alert, Share, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  InvitationStatus,
  UserRole,
  getGetProfileQueryKey,
  getListCaregiverInvitationsQueryKey,
  useGetProfile,
  useCreateCaregiverInvitation,
  useListCaregiverInvitations,
  useRedeemCaregiverInvitation,
  useUpdateCaregiverInvitation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Screen, AppText, PageHeading, Card, ActionButton, AppInput, InlineNotice } from "@/components/AppUi";
import { useColors } from "@/hooks/useColors";

export default function CaregiversScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const profileQuery = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const profile = profileQuery.data;
  const invitations = useListCaregiverInvitations({
    query: {
      queryKey: getListCaregiverInvitationsQueryKey(),
      enabled: Boolean(profile),
    },
  });
  const createInvitation = useCreateCaregiverInvitation();
  const redeemInvitation = useRedeemCaregiverInvitation();
  const updateInvitation = useUpdateCaregiverInvitation();
  const [code, setCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [message, setMessage] = useState("");
  const isPatient = profile?.role === UserRole.PATIENT;

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: getListCaregiverInvitationsQueryKey(),
    });
  };

  const createCode = async () => {
    setMessage("");
    try {
      const invitation = await createInvitation.mutateAsync();
      setNewCode(invitation.code ?? "");
      await refresh();
    } catch {
      setMessage("No se pudo crear un código. Inténtalo de nuevo.");
    }
  };

  const redeem = async () => {
    setMessage("");
    try {
      await redeemInvitation.mutateAsync({ data: { code: code.trim() } });
      setCode("");
      setMessage("Solicitud enviada. La persona titular debe aprobar el acceso.");
      await refresh();
    } catch {
      setMessage("El código no existe, venció o ya fue utilizado.");
    }
  };

  const updateStatus = async (
    id: number,
    status: typeof InvitationStatus.ACTIVE | typeof InvitationStatus.REVOKED,
  ) => {
    try {
      await updateInvitation.mutateAsync({ id, data: { status } });
      setMessage(
        status === InvitationStatus.ACTIVE
          ? "Acceso aprobado."
          : "Acceso revocado.",
      );
      await refresh();
    } catch {
      setMessage("No se pudo actualizar el acceso. Inténtalo de nuevo.");
    }
  };

  if (!profile) {
    return <Screen><PageHeading title="Cuidadores" subtitle="Cargando permisos." /></Screen>;
  }

  return (
    <Screen>
      <PageHeading
        title="Cuidadores"
        subtitle={isPatient ? "Tú decides quién puede consultar tu información." : "El acceso solo se activa cuando la persona titular lo aprueba."}
      />
      {isPatient ? (
        <Card>
          <AppText variant="heading">Invitar a una persona de confianza</AppText>
          <AppText variant="muted">
            El código se muestra una sola vez. Compártelo directamente con la persona que elegiste.
          </AppText>
          {newCode ? (
            <View style={[styles.codeBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <AppText variant="title" style={{ color: colors.primary, textAlign: "center", letterSpacing: 3 }}>
                {newCode}
              </AppText>
              <AppText variant="muted" style={{ textAlign: "center" }}>
                Vence en siete días y solo se puede usar una vez.
              </AppText>
              <ActionButton
                title="Compartir código"
                icon={<Feather name="share-2" size={18} color={colors.primaryForeground} />}
                onPress={() =>
                  void Share.share({
                    message: `Código de invitación MEDICAREM: ${newCode}. Solo para la persona autorizada por mí.`,
                  })
                }
                testID="button-share-invitation"
              />
            </View>
          ) : (
            <ActionButton
              title={createInvitation.isPending ? "Creando código…" : "Crear código de invitación"}
              icon={<Feather name="key" size={18} color={colors.primaryForeground} />}
              onPress={() => void createCode()}
              disabled={createInvitation.isPending}
              testID="button-create-invitation"
            />
          )}
        </Card>
      ) : (
        <Card>
          <AppText variant="heading">Ingresar código</AppText>
          <AppText variant="muted">
            El código inicia una solicitud. No podrás consultar datos hasta que la persona titular apruebe el acceso.
          </AppText>
          <AppInput
            label="Código de invitación"
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            autoCapitalize="characters"
            maxLength={16}
            testID="input-caregiver-code"
          />
          <ActionButton
            title={redeemInvitation.isPending ? "Enviando…" : "Solicitar acceso"}
            onPress={() => void redeem()}
            disabled={code.trim().length < 6 || redeemInvitation.isPending}
            testID="button-redeem-invitation"
          />
        </Card>
      )}
      {message ? <InlineNotice tone={message.includes("No se pudo") || message.includes("no existe") ? "warning" : "success"}>{message}</InlineNotice> : null}
      {invitations.error ? (
        <InlineNotice tone="warning">No pudimos cargar las autorizaciones. Inténtalo de nuevo.</InlineNotice>
      ) : null}
      <AppText variant="heading">{isPatient ? "Autorizaciones" : "Solicitudes y accesos"}</AppText>
      {invitations.isLoading ? (
        <Card><AppText variant="muted">Cargando permisos…</AppText></Card>
      ) : (invitations.data ?? []).length === 0 ? (
        <Card>
          <AppText variant="muted">
            {isPatient
              ? "Aún no has creado autorizaciones."
              : "No tienes invitaciones. Pide un código a la persona que quieres acompañar."}
          </AppText>
        </Card>
      ) : (invitations.data ?? []).map((invitation) => (
        <Card key={invitation.id}>
          <View style={styles.invitationHeading}>
            <Feather name="user" size={19} color={colors.primary} />
            <AppText variant="heading" style={{ flex: 1 }}>
              {isPatient ? invitation.caregiverName ?? "Solicitud recibida" : invitation.patientName}
            </AppText>
          </View>
          <AppText variant="label">
            {invitation.status === InvitationStatus.ACTIVE
              ? "Acceso aprobado"
              : invitation.status === InvitationStatus.REVOKED
                ? "Acceso revocado"
                : invitation.caregiverId
                  ? "Pendiente de aprobación"
                  : "Código pendiente de uso"}
          </AppText>
          <AppText variant="muted">
            Creada el {new Date(invitation.createdAt).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
          </AppText>
          {isPatient &&
          invitation.status === InvitationStatus.PENDING &&
          invitation.caregiverId ? (
            <View style={styles.actions}>
              <ActionButton
                title="Aprobar acceso"
                icon={<Feather name="check" size={18} color={colors.primaryForeground} />}
                onPress={() => void updateStatus(invitation.id, InvitationStatus.ACTIVE)}
                disabled={updateInvitation.isPending}
                testID={`button-approve-caregiver-${invitation.id}`}
                style={{ flex: 1 }}
              />
              <ActionButton
                title="Rechazar"
                variant="secondary"
                onPress={() =>
                  Alert.alert(
                    "Rechazar solicitud",
                    "La persona no podrá consultar tus datos con esta invitación.",
                    [
                      { text: "Volver", style: "cancel" },
                      {
                        text: "Rechazar",
                        style: "destructive",
                        onPress: () => void updateStatus(invitation.id, InvitationStatus.REVOKED),
                      },
                    ],
                  )
                }
                disabled={updateInvitation.isPending}
                testID={`button-reject-caregiver-${invitation.id}`}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
          {isPatient && invitation.status === InvitationStatus.ACTIVE ? (
            <ActionButton
              title="Revocar acceso"
              variant="secondary"
              icon={<Feather name="user-x" size={18} color={colors.secondaryForeground} />}
              onPress={() =>
                Alert.alert(
                  "Revocar acceso",
                  "La persona dejará de ver tu información compartida.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Revocar",
                      style: "destructive",
                      onPress: () => void updateStatus(invitation.id, InvitationStatus.REVOKED),
                    },
                  ],
                )
              }
              disabled={updateInvitation.isPending}
              testID={`button-revoke-caregiver-${invitation.id}`}
            />
          ) : null}
        </Card>
      ))}
      <InlineNotice>
        La persona titular puede retirar un permiso cuando quiera. Los códigos vencen en siete días y no revelan información antes de aprobar.
      </InlineNotice>
      <ActionButton
        title="Volver al perfil"
        variant="quiet"
        onPress={() => router.replace("/(tabs)/profile")}
        testID="button-back-to-profile"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBox: { borderWidth: 1, borderRadius: 16, padding: 17, gap: 13 },
  invitationHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { gap: 9 },
});
