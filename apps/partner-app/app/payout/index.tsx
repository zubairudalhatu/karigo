import { brand } from "@karigo/config";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PayoutAccountPayload, VendorPayoutAccount } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, Hero, LoadingState, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { formatLabel, statusTone } from "../../src/lib/labels";

const emptyForm: PayoutAccountPayload = {
  accountName: "",
  bankName: "",
  bankCode: "",
  accountNumber: "",
  confirmAccountNumber: ""
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

function AccountSummary({ account }: { account: VendorPayoutAccount }) {
  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.title}>{account.bankName}</Text>
        <Badge label={formatLabel(account.status)} tone={statusTone(account.status)} />
      </View>
      <Text style={styles.accountName}>{account.accountName}</Text>
      <MutedText>{account.maskedAccountNumber}{account.bankCode ? ` - ${account.bankCode}` : ""}</MutedText>
      {account.vendorVisibleNote ? <MutedText>{account.vendorVisibleNote}</MutedText> : null}
      <MutedText>Submitted: {formatDate(account.submittedAt)}</MutedText>
      <MutedText>Last updated: {formatDate(account.lastUpdatedAt)}</MutedText>
      <MutedText>Verified: {formatDate(account.verifiedAt)}</MutedText>
    </Card>
  );
}

function PayoutContent() {
  const [account, setAccount] = useState<VendorPayoutAccount | null>(null);
  const [form, setForm] = useState<PayoutAccountPayload>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const nextAccount = await partnerApi.payoutAccount();
      setAccount(nextAccount);
      if (!nextAccount) setEditing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout account could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit() {
    setForm({
      accountName: account?.accountName ?? "",
      bankName: account?.bankName ?? "",
      bankCode: account?.bankCode ?? "",
      accountNumber: "",
      confirmAccountNumber: ""
    });
    setMessage(null);
    setError(null);
    setEditing(true);
  }

  async function submit() {
    if (!/^\d{10}$/.test(form.accountNumber) || form.accountNumber !== form.confirmAccountNumber) {
      setError("Enter matching 10-digit Nigerian bank account numbers.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = { ...form, bankCode: form.bankCode?.trim() || undefined };
      const saved = account ? await partnerApi.updatePayoutAccount(payload) : await partnerApi.createPayoutAccount(payload);
      setAccount(saved);
      setForm(emptyForm);
      setEditing(false);
      setMessage("Payout account submitted for verification.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout account could not be submitted.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading payout account..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Payout readiness" title="Payout account" subtitle="Add or update bank details for future manual settlement review. This does not trigger payouts." />
      {error ? <MutedText>{error}</MutedText> : null}
      {message ? <MutedText>{message}</MutedText> : null}
      {account && !editing ? (
        <>
          <AccountSummary account={account} />
          <PrimaryButton label="Update payout account" onPress={startEdit} />
        </>
      ) : null}
      {editing ? (
        <Card>
          <Text style={styles.title}>{account ? "Update payout account" : "Set up payout account"}</Text>
          <MutedText>Changing these details sends the account back to KariGO verification. No money is sent from this screen.</MutedText>
          <TextField label="Account name" value={form.accountName} onChangeText={(accountName) => setForm({ ...form, accountName })} />
          <TextField label="Bank name" value={form.bankName} onChangeText={(bankName) => setForm({ ...form, bankName })} />
          <TextField label="Bank code optional" value={form.bankCode} onChangeText={(bankCode) => setForm({ ...form, bankCode })} />
          <TextField
            label="Account number"
            keyboardType="number-pad"
            maxLength={10}
            value={form.accountNumber}
            onChangeText={(accountNumber) => setForm({ ...form, accountNumber: accountNumber.replace(/\D/g, "") })}
          />
          <TextField
            label="Confirm account number"
            keyboardType="number-pad"
            maxLength={10}
            value={form.confirmAccountNumber}
            onChangeText={(confirmAccountNumber) => setForm({ ...form, confirmAccountNumber: confirmAccountNumber.replace(/\D/g, "") })}
          />
          <PrimaryButton label={saving ? "Submitting..." : account ? "Submit updated details" : "Add payout account"} onPress={() => void submit()} disabled={saving} />
          {account ? <PrimaryButton label="Cancel" onPress={() => setEditing(false)} variant="secondary" disabled={saving} /> : null}
        </Card>
      ) : null}
    </Screen>
  );
}

export default function PayoutScreen() {
  return (
    <AuthGate>
      <PayoutContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    flex: 1,
    color: brand.colors.charcoal,
    fontSize: 17,
    fontWeight: "900"
  },
  accountName: {
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "800"
  }
});
