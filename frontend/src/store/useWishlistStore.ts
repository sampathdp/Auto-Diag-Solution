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
    }),
    {
      name: 'asil-wishlist',
    }
  )
);
