"use client";

import { useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/account/EmptyState";
import { SideDrawer } from "@/components/account/SideDrawer";
import { VehicleDrawer } from "@/components/account/VehicleDrawer";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import toast from "react-hot-toast";
import { useVehicleStore } from "@/store/useVehicleStore";
import { Link } from "@/i18n/navigation";
import apiClient from "@/lib/api/client";
import { CarFront, Edit2, Trash2, CheckCircle2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VehiclesPage() {
  const setGlobalVehicle = useVehicleStore(state => state.setVehicle);
  const globalVehicle = useVehicleStore(state => state.vehicle);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVehicles = async () => {
    try {
      const res = await apiClient.get("/account/vehicles");
      const fetched = res.data.data || [];
      setVehicles(fetched);
      return fetched;
    } catch (error) {
      toast.error("Failed to load vehicles");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [toast]);

  const handleAddVehicle = () => {
    if (vehicles.length >= 5) {
      toast.error("You can only have up to 5 vehicles saved.");
      return;
    }
    setEditingVehicle(null);
    setIsDrawerOpen(true);
  };

  const handleEditVehicle = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setIsDrawerOpen(true);
  };

  const handleDeleteClick = (vehicle: any) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/account/vehicles/${vehicleToDelete.id}`);
      
      const newVehicles = vehicles.filter((v) => v.id !== vehicleToDelete.id);
      setVehicles(newVehicles);
      
      // If we deleted the global default vehicle, sync the store
      if (globalVehicle?.id === vehicleToDelete.id) {
        const newDefault = newVehicles.find(v => v.is_default);
        if (newDefault) {
          setGlobalVehicle({
            id: newDefault.id,
            year: newDefault.year.toString(),
            make: newDefault.make,
            model: newDefault.model,
            trim: newDefault.trim,
            nickname: newDefault.nickname,
          });
        } else {
          setGlobalVehicle(null);
        }
      }
      
      toast.success("Vehicle deleted successfully");
    } catch (error) {
      toast.error("Failed to delete vehicle");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  };

  const handleSetDefault = async (vehicleId: number) => {
    try {
      await apiClient.post(`/account/vehicles/${vehicleId}/default`);
      const newVehicles = vehicles.map((v) => ({
        ...v,
        is_default: v.id === vehicleId,
      }));
      setVehicles(newVehicles);
      
      const newDefault = newVehicles.find(v => v.id === vehicleId);
      if (newDefault) {
        setGlobalVehicle({
          id: newDefault.id,
          year: newDefault.year.toString(),
          make: newDefault.make,
          model: newDefault.model,
          trim: newDefault.trim,
          nickname: newDefault.nickname,
        });
      }
      
      toast.success("Default vehicle updated");
    } catch (error) {
      toast.error("Failed to update default vehicle");
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingVehicle) {
        await apiClient.patch(`/account/vehicles/${editingVehicle.id}`, data);
        toast.success("Vehicle updated successfully");
      } else {
        await apiClient.post("/account/vehicles", data);
        toast.success("Vehicle added successfully");
      }
      setIsDrawerOpen(false);
      const updatedVehicles = await fetchVehicles();
      const newDefault = updatedVehicles.find((v: any) => v.is_default);
      if (newDefault) {
        setGlobalVehicle({
          id: newDefault.id,
          year: newDefault.year.toString(),
          make: newDefault.make,
          model: newDefault.model,
          trim: newDefault.trim,
          nickname: newDefault.nickname,
        });
      }

    } catch (error: any) {
      toast.error(error?.response?.data?.message || (editingVehicle ? "Failed to update vehicle" : "Failed to add vehicle"));
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  const formatVIN = (vin?: string) => {
    if (!vin || vin.length < 17) return vin;
    return `•••• •••• •••• ${vin.slice(-4)}`;
  };

  return (
    <div>
      <AccountPageHeader
        title="My Vehicles"
        subtitle="Save your vehicles to instantly filter products that fit."
        actions={
          <Button 
            onClick={handleAddVehicle} 
            disabled={vehicles.length >= 5}
            title={vehicles.length >= 5 ? "Maximum of 5 vehicles reached" : ""}
          >
            Add Vehicle
          </Button>
        }
      />

      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          You have {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} saved (max 5)
        </p>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={<CarFront className="h-8 w-8" />}
          title="Your garage is empty"
          message="Add your first vehicle so we can show you parts that actually fit."
          actionLabel="Add your first vehicle"
          onAction={handleAddVehicle}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={cn(
                "group relative flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
                vehicle.is_default ? "border-primary/50 ring-1 ring-primary/20" : ""
              )}
            >
              {vehicle.is_default && (
                <div className="absolute right-4 top-4 flex items-center text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Default vehicle
                </div>
              )}
              
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  {/* Silhouette Placeholder */}
                  <CarFront className="h-8 w-8 opacity-50" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 pr-24">
                  {vehicle.nickname && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary truncate">
                      {vehicle.nickname}
                    </span>
                  )}
                  <h3 className="font-bold text-lg truncate">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {vehicle.trim && (
                    <span className="text-sm text-muted-foreground truncate">{vehicle.trim}</span>
                  )}
                </div>
              </div>
              
              <div className="mb-6 flex flex-col gap-2 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                {(vehicle.engine || vehicle.fuel_type || vehicle.transmission) ? (
                  <div className="flex justify-between border-b pb-2">
                    <span>Spec</span>
                    <span className="font-medium text-foreground text-right truncate pl-4">
                      {[vehicle.engine, vehicle.transmission, vehicle.drive_type].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                ) : null}
                {vehicle.vin && (
                  <div className="flex justify-between border-b pb-2 pt-2">
                    <span>VIN</span>
                    <span className="font-mono text-xs font-medium text-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {formatVIN(vehicle.vin)}
                    </span>
                  </div>
                )}
                {vehicle.license_plate && (
                  <div className="flex justify-between pt-2">
                    <span>Plate</span>
                    <span className="font-bold text-foreground">
                      {vehicle.license_plate}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center gap-2 pt-2 border-t">
                <Button
                  asChild
                  variant="primary"
                  className="flex-1"
                >
                  <Link href={`/shop?year=${vehicle.year}&make=${vehicle.make}&model=${vehicle.model}`}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Shop Parts
                  </Link>
                </Button>

                {!vehicle.is_default && (
                  <Button
                    variant="secondary"
                    className="px-3"
                    title="Set as Default"
                    onClick={() => handleSetDefault(vehicle.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="px-3"
                  title="Edit"
                  onClick={() => handleEditVehicle(vehicle)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  className="px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                  onClick={() => handleDeleteClick(vehicle)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SideDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
      >
        {isDrawerOpen && (
          <VehicleDrawer
            initialData={editingVehicle}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsDrawerOpen(false)}
          />
        )}
      </SideDrawer>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Vehicle"
        description={<>Are you sure you want to delete <strong>{vehicleToDelete?.nickname || `${vehicleToDelete?.year} ${vehicleToDelete?.make} ${vehicleToDelete?.model}`}</strong> from your garage?</>}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
}
