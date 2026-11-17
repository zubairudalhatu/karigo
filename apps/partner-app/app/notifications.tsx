import { useAuth } from "../src/contexts/auth-context";

import { useCallback, useState } from "react";

import { Text } from "react-native";

import { useRouter } from "expo-router";

import { operationsApi } from "../src/api/operations.api";

import { partnerApi } from "../src/api/partner.api";

import { authSessionStore } from "../src/api/client";

import { useOperationsScreen } from "../src/lib/use-operations-screen";

import { notificationDestination } from "../src/lib/operations";

import { AuthGate } from "../src/components/auth-gate";

import {
  Card,
  Hero,
  MutedText,
  PrimaryButton,
  Screen,
} from "../src/components/ui";

function Content() {
  const [page, setPage] = useState(1);
  const read = useCallback(() => operationsApi.notices(page), [page]);
  const view = useOperationsScreen(read);
  const router = useRouter();
  return (
    <Screen>
      <Hero
        title="Notifications"
        subtitle="Business updates, with current information checked when opened."
      />
      {view.error ? <MutedText>{view.error}</MutedText> : null}
      <PrimaryButton
        label="Notification preferences"
        variant="secondary"
        onPress={() => router.push("/profile/notifications")}
      />
      {view.data?.length === 0 ? (
        <MutedText>No updates on this page.</MutedText>
      ) : null}
      {view.data?.map((item) => (
        <Card key={item.id}>
          <Text accessibilityRole="header">
            {item.isRead ? "" : "Unread · "}
            {item.title}
          </Text>
          <MutedText>{item.message}</MutedText>
          <MutedText>{new Date(item.createdAt).toLocaleString()}</MutedText>
          <PrimaryButton
            label="Open update"
            disabled={view.busy}
            onPress={() =>
              void view.run(async () => {
                const generation = authSessionStore.currentGeneration();
                const target = await operationsApi.target(item.id);
                if (!authSessionStore.isCurrent(generation)) return;
                const destination = await notificationDestination(
                  target,
                  partnerApi.orderDetail,
                );
                if (!destination) throw Error("This update is unavailable.");
                if (!authSessionStore.isCurrent(generation)) return;
                await operationsApi.read(item.id);
                if (authSessionStore.isCurrent(generation))
                  router.push(destination);
              })
            }
          />
          {!item.isRead ? (
            <PrimaryButton
              label="Mark read"
              variant="secondary"
              disabled={view.busy}
              onPress={() => void view.run(() => operationsApi.read(item.id))}
            />
          ) : null}
        </Card>
      ))}
      <PrimaryButton
        label="Newer"
        disabled={page === 1 || view.busy}
        variant="secondary"
        onPress={() => setPage((p) => p - 1)}
      />
      <PrimaryButton
        label="Older"
        disabled={view.busy || !view.data || view.data.length < 20}
        variant="secondary"
        onPress={() => setPage((p) => p + 1)}
      />
      <PrimaryButton
        label="Refresh"
        disabled={view.busy}
        variant="secondary"
        onPress={() => void view.load()}
      />
    </Screen>
  );
}

export default function Inbox() {
  const { user } = useAuth();
  return (
    <AuthGate>
      <Content key={user?.id} />
    </AuthGate>
  );
}
