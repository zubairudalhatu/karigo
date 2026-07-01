import type { ProductSummary, ServiceCategory, VendorSummary } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export interface CartItem {
  product: ProductSummary;
  quantity: number;
}

interface CartContextValue {
  vendor: VendorSummary | null;
  serviceCategory: ServiceCategory;
  items: CartItem[];
  subtotal: number;
  add(vendor: VendorSummary, product: ProductSummary): void;
  change(productId: string, quantity: number): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartContextValue>(() => ({
    vendor,
    serviceCategory: (vendor?.businessCategory?.toUpperCase() as ServiceCategory) || "FOOD",
    items,
    subtotal: items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    add: (nextVendor, product) => {
      if (!product.isAvailable) return;
      if (vendor && vendor.id !== nextVendor.id) setItems([{ product, quantity: 1 }]);
      else setItems((current) => {
        const existing = current.find((item) => item.product.id === product.id);
        return existing
          ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
          : [...current, { product, quantity: 1 }];
      });
      setVendor(nextVendor);
    },
    change: (productId, quantity) => setItems((current) =>
      quantity <= 0 ? current.filter((item) => item.product.id !== productId) : current.map((item) => item.product.id === productId ? { ...item, quantity } : item)
    ),
    clear: () => { setVendor(null); setItems([]); }
  }), [items, vendor]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
