import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ServiceProviderRequest, serviceProviderRequestsApi } from "../../../src/api/service-provider-requests.api";
import { Card, Empty, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../../src/components/ui";
import { friendlyError } from "../../../src/lib/errors";

function date(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SmeServicesRequestHistory() {
  const [requests, setRequests] = useState<ServiceProviderRequest[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      setRequests(await serviceProviderRequestsApi.mine());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const activeCount = useMemo(() => requests.filter((request) => !["COMPLETED", "CANCELLED"].includes(request.status)).length, [requests]);

  return <Protected><Screen title="SME Services requests" refreshing={refreshing} onRefresh={load}>
    <Text style={ui.pageIntro}>Track your skilled-service requests from submission through KariGO review. Provider private phone and email details are not shown in the Customer App.</Text>
    <Card>
      <Text style={ui.cardTitle}>Request summary</Text>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Total requests</Text><Text style={ui.priceValue}>{requests.length}</Text></View>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Active requests</Text><Text style={ui.priceValue}>{activeCount}</Text></View>
    </Card>
    <Message error>{error}</Message>
    {refreshing && requests.length === 0 ? <Loading label="Loading SME Services requests..." /> : null}
    {!refreshing && requests.length === 0 ? <Empty message="Your SME Services requests will appear here after you submit one." /> : requests.map((request) =>
      <Pressable key={request.id} accessibilityRole="button" accessibilityLabel={`Open request ${request.requestNumber}`} onPress={() => router.push(`/sme-services/requests/${request.id}`)}>
        <Card>
          <Text style={ui.cardTitle}>{request.requestNumber}</Text>
          <StatusBadge status={request.status} />
          <Text style={ui.cardText}>{request.serviceLabel}</Text>
          <Text style={ui.muted}>{request.serviceAddress.label} - {request.serviceAddress.city}, {request.serviceAddress.state}</Text>
          <Text style={ui.muted}>Submitted {date(request.createdAt)}</Text>
        </Card>
      </Pressable>
    )}
  </Screen></Protected>;
}
