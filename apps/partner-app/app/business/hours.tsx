import { useAuth } from "../../src/contexts/auth-context";

import { useCallback, useState } from "react";

import { Text } from "react-native";

import { partnerApi } from "../../src/api/partner.api";

import { useOperationsScreen } from "../../src/lib/use-operations-screen";

import { validBusinessTime } from "../../src/lib/operations";

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
  const read = useCallback(() => partnerApi.profile(), []);
  const view = useOperationsScreen(read);
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  return (
    <Screen>
      <Hero
        title="Business hours"
        subtitle="Scheduled hours for your business."
      />
      {view.error ? <MutedText>{view.error}</MutedText> : null}
      <Card>
        <Text>
          Saved hours: {view.data?.openingTime || "Not set"} –{" "}
          {view.data?.closingTime || "Not set"}
        </Text>
        <MutedText>
          Times use your business’s local time. An earlier closing time means
          the next day. Saving hours does not change your temporary
          Online/Offline status. City readiness still applies.
        </MutedText>
        {view.summary?.canManageHours ? (
          <>
            <TextField
              label="Opening time (HH:mm)"
              value={opening}
              onChangeText={setOpening}
              placeholder={view.data?.openingTime || "09:00"}
              editable={!view.busy}
            />
            <TextField
              label="Closing time (HH:mm)"
              value={closing}
              onChangeText={setClosing}
              placeholder={view.data?.closingTime || "18:00"}
              editable={!view.busy}
            />
            <PrimaryButton
              label="Save scheduled hours"
              disabled={
                view.busy ||
                !validBusinessTime(opening) ||
                !validBusinessTime(closing)
              }
              onPress={() =>
                void view.run(() =>
                  partnerApi.updateProfile({
                    openingTime: opening,
                    closingTime: closing,
                  }),
                )
              }
            />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

export default function Hours() {
  const { user } = useAuth();
  return (
    <AuthGate>
      <Content key={user?.id} />
    </AuthGate>
  );
}
