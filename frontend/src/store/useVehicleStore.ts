import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VehicleContext {
  id?: number;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  nickname?: string;
}

interface VehicleState {
  vehicle: VehicleContext | null;
  setVehicle: (vehicle: VehicleContext | null) => void;
  clearVehicle: () => void;
  initializeFromAccount: (vehicles: any[]) => void;
}

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set, get) => ({
      vehicle: null,
      setVehicle: (vehicle) => set({ vehicle }),
      clearVehicle: () => set({ vehicle: null }),
      initializeFromAccount: (vehicles) => {
        // If there's no vehicle set in local storage, or if there's a default in the account,
        // we might want to sync it. For now, let's prioritize the account's default vehicle
        // if one exists, otherwise keep what's in local storage.
        const defaultVehicle = vehicles.find((v) => v.is_default);
        if (defaultVehicle) {
          set({
            vehicle: {
              id: defaultVehicle.id,
              year: defaultVehicle.year.toString(),
              make: defaultVehicle.make,
              model: defaultVehicle.model,
              trim: defaultVehicle.trim,
              nickname: defaultVehicle.nickname,
            },
          });
        } else if (vehicles.length === 0) {
          // If they have no vehicles, maybe we clear it if the current one has an ID?
          const current = get().vehicle;
          if (current?.id) {
            set({ vehicle: null });
          }
        }
      },
    }),
    {
      name: 'ferrum-vehicle-context',
    }
  )
);
