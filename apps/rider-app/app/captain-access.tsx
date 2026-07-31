import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Card, Loading, Message, Screen, ui } from "../src/components/ui";
import { captainAccessApi } from "../src/api/captain-access.api";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { Text } from "react-native";

export default function CaptainAccessBootstrap() {
  const { loading, logout, user } = useAuth();
  const [error, setError] = useState("");

  async function resolveAccess() {
    setError("");
    try {
      const access = await captainAccessApi.resolve();
      router.replace(access.nextStep === "APPLICATION_STATUS" ? "/application-status" : access.nextRoute);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    void resolveAccess();
  }, [loading, user]);

  if (loading) return <Loading label="Restoring Captain session..." />;
  if (!user) return <Loading label="Opening Captain login..." />;

  return <Screen>
    <Card>
      <Text style={ui.sectionTitle}>Preparing your KariGO Captain access...</Text>
      <Text style={ui.muted}>Checking your account, application status and approved Captain modes.</Text>
      <Message error>{error}</Message>
      {error ? <Button title="Try again" onPress={resolveAccess} /> : null}
      {error ? <Button title="Sign out" tone="muted" onPress={logout} /> : null}
    </Card>
  </Screen>;
}
