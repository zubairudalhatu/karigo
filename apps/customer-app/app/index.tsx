import { Redirect } from "expo-router";
import { Loading } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";

export default function CustomerWelcome() {
  const { loading } = useAuth();
  if (loading) return <Loading label="Opening KariGO..." />;

  return <Redirect href="/tabs/home" />;
}
