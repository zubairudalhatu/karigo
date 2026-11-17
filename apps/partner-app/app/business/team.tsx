import { useAuth } from "../../src/contexts/auth-context";

import { useCallback, useState } from "react";

import { Text } from "react-native";

import { operationsApi, TeamRole } from "../../src/api/operations.api";

import { useOperationsScreen } from "../../src/lib/use-operations-screen";

import { AuthGate } from "../../src/components/auth-gate";

import {
  Card,
  Hero,
  MutedText,
  PrimaryButton,
  Screen,
  TextField,
} from "../../src/components/ui";

function Content() {
  const read = useCallback(() => operationsApi.team(), []);
  const view = useOperationsScreen(read);
  const [fullName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<TeamRole>("VIEWER");

  return (
    <Screen>
      <Hero
        title="Team invitations"
        subtitle="Manage this business’s invitation records."
      />
      <Card>
        <MutedText>
          Invitation acceptance, delivery and staff workspace access are not
          available yet. Creating a record does not send a message or grant
          access. Business ownership stays with the account owner.
        </MutedText>
      </Card>
      {view.error ? <MutedText>{view.error}</MutedText> : null}

      {view.summary?.canManageTeamInvitations ? (
        <Card>
          <TextField
            label="Member name"
            value={fullName}
            onChangeText={setName}
            editable={!view.busy}
          />
          <TextField
            label="Email"
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            editable={!view.busy}
          />
          <TextField
            label="Phone (optional if email provided)"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            editable={!view.busy}
          />
          <Text>Role: {role.replaceAll("_", " ")}</Text>
          {view.summary.assignableTeamRoles.map((value) => (
            <PrimaryButton
              key={value}
              label={value.replaceAll("_", " ")}
              variant="secondary"
              disabled={view.busy}
              onPress={() => setRole(value)}
            />
          ))}
          <PrimaryButton
            label="Create invitation record"
            disabled={
              view.busy ||
              fullName.trim().length < 2 ||
              (!email.trim() && !phone.trim())
            }
            onPress={() =>
              void view.run(async () => {
                await operationsApi.invite({
                  fullName: fullName.trim(),
                  email: email.trim() || undefined,
                  phoneNumber: phone.trim() || undefined,
                  role,
                });
                setName("");
                setEmail("");
                setPhone("");
              })
            }
          />
        </Card>
      ) : null}

      {view.data?.map((member) => (
        <Card key={member.id}>
          <Text accessibilityRole="header">{member.fullName}</Text>
          <MutedText>
            {member.role} · {member.invitationStatus}
            {member.expiresAt && new Date(member.expiresAt) < new Date()
              ? " · Expired"
              : ""}
          </MutedText>
          <MutedText>{member.email || member.phoneNumber}</MutedText>
          {member.invitationStatus === "PENDING" &&
          member.role !== "OWNER" &&
          view.summary?.canManageTeamInvitations ? (
            <>
              {view.summary.assignableTeamRoles.map((value) => (
                <PrimaryButton
                  key={value}
                  label={`Set role: ${value.replaceAll("_", " ")}`}
                  disabled={view.busy || member.role === value}
                  variant="secondary"
                  onPress={() =>
                    void view.run(() =>
                      operationsApi.updateMember(member.id, value),
                    )
                  }
                />
              ))}
              <PrimaryButton
                label="Revoke invitation"
                disabled={view.busy}
                variant="secondary"
                onPress={() =>
                  void view.run(() => operationsApi.revoke(member.id))
                }
              />
            </>
          ) : null}
        </Card>
      ))}
      {view.data?.length === 0 ? (
        <MutedText>No team invitations.</MutedText>
      ) : null}
      <PrimaryButton
        label="Refresh"
        disabled={view.busy}
        variant="secondary"
        onPress={() => void view.load()}
      />
    </Screen>
  );
}

export default function Team() {
  const { user } = useAuth();
  return (
    <AuthGate>
      <Content key={user?.id} />
    </AuthGate>
  );
}
