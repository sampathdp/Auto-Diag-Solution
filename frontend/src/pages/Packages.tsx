import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useApiList, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { Check, Edit2, Shield, Zap, Crown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const Packages = () => {
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const { data: plans, isLoading } = useApiList(['admin', 'packages'], async () => {
    const { data } = await apiClient.get('/admin/packages');
    return data.data;
  });

  const displayPlans = Array.isArray(plans) ? plans.filter((plan: any) => plan.name.toLowerCase() !== 'free') : [];

  const featuresList = [
    "Staff Count", 
    "Appointments", 
    "Calendar & Scheduling",
    "Online Booking", 
    "POS Billing", 
    "Inventory Management", 
    "Customer History",
    "Sales Reports",
    "Staff Reports",
    "Multi-Branch",
    "SMS Gateway Integration",
    "Email Notifications (with Calendar Invites)"
  ];

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free': return <Zap className="text-slate-400" size={24} />;
      case 'starter': return <Zap className="text-amber-500" size={24} />;
      case 'professional': return <Shield className="text-indigo-500" size={24} />;
      case 'enterprise': return <Crown className="text-purple-500" size={24} />;
      default: return null;
    }
  };

  const { mutate: updatePlan, isPending: isUpdating } = useApiMutation(
    (data: any) => apiClient.put(`/admin/packages/${data.id}`, data),
    "Package updated successfully!",
    [['admin', 'packages']]
  );

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedFeatures: any = {};
    
    featuresList.forEach(f => {
      updatedFeatures[f] = formData.get(`feature_${f}`);
    });

    const allowedThemes = Array.from(formData.getAll('allowed_themes'));

    updatePlan({
      id: editingPlan.id,
      display_name: formData.get('display_name'),
      monthly_price: formData.get('monthly_price'),
      yearly_price: formData.get('yearly_price'),
      features: updatedFeatures,
      allowed_themes: allowedThemes
    }, {
      onSuccess: () => setEditingPlan(null)
    });
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Subscription Packages" 
        description="Define and manage feature limits and pricing for each subscription tier."
      />

      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white">Feature Comparison Table</h2>
          <p className="text-slate-400 text-sm mt-1">Manage what each plan offers and its pricing.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/30">
                <th className="p-6 text-slate-400 font-bold uppercase text-xs tracking-wider">Feature</th>
                {displayPlans.map((plan: any) => (
                  <th key={plan.id} className="p-6 min-w-[200px]">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        {getPlanIcon(plan.name)}
                        <span className="text-white font-bold text-lg">{plan.display_name}</span>
                      </div>
                      <div className="text-indigo-400 font-mono text-lg">
                        LKR {Number(plan.monthly_price).toLocaleString()}<span className="text-xs text-slate-500 font-sans ml-1">/mo</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {featuresList.map((feature) => (
                <tr key={feature} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-6 text-slate-300 font-medium">{feature}</td>
                  {displayPlans.map((plan: any) => {
                    const value = plan.features[feature] || "NO";
                    const isYes = value === "YES";
                    const isNo = value === "NO";
                    
                    return (
                      <td key={plan.id} className="p-6">
                        {isYes ? (
                          <span className="text-emerald-400 font-bold flex items-center">
                            <Check size={16} className="mr-2" /> YES
                          </span>
                        ) : isNo ? (
                          <span className="text-rose-500 font-bold">NO</span>
                        ) : (
                          <span className="text-indigo-300 font-semibold">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="hover:bg-slate-900/40 transition-colors border-t border-slate-800">
                <td className="p-6 text-slate-300 font-bold">Allowed Themes</td>
                {displayPlans.map((plan: any) => {
                  const themes = plan.allowed_themes || [];
                  return (
                    <td key={plan.id} className="p-6">
                      <div className="flex flex-wrap gap-1.5">
                        {themes.length === 0 ? (
                          <span className="text-slate-500 text-xs font-semibold">None</span>
                        ) : (
                          themes.map((t: string) => {
                            const nameMap: any = {
                              modern: 'Minimal',
                              elegant: 'Elegant',
                              rose: 'Rose',
                              spa: 'Spa',
                              dark: 'Dark'
                            };
                            return (
                              <span key={t} className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                                {nameMap[t] || t}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-slate-900/20">
                <td className="p-6"></td>
                {displayPlans.map((plan: any) => (
                  <td key={plan.id} className="p-6">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                      onClick={() => setEditingPlan(plan)}
                    >
                      <Edit2 size={14} className="mr-2" /> Edit Plan
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title={`Edit ${editingPlan?.display_name} Plan`}
        description="Update the pricing and features for this subscription tier."
      >
        <form onSubmit={handleSave} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Display Name</label>
              <input 
                name="display_name"
                type="text" 
                defaultValue={editingPlan?.display_name}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Monthly Price (LKR)</label>
              <input 
                name="monthly_price"
                type="number" 
                step="0.01"
                defaultValue={editingPlan?.monthly_price}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
            <h4 className="text-sm font-bold text-slate-900">Feature Limits</h4>
            <div className="grid grid-cols-2 gap-4">
              {featuresList.map((feature) => (
                <div key={feature} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{feature}</label>
                  <input 
                    name={`feature_${feature}`}
                    type="text" 
                    defaultValue={editingPlan?.features[feature]}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>


          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Allowed Themes</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'modern', label: 'Minimal (Modern)' },
                { id: 'elegant', label: 'Elegant' },
                { id: 'rose', label: 'Feminine (Rose)' },
                { id: 'spa', label: 'Wellness (Spa)' },
                { id: 'dark', label: 'Dark Mode' }
              ].map(theme => {
                const isChecked = editingPlan?.allowed_themes?.includes(theme.id);
                return (
                  <label key={theme.id} className="flex items-center space-x-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="allowed_themes" 
                      value={theme.id}
                      defaultChecked={isChecked}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{theme.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <input type="hidden" name="yearly_price" defaultValue={editingPlan?.yearly_price} />

          <div className="pt-4 flex space-x-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setEditingPlan(null)}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={isUpdating}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Packages;
