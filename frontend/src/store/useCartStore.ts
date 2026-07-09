import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  lastAddedAt: number;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  hasItem: (productId: string) => boolean;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      // Bumped on every addItem — components watch this to trigger a "just added" animation
      // without needing to diff the items array themselves.
      lastAddedAt: 0,
      addItem: (productId, quantity = 1) => set((state) => {
        const existing = state.items.find((i) => i.productId === productId);
        const items = existing
          ? state.items.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i)
          : [...state.items, { productId, quantity }];
        return { items, lastAddedAt: Date.now() };
      }),
      removeItem: (productId) => set((state) => ({
        items: state.items.filter((i) => i.productId !== productId),
      })),
      updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter((i) => i.productId !== productId) };
        }
        return { items: state.items.map((i) => i.productId === productId ? { ...i, quantity } : i) };
      }),
      clearCart: () => set({ items: [] }),
      hasItem: (productId) => get().items.some((i) => i.productId === productId),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'ferrum-cart',
    }
  )
);
