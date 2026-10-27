import { useEffect, useState } from "react";
import {
  getListCaregiverInvitationsQueryKey,
  InvitationStatus,
  UserRole,
  useListCaregiverInvitations,
} from "@workspace/api-client-react";
import type { Profile } from "@workspace/api-client-react";

export function usePatientAccess(profile?: Profile) {
  const invitations = useListCaregiverInvitations({
    query: {
      queryKey: getListCaregiverInvitationsQueryKey(),
      enabled: profile?.role === UserRole.CAREGIVER,
    },
  });
  const activeLinks =
    profile?.role === UserRole.CAREGIVER
      ? (invitations.data ?? []).filter(
          (item) => item.status === InvitationStatus.ACTIVE,
        )
      : [];
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    profile?.role === UserRole.PATIENT ? profile.id : null,
  );

  useEffect(() => {
    if (profile?.role === UserRole.PATIENT) {
      setSelectedPatientId(profile.id);
    } else if (!activeLinks.some((item) => item.patientId === selectedPatientId)) {
      setSelectedPatientId(activeLinks[0]?.patientId ?? null);
    }
  }, [
    activeLinks.map((item) => item.patientId).join(","),
    profile?.id,
    profile?.role,
    selectedPatientId,
  ]);

  const selectedLink = activeLinks.find(
    (item) => item.patientId === selectedPatientId,
  );
  return {
    patientId:
      profile?.role === UserRole.PATIENT
        ? profile.id
        : (selectedLink?.patientId ?? null),
    patientName:
      profile?.role === UserRole.PATIENT
        ? profile.displayName
        : (selectedLink?.patientName ?? ""),
    activeLinks,
    invitations,
    selectedPatientId,
    setSelectedPatientId,
  };
}
