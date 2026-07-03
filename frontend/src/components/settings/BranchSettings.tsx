import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone, Clock, Plus, Edit, Store, X, Save, ShieldAlert } from "lucide-react";
import apiClient from "@/api/client";
import { toast } from "react-hot-toast";
import { useSettings } from "@/hooks/useSettings";

interface Branch {
  id: number;
  name: string;
  phone: string;
  address: string;
  opening_time: string;
  closing_time: string;
  is_active: number;
}

export const BranchSettings = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("18:00");
  const [isActive, setIsActive] = useState(1);

  // Fetch active subscription for limit checks
  const { list: listSettings } = useSettings();
  const { data: settingsData } = listSettings();

  const activePlan = settingsData?.plan_name || "Starter";
  const planLimits = settingsData?.plan_limits || {};
  const isTrialActive = settingsData?.sub_status === "trial" && (!settingsData?.expires_at || new Date(settingsData.expires_at.includes(' ') ? settingsData.expires_at.replace(' ', 'T') : settingsData.expires_at) >= new Date());
  const maxBranchesLimit = isTrialActive
    ? 9999
    : (activePlan.toLowerCase() === "starter" 
       ? 0 
       : (activePlan.toLowerCase() === "professional" ? 3 : 9999));

  // Fetch branches
  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await apiClient.get("/branches");
      return res.data.data || [];
    },
  });

  const activeBranchesCount = branches.filter((b) => Number(b.is_active) === 1).length;

  // Add/Edit mutations
  const createMutation = useMutation({
    mutationFn: async (newBranch: any) => {
      return apiClient.post("/branches", newBranch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("New branch location added successfully!");
      closeModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Failed to add branch. Please try again.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updated: any) => {
      return apiClient.put(`/branches/${updated.id}`, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch location updated successfully!");
      closeModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Failed to update branch.";
      toast.error(msg);
    },
  });

  const openAddModal = () => {
    setEditingBranch(null);
    setName("");
    setPhone("");
    setAddress("");
    setOpeningTime("09:00");
    setClosingTime("18:00");
    setIsActive(1);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setPhone(branch.phone || "");
    setAddress(branch.address || "");
    // Extract times to HH:MM format
    setOpeningTime(branch.opening_time.substring(0, 5));
    setClosingTime(branch.closing_time.substring(0, 5));
    setIsActive(Number(branch.is_active) as 0 | 1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Branch name is required.");
      return;
    }

    const payload = {
      name,
      phone,
      address,
      opening_time: openingTime + ":00",
      closing_time: closingTime + ":00",
      is_active: isActive,
    };

    if (editingBranch) {
      updateMutation.mutate({ ...payload, id: editingBranch.id });
    } else {
      if (activeBranchesCount >= maxBranchesLimit) {
        toast.error(`Your plan limit allows only ${maxBranchesLimit} active branch(es). Please upgrade your subscription plan!`);
        return;
      }
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white">Branch Locations</h3>
          <p className="text-sm font-semibold text-slate-400 max-w-lg">
            Manage your salon network. Add locations, assign operational hours, and expand your salon brand presence!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Plan Info Badge */}
          <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <ShieldAlert size={16} className="text-indigo-400" />
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider leading-none">Subscription Limit</p>
              <p className="text-xs font-black text-slate-300 mt-1 uppercase">
                {activePlan}: {activeBranchesCount} / {maxBranchesLimit === 9999 ? "Unlimited" : `${maxBranchesLimit} Branch(es)`}
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            disabled={activeBranchesCount >= maxBranchesLimit}
            className={`flex items-center justify-center gap-2 font-extrabold px-6 py-3 rounded-2xl transition-all ${
              activeBranchesCount >= maxBranchesLimit
                ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 cursor-pointer"
            }`}
          >
            <Plus size={16} className="stroke-[3]" />
            Add Location
          </button>
        </div>
      </div>

      {/* Grid of Locations */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-4 bg-slate-900/40 rounded-[2.5rem] border border-slate-800">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Loading branch network...</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="py-24 text-center max-w-md mx-auto flex flex-col items-center justify-center gap-4 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-indigo-500 mb-2 border border-slate-100">
            <Store size={26} />
          </div>
          <h4 className="text-lg font-black text-slate-800">No Branches Added</h4>
          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
            You currently have no branch locations configured. Create your first location to unlock location-specific bookings and scheduling!
          </p>
          <button
            onClick={openAddModal}
            disabled={activeBranchesCount >= maxBranchesLimit}
            className={`mt-2 font-extrabold px-6 py-2.5 rounded-xl shadow-md transition-all ${
              activeBranchesCount >= maxBranchesLimit
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            }`}
          >
            Add First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div 
              key={branch.id} 
              className={`p-6 rounded-[2.2rem] border transition-all duration-300 relative overflow-hidden flex flex-col justify-between group ${
                branch.is_active === 1
                  ? "bg-white border-slate-200/80 shadow-md hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1"
                  : "bg-slate-50/50 border-slate-200/40 opacity-75 hover:opacity-100 hover:border-slate-300"
              }`}
            >
              {/* Blur Accent */}
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <Store size={20} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base leading-snug tracking-tight group-hover:text-indigo-900 transition-colors">
                        {branch.name}
                      </h4>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full mt-1.5 border transition-all ${
                        branch.is_active === 1
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${branch.is_active === 1 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {branch.is_active === 1 ? "Active Location" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(branch)}
                    className="p-2.5 text-slate-500 hover:text-white bg-slate-50 hover:bg-indigo-600 border border-slate-200/60 rounded-xl transition-all duration-300 shadow-sm hover:shadow-indigo-600/20 cursor-pointer"
                  >
                    <Edit size={14} className="stroke-[2.5]" />
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="flex items-start gap-3 text-xs font-semibold text-slate-600">
                    <MapPin size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{branch.address || "No address added"}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                    <Phone size={16} className="text-indigo-500 shrink-0" />
                    <span>{branch.phone || "No contact number"}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl w-fit">
                    <Clock size={16} className="text-indigo-500 shrink-0" />
                    <span>
                      {branch.opening_time.substring(0, 5)} - {branch.closing_time.substring(0, 5)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-lg z-10 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                {editingBranch ? "Edit Location" : "Add Branch Location"}
              </h3>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Glamour Studio - Kandy Branch"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Contact Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Physical Address</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Temple Road, Kandy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 resize-none"
                  />
                </div>

                {/* Opening Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Opening Time</label>
                    <input
                      type="time"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Closing Time</label>
                    <input
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                    />
                  </div>
                </div>

                {/* Status Toggle if Editing */}
                {editingBranch && (
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Branch Status</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Toggle whether this location is active and open for bookings</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsActive(isActive === 1 ? 0 : 1)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        isActive === 1 ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isActive === 1 ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 rounded-2xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Save size={16} />
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
