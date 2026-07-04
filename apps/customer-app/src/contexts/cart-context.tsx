import type { ProductSummary, ServiceCategory, VendorSummary } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export interface CartItem {
  product: ProductSummary;
  quantity: number;
}

interface CartNotice {
  productName: string;
  message: string;
}

interface CartContextValue {
  vendor: VendorSummary | null;
  serviceCategory: ServiceCategory;
  items: CartItem[];
  subtotal: number;
  count: number;
  notice: CartNotice | null;
  addingProductIds: string[];
  add(vendor: VendorSummary, product: ProductSummary): boolean;
  clearNotice(): void;
  change(productId: string, quantity: number): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState<CartNotice | null>(null);
  const [addingProductIds, setAddingProductIds] = useState<string[]>([]);

  const value = useMemo<CartContextValue>(() => ({
    vendor,
    serviceCategory: (vendor?.businessCategory?.toUpperCase() as ServiceCategory) || "FOOD",
    items,
    subtotal: items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    notice,
    addingProductIds,
    add: (nextVendor, product) => {
      if (!product.isAvailable || addingProductIds.includes(product.id)) return false;
      setAddingProductIds((current) => [...current, product.id]);
      if (vendor && vendor.id !== nextVendor.id) setItems([{ product, quantity: 1 }]);
      else setItems((current) => {
        const existing = current.find((item) => item.product.id === product.id);
        return existing
          ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
          : [...current, { product, quantity: 1 }];
      });
      setVendor(nextVendor);
      setNotice({ productName: product.name, message: `${product.name} added to cart` });
      setTimeout(() => setAddingProductIds((current) => current.filter((id) => id !== product.id)), 900);
      setTimeout(() => setNotice((current) => current?.productName === product.name ? null : current), 2500);
      return true;
    },
    clearNotice: () => setNotice(null),
    change: (productId, quantity) => setItems((current) =>
      quantity <= 0 ? current.filter((item) => item.product.id !== productId) : current.map((item) => item.product.id === productId ? { ...item, quantity } : item)
    ),
    clear: () => { setVendor(null); setItems([]); setNotice(null); }
  }), [addingProductIds, items, notice, vendor]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
