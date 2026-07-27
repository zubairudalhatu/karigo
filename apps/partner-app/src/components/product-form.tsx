import { brand } from "@karigo/config";
import type { ProductCategory, ProductSummary, VendorProductInput } from "@karigo/shared-types";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, MutedText, PrimaryButton, TextField } from "./ui";
import { pickAndUploadImage } from "../lib/upload-pickers";

const productCategories: Array<{ value: ProductCategory; label: string }> = [
  { value: "FOOD", label: "Food" },
  { value: "GROCERIES", label: "Groceries" },
  { value: "MARKET_ITEMS", label: "Market items" }
];

export interface PartnerProductFormState {
  name: string;
  description: string;
  category: string;
  productCategory: ProductCategory;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

const emptyProductForm: PartnerProductFormState = {
  name: "",
  description: "",
  category: "",
  productCategory: "FOOD",
  price: "",
  imageUrl: "",
  isAvailable: true,
  isFeatured: false
};

export function productToForm(product?: ProductSummary | null): PartnerProductFormState {
  if (!product) return emptyProductForm;
  return {
    name: product.name,
    description: product.description,
    category: product.category ?? "",
    productCategory: product.productCategory,
    price: String(product.price),
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
    isFeatured: !!product.isFeatured
  };
}

function toProductInput(form: PartnerProductFormState): VendorProductInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim() || undefined,
    productCategory: form.productCategory,
    price: Number(form.price),
    imageUrl: form.imageUrl.trim(),
    isAvailable: form.isAvailable,
    isFeatured: form.isFeatured
  };
}

function validate(form: PartnerProductFormState) {
  if (form.name.trim().length < 2) return "Product name must be at least 2 characters.";
  if (form.description.trim().length < 8) return "Description must be at least 8 characters.";
  if (!Number.isFinite(Number(form.price)) || Number(form.price) < 1) return "Enter a valid product price.";
  if (!/^https:\/\/\S+$/i.test(form.imageUrl.trim())) return "Product image URL must start with https://.";
  return null;
}

export function PartnerProductForm({
  initialProduct,
  onSubmit,
  saving,
  submitLabel
}: {
  initialProduct?: ProductSummary | null;
  onSubmit: (payload: VendorProductInput) => Promise<void>;
  saving: boolean;
  submitLabel: string;
}) {
  const initialState = useMemo(() => productToForm(initialProduct), [initialProduct]);
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function submit() {
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    await onSubmit(toProductInput(form));
  }

  async function uploadProductImage() {
    setUploadingImage(true);
    setError(null);
    try {
      const uploaded = await pickAndUploadImage("product-image");
      if (uploaded) setForm((current) => ({ ...current, imageUrl: uploaded.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product image could not be uploaded.");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <Card>
      <TextField label="Product name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
      <TextField
        label="Description"
        value={form.description}
        multiline
        onChangeText={(description) => setForm({ ...form, description })}
        style={styles.multiline}
      />
      <TextField
        label="Display category"
        placeholder="Rice, Shawarma, Cleaning item..."
        value={form.category}
        onChangeText={(category) => setForm({ ...form, category })}
      />
      <View style={styles.field}>
        <Text style={styles.label}>Product category</Text>
        <View style={styles.choiceRow}>
          {productCategories.map((category) => {
            const active = form.productCategory === category.value;
            return (
              <Pressable
                accessibilityRole="button"
                key={category.value}
                onPress={() => setForm({ ...form, productCategory: category.value })}
                style={[styles.choice, active ? styles.choiceActive : null]}
              >
                <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{category.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <TextField
        label="Price"
        keyboardType="numeric"
        placeholder="2500"
        value={form.price}
        onChangeText={(price) => setForm({ ...form, price: price.replace(/[^\d.]/g, "") })}
      />
      <TextField
        label="Product image URL"
        placeholder="https://..."
        value={form.imageUrl}
        autoCapitalize="none"
        onChangeText={(imageUrl) => setForm({ ...form, imageUrl })}
      />
      <PrimaryButton
        label={uploadingImage ? "Uploading image..." : "Upload product image"}
        onPress={() => void uploadProductImage()}
        disabled={uploadingImage}
        variant="secondary"
      />
      <MutedText>Choose an image from your device or paste an approved HTTPS image URL. Accepted image types are JPG, PNG and WebP.</MutedText>
      <View style={styles.choiceRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setForm({ ...form, isAvailable: !form.isAvailable })}
          style={[styles.choice, form.isAvailable ? styles.choiceActive : null]}
        >
          <Text style={[styles.choiceText, form.isAvailable ? styles.choiceTextActive : null]}>
            {form.isAvailable ? "Available" : "Unavailable"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setForm({ ...form, isFeatured: !form.isFeatured })}
          style={[styles.choice, form.isFeatured ? styles.choiceActive : null]}
        >
          <Text style={[styles.choiceText, form.isFeatured ? styles.choiceTextActive : null]}>
            {form.isFeatured ? "Featured" : "Not featured"}
          </Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={saving ? "Saving..." : submitLabel} onPress={() => void submit()} disabled={saving} />
    </Card>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8
  },
  label: {
    color: brand.colors.charcoal,
    fontSize: 13,
    fontWeight: "800"
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choice: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 999,
    backgroundColor: brand.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  choiceActive: {
    borderColor: brand.colors.primary,
    backgroundColor: "#FEF2F2"
  },
  choiceText: {
    color: brand.colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  choiceTextActive: {
    color: brand.colors.primary
  },
  error: {
    color: brand.colors.primary,
    fontSize: 13,
    fontWeight: "800"
  }
});
