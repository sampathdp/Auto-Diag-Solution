import React from "react";
import { format } from "date-fns";
import { Receipt, Scissors, Phone, MapPin, Globe } from "lucide-react";

interface PrintInvoiceProps {
  invoice: any;
  salon: any;
}

export const PrintInvoice = React.forwardRef<HTMLDivElement, PrintInvoiceProps>(
  ({ invoice, salon }, ref) => {
    if (!invoice) return null;

    const totalPaid = invoice.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    const balance = Number(invoice.total) - totalPaid;

    return (
      <div ref={ref} className="p-12 bg-white text-slate-900 font-sans max-w-[800px] mx-auto print:p-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white print:bg-black">
                <Scissors size={24} />
              </div>
              <h1 className="text-2xl font-black tracking-tight">{salon?.name || "The Salon"}</h1>
            </div>
            <div className="space-y-1 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{salon?.address || "123 Salon Street, City"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} />
                <span>{salon?.phone || "+94 123 456 789"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} />
                <span>www.thesalon.com</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">Invoice</h2>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-900">{invoice.invoice_number}</p>
              <p className="text-xs font-bold text-slate-400">{format(new Date(invoice.created_at), "PPP")}</p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bill To</h3>
            <p className="text-lg font-black text-slate-900">{invoice.customer_name}</p>
            <p className="text-sm font-medium text-slate-500">{invoice.customer_phone}</p>
          </div>
          <div className="text-right">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Status</h3>
            <div className="inline-block px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
              {invoice.payment_status}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-12">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
              <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</th>
              <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items?.map((item: any) => (
              <tr key={item.id}>
                <td className="py-5 font-bold text-slate-900">{item.item_name}</td>
                <td className="py-5 text-center font-bold text-slate-700">{item.quantity}</td>
                <td className="py-5 text-right font-bold text-slate-700">LKR {Number(item.unit_price).toLocaleString()}</td>
                <td className="py-5 text-right font-black text-slate-900">LKR {Number(item.total_price).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Subtotal</span>
              <span className="font-bold text-slate-900">LKR {Number(invoice.total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Discount</span>
              <span className="font-bold text-slate-900">LKR 0</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-black text-slate-900 uppercase tracking-widest text-xs">Total Amount</span>
              <span className="text-xl font-black text-indigo-600">LKR {Number(invoice.total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-emerald-600 pt-2">
              <span className="font-bold uppercase tracking-widest text-[10px]">Amount Paid</span>
              <span className="font-black">LKR {totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-4 px-4 bg-slate-900 rounded-2xl text-white mt-4">
              <span className="font-black uppercase tracking-widest text-[10px]">Balance Due</span>
              <span className="text-lg font-black">LKR {balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-slate-100 text-center">
          <p className="text-sm font-bold text-slate-900 mb-2">Thank you for choosing {salon?.name}!</p>
          <p className="text-xs font-medium text-slate-400">Please keep this invoice for your records. For any queries, contact our support team.</p>
          
          <div className="mt-12 flex items-center justify-center gap-2 opacity-20">
            <Receipt size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Software by SalonSync</span>
          </div>
        </div>
      </div>
    );
  }
);
