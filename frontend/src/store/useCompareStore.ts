import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareState {
  items: string[]; // Product IDs (max 3)
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearCompare: () => void;
  hasItem: (id: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (id) => set((state) => {
        if (state.items.includes(id)) {
          return { items: state.items.filter((itemId) => itemId !== id) };
        }
        if (state.items.length >= 3) {
          // If we already have 3, we can either throw/toast or replace the oldest
          // For now, let's just ignore adding a 4th or we can toast in the UI layer
          return state;
        }
        return { items: [...state.items, id] };
      }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((itemId) => itemId !== id) })),
      clearCompare: () => set({ items: [] }),
      hasItem: (id) => get().items.includes(id),
    }),
    {
      name: 'asil-compare',
    }
  )
);
