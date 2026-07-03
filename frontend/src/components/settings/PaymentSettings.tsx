import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { QrCode, CreditCard, Banknote, Upload, CheckCircle2 } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";

const API_ROOT = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const toStorageUrl = (path: string) => {
  if (!path || path.startsWith('http')) return path;
  const match = path.match(/\/uploads\/([^/]+)\/([^/]+)$/);
  return match ? `${API_ROOT}/storage/${match[1]}/${match[2]}` : path;
};

export const PaymentSettings = () => {
  const { data: methods, isLoading, refetch } = useApiQuery<any>(
    ['payment-settings'],
    '/payment-settings'
  );

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  const { mutate: updateSettings, isPending } = useApiMutation(
    (formData: FormData) => apiClient.post('/payment-settings', formData),
    "Payment settings updated!"
  );

  const getMethod = (key: string) => methods?.data?.methods?.find((m: any) => m.method_key === key);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    if (qrFile) formData.append('qr_image', qrFile);
    
    updateSettings(formData, { 
      onSuccess: () => {
        setQrFile(null);
        setQrPreview(null);
        refetch();
      } 
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const lankaQr = getMethod('lanka_qr');
  const bankTransfer = getMethod('bank_transfer');
  const cash = getMethod('cash');

  if (isLoading) return <div className="py-20 text-center text-slate-400 font-medium">Loading settings...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      <div className="border-b pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
          <p className="text-sm text-slate-500">Enable and configure how your customers can pay for appointments.</p>
        </div>
        <div className="flex items-center space-x-6 bg-indigo-50 border border-indigo-100 p-4 rounded-3xl">
          <div className="flex flex-col text-right">
            <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Upfront Payment</span>
            <span className="text-[10px] text-indigo-500 font-medium">Require proof on booking</span>
          </div>
          <div className="flex items-center gap-4">
              <input 
                type="checkbox" 
                name="require_payment_upfront" 
                key={`upfront_${methods?.data?.require_payment_upfront}`}
                defaultChecked={!!methods?.data?.require_payment_upfront}
                className="w-6 h-6 rounded-lg border-indigo-300 text-indigo-600 focus:ring-indigo-500" 
              />
              <div className="flex items-center gap-2 border-l border-indigo-200 pl-4">
                  <div className="w-24">
                      <Input 
                        type="number" 
                        name="upfront_amount" 
                        defaultValue={methods?.data?.upfront_amount || 0} 
                        className="h-9 text-xs" 
                      />
                  </div>
                  <Select 
                    name="upfront_type"
                    className="h-9 text-xs w-32"
                    defaultValue={methods?.data?.upfront_type || 'percentage'}
                    options={[
                        { label: "% (Percentage)", value: "percentage" },
                        { label: "LKR (Fixed)", value: "fixed" }
                    ]}
                  />
              </div>
          </div>
        </div>
      </div>

      {/* LankaQR Section */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg"><QrCode size={20} /></div>
            <div>
              <h4 className="font-bold text-slate-900">LankaQR Payment</h4>
              <p className="text-xs text-slate-500">Accept payments via banking apps</p>
            </div>
          </div>
          <input 
            key={`lanka_qr_${lankaQr?.is_enabled}`}
            type="checkbox" 
            name="lanka_qr_enabled" 
            defaultChecked={!!lankaQr?.is_enabled} 
            className="w-5 h-5 rounded border-slate-300 text-indigo-600" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer relative overflow-hidden group">
              {qrPreview || lankaQr?.qr_image ? (
                <img src={qrPreview || toStorageUrl(lankaQr.qr_image)} alt="LankaQR" className="mx-auto max-h-48 rounded-lg" />
              ) : (
                <div className="py-8">
                  <Upload className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-500">Click to upload LankaQR Image</p>
                </div>
              )}
              <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold uppercase pointer-events-none">Change Image</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Payment Instructions</label>
              <textarea 
                name="lanka_qr_instructions" 
                rows={4} 
                defaultValue={lankaQr?.instructions}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Scan the QR code and upload the screenshot below."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bank Transfer Section */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg"><CreditCard size={20} /></div>
            <div>
              <h4 className="font-bold text-slate-900">Bank Transfer</h4>
              <p className="text-xs text-slate-500">Direct deposit to your bank account</p>
            </div>
          </div>
          <input 
            key={`bank_transfer_${bankTransfer?.is_enabled}`}
            type="checkbox" 
            name="bank_transfer_enabled" 
            defaultChecked={!!bankTransfer?.is_enabled} 
            className="w-5 h-5 rounded border-slate-300 text-indigo-600" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Bank Name" name="bank_name" defaultValue={bankTransfer?.bank_name} placeholder="e.g. Bank of Ceylon" />
          <Input label="Account Number" name="account_number" defaultValue={bankTransfer?.account_number} placeholder="000123456789" />
          <Input label="Account Holder Name" name="account_name" defaultValue={bankTransfer?.account_name} placeholder="Salon Name" />
          <Input label="Branch" name="branch_name" defaultValue={bankTransfer?.branch_name} placeholder="e.g. Colombo Main" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button loading={isPending} className="shadow-lg">Save Payment Settings</Button>
      </div>
    </form>
  );
};
