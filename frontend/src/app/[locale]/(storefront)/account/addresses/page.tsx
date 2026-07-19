"use client";

import { useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/account/EmptyState";
import { SideDrawer } from "@/components/account/SideDrawer";
import { AddressForm } from "@/components/account/AddressForm";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";
import { MapPin, MapPinOff, MoreVertical, Edit2, Trash2, CheckCircle2 } from "lucide-react";

export default function AddressesPage() {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await apiClient.get("/account/addresses");
      setAddresses(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [toast]);

  const handleAddAddress = () => {
    setEditingAddress(null);
    setIsDrawerOpen(true);
  };

  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setIsDrawerOpen(true);
  };

  const handleDeleteClick = (address: any) => {
    if (address.is_default && addresses.length > 1) {
      toast.error("Cannot delete the default address. Set another address as default first.");
      return;
    }
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/account/addresses/${addressToDelete.id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== addressToDelete.id));
      toast.success("Address deleted successfully");
    } catch (error) {
      toast.error("Failed to delete address");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await apiClient.post(`/account/addresses/${addressId}/default`);
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addressId,
        }))
      );
      toast.success("Default address updated");
    } catch (error) {
      toast.error("Failed to update default address");
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingAddress) {
        await apiClient.patch(`/account/addresses/${editingAddress.id}`, data);
        toast.success("Address updated successfully");
      } else {
        await apiClient.post("/account/addresses", data);
        toast.success("Address added successfully");
      }
      setIsDrawerOpen(false);
      fetchAddresses();
    } catch (error) {
      toast.error(editingAddress ? "Failed to update address" : "Failed to add address");
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div>
      <AccountPageHeader
        title="Delivery Addresses"
        subtitle="Manage your shipping and billing addresses."
        actions={
          <Button onClick={handleAddAddress}>
            Add Address
          </Button>
        }
      />

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPinOff className="h-8 w-8" />}
          title="No addresses yet"
          message="You haven't added any delivery addresses. Add one now to speed up checkout."
          actionLabel="Add your first address"
          onAction={handleAddAddress}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`group relative flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                address.is_default ? "border-primary/50 ring-1 ring-primary/20" : ""
              }`}
            >
              {address.is_default && (
                <div className="absolute right-4 top-4 flex items-center text-xs font-semibold text-primary">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Default
                </div>
              )}
              
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{address.name} <span className="text-muted-foreground font-normal text-sm">({address.label})</span></h3>
              </div>
              
              <div className="mb-4 flex flex-col gap-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{address.name}</span>
                <span>{address.building}{address.apartment ? `, Apt ${address.apartment}` : ""}</span>
                <span>{address.street}</span>
                <span>{address.area}, {address.emirate}</span>
                <span className="mt-1 font-medium">{address.phone}</span>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-4 border-t">
                {!address.is_default && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleSetDefault(address.id)}
                  >
                    Set as Default
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className={address.is_default ? "flex-1 text-xs" : "px-3"}
                  onClick={() => handleEditAddress(address)}
                >
                  <Edit2 className="h-3 w-3 sm:mr-1" />
                  <span className={!address.is_default ? "hidden sm:inline" : ""}>Edit</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeleteClick(address)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SideDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={editingAddress ? "Edit Address" : "Add Address"}
      >
        {isDrawerOpen && (
          <AddressForm
            initialData={editingAddress}
            defaultName={user?.name || ""}
            defaultPhone={""}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsDrawerOpen(false)}
          />
        )}
      </SideDrawer>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Address"
        description={<>Are you sure you want to delete <strong>{addressToDelete?.label}</strong>? This action cannot be undone.</>}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
}
