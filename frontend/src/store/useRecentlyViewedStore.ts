import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentlyViewedState {
  items: string[]; // Product IDs, max 8, index 0 is most recent
  addViewedItem: (id: string) => void;
  clearRecentlyViewed: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      addViewedItem: (id) => set((state) => {
        // Remove it if it exists to move it to the front
        const filtered = state.items.filter((itemId) => itemId !== id);
        // Add to front, take top 8
        const newItems = [id, ...filtered].slice(0, 8);
        return { items: newItems };
      }),
      clearRecentlyViewed: () => set({ items: [] }),
    }),
    {
      name: 'asil-recently-viewed',
    }
  )
);
