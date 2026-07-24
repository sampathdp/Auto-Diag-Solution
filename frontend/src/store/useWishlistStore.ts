import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface WishlistState {
  items: string[]; // Product IDs
  isInitialized: boolean;
  init: () => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  hasItem: (id: string) => boolean;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isInitialized: false,
      init: async () => {
        try {
          const res = await apiClient.get('/account/wishlist');
          if (res.data?.data) {
            set({ items: res.data.data.map((p: any) => p.id), isInitialized: true });
          }
        } catch (err) {
          console.error("Failed to fetch wishlist", err);
        }
      },
      toggleItem: async (id) => {
        const isCurrentlyInWishlist = get().items.includes(id);
        // Optimistic update
        set((state) => {
          if (isCurrentlyInWishlist) {
            return { items: state.items.filter((itemId) => itemId !== id) };
          }
          return { items: [...state.items, id] };
        });

        try {
          if (isCurrentlyInWishlist) {
            await apiClient.delete(`/account/wishlist/${id}`);
            toast.success("Removed from wishlist");
          } else {
            await apiClient.post(`/account/wishlist/${id}`);
            toast.success("Added to wishlist");
          }
        } catch (err) {
          // Revert on failure
          set((state) => {
            if (isCurrentlyInWishlist) {
              return { items: [...state.items, id] };
            }
            return { items: state.items.filter((itemId) => itemId !== id) };
          });
          toast.error("Failed to update wishlist");
        }
      },
      removeItem: async (id) => {
        const isCurrentlyInWishlist = get().items.includes(id);
        if (!isCurrentlyInWishlist) return;

        // Optimistic
        set((state) => ({ items: state.items.filter((itemId) => itemId !== id) }));

        try {
          await apiClient.delete(`/account/wishlist/${id}`);
          toast.success("Removed from wishlist");
        } catch (err) {
          set((state) => ({ items: [...state.items, id] }));
          toast.error("Failed to remove item");
        }
      },
      clearWishlist: async () => {
        const prevItems = get().items;
        set({ items: [] });
        
        try {
          await apiClient.delete('/account/wishlist/clear');
          toast.success("Wishlist cleared");
        } catch (err) {
          set({ items: prevItems });
          toast.error("Failed to clear wishlist");
        }
      },
      hasItem: (id) => get().items.includes(id),
      // Called on logout — without this, the persisted items/isInitialized survive
      // into the next session (a different account, or a guest), so the header
      // badge and page title show a stale count from the previous user's wishlist
      // while /account/wishlist correctly returns the new session's (possibly
      // empty) data. isInitialized must reset too, or GlobalStateInitializer's
      // `if (!store.isInitialized)` guard skips re-fetching for the new session.
      reset: () => set({ items: [], isInitialized: false }),
    }),
    {
      name: 'asil-wishlist',
      // isInitialized must NOT persist: if it did, once true it stays true in
      // localStorage forever, so GlobalStateInitializer's `if (!isInitialized)`
      // guard would skip re-fetching on every future page load — leaving `items`
      // (and therefore the header badge / page title count) frozen at whatever
      // it was the last time init() actually ran, even after products get
      // deactivated/deleted server-side. Only `items` is persisted, purely as an
      // instant-paint cache until the real fetch resolves.
      partialize: (state) => ({ items: state.items }),
      // Browsers that already have an old localStorage blob (written before
      // partialize existed) still have isInitialized: true baked into that JSON —
      // partialize only stops *future* writes, it doesn't purge what's already on
      // disk, so rehydration would otherwise read that stale `true` right back in.
      // Force it false post-hydration so GlobalStateInitializer always re-fetches
      // on a fresh load, regardless of what an old session left behind.
      onRehydrateStorage: () => (state) => {
        if (state) state.isInitialized = false;
      },
    }
  )
);
