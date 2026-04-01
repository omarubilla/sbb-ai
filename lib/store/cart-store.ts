import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

// Types
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  catalogNumber?: string;
}

export function getCartLineId(productId: string, size?: string) {
  return `${productId}::${size ?? "default"}`;
}

function isSameLineItem(
  item: Pick<CartItem, "productId" | "size">,
  productId: string,
  size?: string,
) {
  return getCartLineId(item.productId, item.size) === getCartLineId(productId, size);
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

export interface CartActions {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export type CartStore = CartState & CartActions;

// Default state
export const defaultInitState: CartState = {
  items: [],
  isOpen: false,
};

/**
 * Cart store factory - creates new store instance per provider
 * Uses persist middleware with skipHydration for Next.js SSR compatibility
 * @see https://zustand.docs.pmnd.rs/guides/nextjs#hydration-and-asynchronous-storages
 */
export const createCartStore = (initState: CartState = defaultInitState) => {
  return createStore<CartStore>()(
    persist(
      (set) => ({
        ...initState,

        addItem: (item, quantity = 1) =>
          set((state) => {
            const existing = state.items.find((i) =>
              isSameLineItem(i, item.productId, item.size),
            );
            if (existing) {
              return {
                items: state.items.map((i) =>
                  isSameLineItem(i, item.productId, item.size)
                    ? { ...i, quantity: i.quantity + quantity }
                    : i,
                ),
              };
            }
            return { items: [...state.items, { ...item, quantity }] };
          }),

        removeItem: (productId, size) =>
          set((state) => ({
            items: state.items.filter((i) => !isSameLineItem(i, productId, size)),
          })),

        updateQuantity: (productId, quantity, size) =>
          set((state) => {
            if (quantity <= 0) {
              return {
                items: state.items.filter(
                  (i) => !isSameLineItem(i, productId, size),
                ),
              };
            }
            return {
              items: state.items.map((i) =>
                isSameLineItem(i, productId, size) ? { ...i, quantity } : i,
              ),
            };
          }),

        clearCart: () => set({ items: [] }),
        toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
        openCart: () => set({ isOpen: true }),
        closeCart: () => set({ isOpen: false }),
      }),
      {
        name: "cart-storage",
        // Skip automatic hydration - we'll trigger it manually on the client
        skipHydration: true,
        // Only persist items, not UI state like isOpen
        partialize: (state) => ({ items: state.items }),
      },
    ),
  );
};