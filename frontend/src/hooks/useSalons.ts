import { useApiList, useApiDetails, useApiMutation } from "./useApi";
import { queryKeys } from "@/api/queryKeys";
import { SalonService, Salon } from "../services/SalonService";

export const useSalons = () => {
  const list = () => useApiList(queryKeys.salons.all, () => SalonService.list());
  
  const create = () => useApiMutation(
    (data: Partial<Salon>) => SalonService.create(data),
    "Salon created successfully!",
    [queryKeys.salons.all]
  );

  const update = () => useApiMutation(
    ({ id, ...data }: { id: number } & Partial<Salon>) => SalonService.update(id, data),
    "Salon updated successfully!",
    [queryKeys.salons.all]
  );

  const remove = () => useApiMutation(
    (id: number) => SalonService.delete(id),
    "Salon deleted successfully!",
    [queryKeys.salons.all]
  );

  return { list, create, update, remove };
};
