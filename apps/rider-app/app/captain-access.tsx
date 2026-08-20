import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Card, Loading, Message, Screen, ui } from "../src/components/ui";
import { CaptainHomeSkeleton } from "../src/components/captain-home-cockpit";
import { captainAccessApi } from "../src/api/captain-access.api";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { Text } from "react-native";

export default function CaptainAccessBootstrap() {
  const { loading, logout, user } = useAuth();
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(true);

  async function resolveAccess() {
    setError("");
    setResolving(true);
    try {
      const access = await captainAccessApi.resolve();
      router.replace(access.nextStep === "APPLICATION_STATUS" ? "/application-status" : access.nextRoute);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setResolving(false);
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

  if (loading) return <CaptainHomeSkeleton captainName="Captain" />;
  if (!user) return <Loading label="Opening Captain login..." />;
  if (resolving && !error) return <CaptainHomeSkeleton captainName={user.fullName?.split(/\s+/)[0] || "Captain"} />;

  return <Screen>
    <Card>
      <Text style={ui.sectionTitle}>We couldn't open your Captain workspace.</Text>
      <Text style={ui.muted}>Your session is safe. Try the account check again.</Text>
      <Message error>{error}</Message>
      {error ? <Button title="Try again" onPress={resolveAccess} /> : null}
      {error ? <Button title="Sign out" tone="muted" onPress={logout} /> : null}
    </Card>
  </Screen>;
}
