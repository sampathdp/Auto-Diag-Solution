import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useApiList, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { Tag, Pencil, Trash2, Plus } from "lucide-react";

const emptyForm = {
  code: "",
  discount_percent: "",
  duration_months: "",
  valid_from: "",
  valid_until: "",
  max_redemptions: "",
  is_active: true,
};

const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : "");

const PromoCodes = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data: promoCodes, isLoading } = useApiList(['admin', 'promo-codes'], async () => {
    const { data } = await apiClient.get('/admin/promo-codes');
    return data.data;
  });

  const { mutate: createPromo, isPending: isCreating } = useApiMutation(
    (data: any) => apiClient.post('/admin/promo-codes', data),
    "Promo code created successfully!",
    [['admin', 'promo-codes']]
  );

  const { mutate: updatePromo, isPending: isUpdating } = useApiMutation(
    (data: any) => apiClient.put(`/admin/promo-codes/${selectedId}`, data),
    "Promo code updated successfully!",
    [['admin', 'promo-codes']]
  );

  const { mutate: deletePromo } = useApiMutation(
    (id: number) => apiClient.delete(`/admin/promo-codes/${id}`),
    "Promo code deleted successfully!",
    [['admin', 'promo-codes']]
  );

  const handleAdd = () => {
    setIsEditMode(false);
    setSelectedId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleEdit = (promo: any) => {
    setIsEditMode(true);
    setSelectedId(promo.id);
    setFormData({
      code: promo.code,
      discount_percent: String(promo.discount_percent),
      duration_months: promo.duration_months ? String(promo.duration_months) : "",
      valid_from: toDateInput(promo.valid_from),
      valid_until: toDateInput(promo.valid_until),
      max_redemptions: promo.max_redemptions ? String(promo.max_redemptions) : "",
      is_active: !!Number(promo.is_active),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setSelectedId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedId) {
      deletePromo(selectedId);
      setIsConfirmOpen(false);
      setSelectedId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_percent: formData.discount_percent,
      duration_months: formData.duration_months || null,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      max_redemptions: formData.max_redemptions || null,
      is_active: formData.is_active,
    };

    if (isEditMode && selectedId) {
      updatePromo(payload, { onSuccess: () => setIsModalOpen(false) });
    } else {
      createPromo(payload, {
        onSuccess: () => {
          setIsModalOpen(false);
          setFormData(emptyForm);
        }
      });
    }
  };

  const columns = [
    {
      header: "Code",
      accessor: (item: any) => (
        <div className="flex items-center space-x-2">
          <Tag size={14} className="text-indigo-500" />
          <span className="font-mono font-bold text-slate-900 tracking-wide">{item.code}</span>
        </div>
      ),
    },
    {
      header: "Discount",
      accessor: (item: any) => (
        <span className="font-bold text-emerald-600">{Number(item.discount_percent)}% off</span>
      ),
    },
    {
      header: "Duration",
      accessor: (item: any) => (
        <span className="text-slate-700">
          {item.duration_months ? `First ${item.duration_months} month${item.duration_months > 1 ? "s" : ""}` : "Forever"}
        </span>
      ),
    },
    {
      header: "Valid Window",
      accessor: (item: any) => (
        <span className="text-xs text-slate-500">
          {item.valid_from ? new Date(item.valid_from).toLocaleDateString() : "Anytime"}
          {" → "}
          {item.valid_until ? new Date(item.valid_until).toLocaleDateString() : "No expiry"}
        </span>
      ),
    },
    {
      header: "Redemptions",
      accessor: (item: any) => (
        <span className="text-slate-700 font-semibold">
          {item.times_redeemed}{item.max_redemptions ? ` / ${item.max_redemptions}` : ""}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (item: any) => (
        <Badge variant={Number(item.is_active) ? "success" : "secondary"}>
          {Number(item.is_active) ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (item: any) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" title="Edit" onClick={() => handleEdit(item)}>
            <Pencil size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" title="Delete" onClick={() => handleDelete(item.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promo Codes"
        description="Create discount codes new signups can redeem at registration, e.g. 50% off for their first 6 months."
        action={
          <Button onClick={handleAdd}>
            <Plus size={18} className="mr-2" />
            New Promo Code
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={Array.isArray(promoCodes) ? promoCodes : []}
        isLoading={isLoading}
        emptyMessage="No promo codes yet. Create one to run a signup discount campaign."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Edit Promo Code" : "New Promo Code"}
        description="Set the discount percentage and how long it lasts. Leave the validity window or redemption cap blank for no limit."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Code"
              placeholder="WELCOME50"
              required
              disabled={isEditMode}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
            <Input
              label="Discount Percent (%)"
              type="number"
              min={1}
              max={100}
              step="0.01"
              placeholder="50"
              required
              value={formData.discount_percent}
              onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
            />
          </div>

          <Input
            label="Duration (months)"
            type="number"
            min={1}
            placeholder="Leave blank for the discount to apply forever"
            value={formData.duration_months}
            onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Valid From"
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
            />
            <Input
              label="Valid Until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            />
          </div>

          <Input
            label="Max Redemptions"
            type="number"
            min={1}
            placeholder="Leave blank for unlimited signups"
            value={formData.max_redemptions}
            onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
          />

          <label className="flex items-center space-x-2.5 text-sm text-slate-700 font-medium cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Active (redeemable by new signups)</span>
          </label>

          <div className="pt-4 flex space-x-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={isCreating || isUpdating}>
              {isEditMode ? "Save Changes" : "Create Promo Code"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Promo Code"
        description="This code will no longer be redeemable. Salons that already redeemed it keep their discount."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default PromoCodes;
