import { useAuth } from "../../src/contexts/auth-context";

import { useCallback, useState } from "react";

import { Text, Switch } from "react-native";

import {
  operationsApi,
  Branch,
  BranchInput,
} from "../../src/api/operations.api";

import { useOperationsScreen } from "../../src/lib/use-operations-screen";

import { branchInput } from "../../src/lib/operations";

import { AuthGate } from "../../src/components/auth-gate";

import {
  Card,
  Hero,
  MutedText,
  PrimaryButton,
  Screen,
  TextField,
} from "../../src/components/ui";

const blank: BranchInput = {
  name: "",
  address: "",
  city: "",
  state: "",
  area: "",
  phoneNumber: "",
  isPrimary: false,
  status: "ACTIVE",
};

function Content() {
  const read = useCallback(() => operationsApi.branches(), []);
  const view = useOperationsScreen(read);
  const [form, setForm] = useState<BranchInput | null>(null);
  const [id, setId] = useState<string | null>(null);

  const edit = (branch?: Branch) => {
    setId(branch?.id || null);
    setForm(branch ? branchInput(branch) : { ...blank });
  };

  const save = () =>
    view.run(async () => {
      if (!form) return;
      const body = branchInput(form);
      if (
        body.name.length < 2 ||
        body.address.length < 3 ||
        !body.city ||
        !body.state
      )
        throw Error("Enter the branch name and full address.");
      if (id) await operationsApi.updateBranch(id, body);
      else await operationsApi.createBranch(body);
      setForm(null);
    });

  return (
    <Screen>
      <Hero
        title="Business branches"
        subtitle="Manage your business locations and contact details."
      />
      {view.error ? <MutedText>{view.error}</MutedText> : null}

      {view.summary?.canManageBranches ? (
        <PrimaryButton
          label="Add branch"
          disabled={view.busy}
          onPress={() => edit()}
        />
      ) : null}

      {form && view.summary?.canManageBranches ? (
        <Card>
          <Text>{id ? "Edit branch" : "New branch"}</Text>
          {(
            ["name", "address", "city", "state", "area", "phoneNumber"] as const
          ).map((key) => (
            <TextField
              key={key}
              label={
                key === "phoneNumber"
                  ? "Branch phone"
                  : key.charAt(0).toUpperCase() + key.slice(1)
              }
              value={form[key] || ""}
              onChangeText={(value) => setForm({ ...form, [key]: value })}
              editable={!view.busy}
            />
          ))}

          <Text>Primary business location</Text>
          <Switch
            accessibilityLabel="Primary branch"
            disabled={view.busy || form.status !== "ACTIVE"}
            value={form.isPrimary}
            onValueChange={(isPrimary) => setForm({ ...form, isPrimary })}
          />

          <Text>Status: {form.status}</Text>
          {(["ACTIVE", "INACTIVE", "CLOSED"] as const).map((status) => (
            <PrimaryButton
              key={status}
              label={status}
              disabled={view.busy}
              variant="secondary"
              onPress={() =>
                setForm({
                  ...form,
                  status,
                  isPrimary: status === "ACTIVE" ? form.isPrimary : false,
                })
              }
            />
          ))}

          <MutedText>
            Business-wide scheduled hours are managed separately. No device
            location is needed.
          </MutedText>
          <PrimaryButton
            label="Save branch"
            disabled={view.busy}
            onPress={() => void save()}
          />
          <PrimaryButton
            label="Cancel"
            disabled={view.busy}
            variant="secondary"
            onPress={() => setForm(null)}
          />
        </Card>
      ) : null}

      {view.data?.length === 0 ? <MutedText>No branches yet.</MutedText> : null}
      {view.data?.map((branch) => (
        <Card key={branch.id}>
          <Text accessibilityRole="header">
            {branch.name}
            {branch.isPrimary ? " · Primary" : ""}
          </Text>
          <MutedText>
            {branch.status} · {branch.address}, {branch.city}, {branch.state}
          </MutedText>
          {branch.phoneNumber ? (
            <MutedText>{branch.phoneNumber}</MutedText>
          ) : null}
          {view.summary?.canManageBranches ? (
            <PrimaryButton
              label={`View / edit ${branch.name}`}
              disabled={view.busy}
              variant="secondary"
              onPress={() => edit(branch)}
            />
          ) : null}
        </Card>
      ))}
      <PrimaryButton
        label="Refresh"
        disabled={view.busy}
        variant="secondary"
        onPress={() => void view.load()}
      />
    </Screen>
  );
}

export default function Branches() {
  const { user } = useAuth();
  return (
    <AuthGate>
      <Content key={user?.id} />
    </AuthGate>
  );
}
