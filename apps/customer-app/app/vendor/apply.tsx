import { useState } from "react";
import { Text, View } from "react-native";
import { vendorApplicationsApi, VendorApplicationCategory, VendorApplicationInput, VendorApplicationStatus } from "../../src/api/vendor-applications.api";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { Button, Card, Field, Message, NavLink, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

const categories: { value: VendorApplicationCategory; label: string }[] = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "GROCERIES", label: "Groceries" },
  { value: "MARKET_ITEMS", label: "Market Items" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "PARCEL_LOGISTICS_PARTNER", label: "Parcel/Logistics Partner" },
  { value: "SME_SERVICES", label: "SME Services" },
  { value: "OTHER_MARKETPLACE_VENDOR", label: "Other Marketplace Vendor" }
];

const initialForm: VendorApplicationInput = {
  businessCategory: "RESTAURANT",
  businessName: "",
  businessDescription: "",
  businessAddress: "",
  state: "Kano",
  city: "Kano",
  area: "",
  businessPhoneNumber: "",
  businessEmail: "",
  contactFullName: "",
  contactRole: "",
  contactPhoneNumber: "",
  contactEmail: "",
  preferredContactMethod: "PHONE",
  deliveryReadiness: "",
  deliveryPreference: "KariGO delivery",
  catalogueCategory: "",
  estimatedCatalogueSize: "",
  declarationAccepted: false,
  privacyAccepted: false,
  contactConsentAccepted: false
};

export default function VendorApplication() {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState<VendorApplicationStatus | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      setSubmitted(await vendorApplicationsApi.create(form));
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <>
    <KariGoAppTopBar showBack title="Become a Vendor" />
    <Screen title="Become a KariGO Vendor" topPadding={false}>
      <Text style={ui.pageIntro}>Reach more customers across Kano, manage products and orders, and set up payout details after approval.</Text>
      <Card>
        <Text style={ui.cardTitle}>Apply in a few simple steps</Text>
        <Text style={ui.muted}>Applications are reviewed manually. Approval does not automatically publish a storefront or activate payouts.</Text>
        <NavLink href="/vendor/application-status" label="Check Application Status" />
      </Card>
      <Message error>{error}</Message>
      {submitted ? <Card>
        <Text style={ui.cardTitle}>Application submitted</Text>
        <Text style={ui.pageIntro}>Reference: {submitted.reference}</Text>
        <Text style={ui.muted}>{submitted.message}</Text>
      </Card> : <>
        <Text style={ui.sectionTitle}>Business category</Text>
        <View style={ui.chipGrid}>{categories.map((category) => <Button key={category.value} title={category.label} tone={form.businessCategory === category.value ? "primary" : "muted"} onPress={() => setForm({ ...form, businessCategory: category.value })} />)}</View>
        <Text style={ui.sectionTitle}>Business information</Text>
        <Field placeholder="Business name" value={form.businessName} onChangeText={(businessName) => setForm({ ...form, businessName })} />
        <Field placeholder="Business description" value={form.businessDescription} onChangeText={(businessDescription) => setForm({ ...form, businessDescription })} multiline />
        <Field placeholder="Business address" value={form.businessAddress} onChangeText={(businessAddress) => setForm({ ...form, businessAddress })} />
        <Field placeholder="Area" value={form.area} onChangeText={(area) => setForm({ ...form, area })} />
        <Field placeholder="Business phone number" value={form.businessPhoneNumber} onChangeText={(businessPhoneNumber) => setForm({ ...form, businessPhoneNumber })} keyboardType="phone-pad" />
        <Field placeholder="Business email" value={form.businessEmail} onChangeText={(businessEmail) => setForm({ ...form, businessEmail })} keyboardType="email-address" autoCapitalize="none" />
        <Text style={ui.sectionTitle}>Contact person</Text>
        <Field placeholder="Full name" value={form.contactFullName} onChangeText={(contactFullName) => setForm({ ...form, contactFullName })} />
        <Field placeholder="Role" value={form.contactRole} onChangeText={(contactRole) => setForm({ ...form, contactRole })} />
        <Field placeholder="Phone number" value={form.contactPhoneNumber} onChangeText={(contactPhoneNumber) => setForm({ ...form, contactPhoneNumber })} keyboardType="phone-pad" />
        <Field placeholder="Email address" value={form.contactEmail} onChangeText={(contactEmail) => setForm({ ...form, contactEmail })} keyboardType="email-address" autoCapitalize="none" />
        <Text style={ui.sectionTitle}>Operations</Text>
        <Field placeholder="Delivery readiness" value={form.deliveryReadiness} onChangeText={(deliveryReadiness) => setForm({ ...form, deliveryReadiness })} />
        <Field placeholder="Product or menu category" value={form.catalogueCategory} onChangeText={(catalogueCategory) => setForm({ ...form, catalogueCategory })} />
        <Field placeholder="Estimated catalogue size" value={form.estimatedCatalogueSize} onChangeText={(estimatedCatalogueSize) => setForm({ ...form, estimatedCatalogueSize })} />
        <Card><Text style={ui.cardTitle}>Terms and submission</Text>
          <Toggle label="I confirm this application is accurate." value={form.declarationAccepted} onPress={() => setForm({ ...form, declarationAccepted: !form.declarationAccepted })} />
          <Toggle label="I acknowledge KariGO's privacy process." value={form.privacyAccepted} onPress={() => setForm({ ...form, privacyAccepted: !form.privacyAccepted })} />
          <Toggle label="I consent to KariGO contacting me about this application." value={form.contactConsentAccepted} onPress={() => setForm({ ...form, contactConsentAccepted: !form.contactConsentAccepted })} />
        </Card>
        <Button title="Submit application" disabled={!form.declarationAccepted || !form.privacyAccepted || !form.contactConsentAccepted} onPress={submit} />
      </>}
    </Screen>
  </>;
}

function Toggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return <Button title={`${value ? "Selected" : "Select"} - ${label}`} tone={value ? "primary" : "muted"} onPress={onPress} />;
}
