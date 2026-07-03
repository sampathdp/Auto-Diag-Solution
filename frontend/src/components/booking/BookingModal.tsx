import React, { useState } from 'react';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const toStorageUrl = (path: string) => {
  if (!path || path.startsWith('http')) return path;
  const match = path.match(/\/uploads\/([^/]+)\/([^/]+)$/);
  return match ? `${API_ROOT}/storage/${match[1]}/${match[2]}` : path;
};
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Scissors, User, Phone, Calendar, Clock, CreditCard,
  Banknote, QrCode, ArrowLeft, CheckCircle2, Heart,
  Sparkles, Droplets, Award, Gem, Search
} from 'lucide-react';

const BookingModal = ({ 
  isOpen, onClose, salon, step, setStep, bookingData, setBookingData, 
  selectedServices, toggleService, totalAmount, totalDuration, 
  selectedDate, setSelectedDate, availableSlots, isLoadingSlots, 
  handleSlotSelect, handleBook, isBooking, errors, services, staff, branches,
  payment_methods, selectedMethod, setSelectedMethod, proofPreview,
  handleFileChange, proofFile, require_payment_upfront, requiredUpfront, upfront_type, upfront_amount
}: any) => {

  const [serviceSearch, setServiceSearch] = useState('');

  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('cut') || n.includes('hair')) return <Scissors size={20} />;
    if (n.includes('color')) return <Sparkles size={20} />;
    if (n.includes('makeup') || n.includes('bridal')) return <Heart size={20} />;
    if (n.includes('facial') || n.includes('skin')) return <Droplets size={20} />;
    if (n.includes('nail')) return <Award size={20} />;
    if (n.includes('spa') || n.includes('massage')) return <Gem size={20} />;
    return <Scissors size={20} />;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={step === 1 ? "Select Services & Schedule" : step === 2 ? "Your Details" : "Payment"}
      size="lg"
    >
      <div className="custom-font" style={{ fontFamily: salon.font_family || 'sans-serif' }}>
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, (require_payment_upfront ? 3 : null)].filter(Boolean).map((s: any) => (
            <div 
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                step === s ? "w-12" : "w-4 bg-slate-100"
              )}
              style={step === s ? { backgroundColor: salon.primary_color } : {}}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': salon.primary_color } as any}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services?.filter((s: any) => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map((service: any) => {
                const isSelected = selectedServices.find((s: any) => s.id === service.id);
                return (
                  <div 
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4",
                      isSelected ? "border-transparent shadow-md" : "border-slate-50 hover:border-slate-100 bg-slate-50/50"
                    )}
                    style={isSelected ? { backgroundColor: `${salon.primary_color}15`, borderColor: salon.primary_color } : {}}
                  >
                    <div 
                      className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isSelected ? "text-white" : "bg-white text-slate-400")}
                      style={isSelected ? { backgroundColor: salon.primary_color } : {}}
                    >
                      {getServiceIcon(service.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">{service.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {Number(service.price) === 0 ? <span className="text-emerald-500">Free</span> : `${salon.currency} ${Number(service.price).toLocaleString()}`}
                        {' • '}{service.duration_minutes}m
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 size={16} style={{ color: salon.primary_color }} />}
                  </div>
                );
              })}
              {services?.filter((s: any) => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                <div className="col-span-2 py-10 text-center text-slate-400 text-sm">
                  No services match "<span className="font-semibold">{serviceSearch}</span>"
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-6">
               {branches && branches.length > 1 && (
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Branch Location</label>
                     <select 
                        className={cn(
                           "w-full bg-slate-50 border-none rounded-xl h-12 px-4 text-sm font-bold focus:ring-2 transition-all outline-none",
                           errors?.branch_id ? "ring-2 ring-red-500" : ""
                        )}
                        style={{ '--tw-ring-color': salon.primary_color } as any}
                        value={bookingData.branch_id || ''}
                        onChange={(e) => setBookingData({...bookingData, branch_id: e.target.value})}
                     >
                        <option value="">Choose Branch Location...</option>
                        {branches.map((b: any) => (
                           <option key={b.id} value={b.id}>{b.name} - {b.address}</option>
                        ))}
                     </select>
                     {errors?.branch_id && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.branch_id}</p>}
                  </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Stylist</label>
                     <select 
                        className="w-full bg-slate-50 border-none rounded-xl h-12 px-4 text-sm font-bold focus:ring-2 transition-all outline-none"
                        style={{ '--tw-ring-color': salon.primary_color } as any}
                        value={bookingData.staff_id || ''}
                        onChange={(e) => setBookingData({...bookingData, staff_id: e.target.value})}
                     >
                        <option value="">Any Stylist</option>
                        {staff?.map((s: any) => (
                           <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                     <input 
                        type="date"
                        className="w-full bg-slate-50 border-none rounded-xl h-12 px-4 text-sm font-bold focus:ring-2 transition-all outline-none"
                        style={{ '--tw-ring-color': salon.primary_color } as any}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                     />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Available Time Slots</label>
                  {isLoadingSlots ? (
                     <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                           <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                        ))}
                     </div>
                  ) : availableSlots.length === 0 ? (
                     <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-bold border border-slate-100">
                        {selectedServices.length === 0 
                           ? "Please select at least one service above to view slots." 
                           : "No slots available for this date. Try another date or stylist."}
                     </div>
                  ) : (
                     <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                        {availableSlots.map((slot: any) => {
                           const isSelected = bookingData.start_time === `${selectedDate} ${slot.time}`;
                           return (
                              <button
                                 key={slot.time}
                                 type="button"
                                 disabled={!slot.is_available}
                                 onClick={() => handleSlotSelect(slot)}
                                 className={cn(
                                    "h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                                    isSelected 
                                       ? "text-white border-transparent shadow-md" 
                                       : slot.is_available
                                          ? "bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-700"
                                          : "bg-slate-50/50 border-transparent text-slate-300 cursor-not-allowed opacity-50"
                                 )}
                                 style={isSelected ? { backgroundColor: salon.primary_color } : {}}
                              >
                                 {slot.label}
                              </button>
                           );
                        })}
                     </div>
                  )}
                  {errors?.start_time && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.start_time}</p>}
               </div>

               <Button 
                disabled={selectedServices.length === 0 || !bookingData.start_time || (branches && branches.length > 0 && !bookingData.branch_id)}
                onClick={() => setStep(2)}
                className="w-full h-14 rounded-2xl text-white font-bold"
                style={{ backgroundColor: salon.primary_color }}
               >
                 Continue to Details
               </Button>
            </div>

          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</label>
                  <input 
                    className={cn(
                      "w-full bg-slate-50 border-none rounded-xl h-12 px-4 text-sm font-bold focus:ring-2 transition-all outline-none",
                      errors?.phone ? "ring-2 ring-red-500" : ""
                    )}
                    style={{ '--tw-ring-color': salon.primary_color } as any}
                    value={bookingData.phone}
                    onChange={e => setBookingData({...bookingData, phone: e.target.value.replace(/[^0-9]/g, '').slice(0,10)})}
                  />
                  {errors?.phone && <p className="text-[10px] text-red-500 font-bold">{errors.phone}</p>}
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address (Optional)</label>
                  <input 
                    type="email"
                    className={cn(
                      "w-full bg-slate-50 border-none rounded-xl h-12 px-4 text-sm font-bold focus:ring-2 transition-all outline-none",
                      errors?.email ? "ring-2 ring-red-500" : ""
                    )}
                    style={{ '--tw-ring-color': salon.primary_color } as any}
                    value={bookingData.email}
                    onChange={e => setBookingData({...bookingData, email: e.target.value})}
                  />
                  {errors?.email && <p className="text-[10px] text-red-500 font-bold">{errors.email}</p>}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">First Name</label>
                  <input 
                    className={cn(
                      "w-full bg-slate-50 border-none rounded-xl h-12 px-4 text-sm font-bold focus:ring-2 transition-all outline-none",
                      errors?.first_name ? "ring-2 ring-red-500" : ""
                    )}
                    style={{ '--tw-ring-color': salon.primary_color } as any}
                    value={bookingData.first_name}
                    onChange={e => setBookingData({...bookingData, first_name: e.target.value})}
                  />
                  {errors?.first_name && <p className="text-[10px] text-red-500 font-bold">{errors.first_name}</p>}
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Name</label>
                  <input 
                    className={cn(
                      "w-full bg-slate-50 border-none rounded-xl h-12 px-4 text-sm font-bold focus:ring-2 transition-all outline-none",
                      errors?.last_name ? "ring-2 ring-red-500" : ""
                    )}
                    style={{ '--tw-ring-color': salon.primary_color } as any}
                    value={bookingData.last_name}
                    onChange={e => setBookingData({...bookingData, last_name: e.target.value})}
                  />
                  {errors?.last_name && <p className="text-[10px] text-red-500 font-bold">{errors.last_name}</p>}
               </div>
            </div>


            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes (Optional)</label>
               <textarea 
                 className="w-full bg-slate-50 border-none rounded-xl h-24 p-4 text-sm font-bold focus:ring-2 transition-all outline-none resize-none"
                 style={{ '--tw-ring-color': salon.primary_color } as any}
                 value={bookingData.notes}
                 onChange={e => setBookingData({...bookingData, notes: e.target.value})}
               />
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-3">
               <Button variant="secondary" onClick={() => setStep(1)} className="h-14 rounded-2xl px-8"><ArrowLeft size={20} /></Button>
               <Button 
                onClick={() => require_payment_upfront ? setStep(3) : handleBook()}
                loading={isBooking}
                className="flex-1 h-14 rounded-2xl text-white font-bold"
                style={{ backgroundColor: salon.primary_color }}
               >
                 {require_payment_upfront ? "Continue to Payment" : "Confirm Booking"}
               </Button>
            </div>
          </div>
        )}


        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Upfront</p>
                   <p className="text-2xl font-black text-slate-900">{salon.currency} {requiredUpfront.toLocaleString()}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                   <p className="text-sm font-bold text-slate-500">{salon.currency} {totalAmount.toLocaleString()}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-3">
                {['cash', 'lanka_qr', 'bank_transfer'].map(method => {
                  const isSelected = selectedMethod === method;
                  return (
                    <div 
                      key={method}
                      onClick={() => setSelectedMethod(method)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center",
                        isSelected ? "border-transparent shadow-md" : "border-slate-50 hover:border-slate-100 bg-slate-50/50"
                      )}
                      style={isSelected ? { backgroundColor: `${salon.primary_color}15`, borderColor: salon.primary_color } : {}}
                    >
                      <div className="flex items-center gap-4">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isSelected ? "text-white" : "bg-white text-slate-400")} style={isSelected ? { backgroundColor: salon.primary_color } : {}}>
                            {method === 'cash' ? <Banknote size={20} /> : method === 'lanka_qr' ? <QrCode size={20} /> : <CreditCard size={20} />}
                         </div>
                         <span className="font-bold text-slate-900 text-sm uppercase tracking-widest">{method.replace('_', ' ')}</span>
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: salon.primary_color }} />}
                    </div>
                  )
                })}
             </div>

             {selectedMethod === 'lanka_qr' && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scan to Pay</p>
                   <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mx-auto">
                      {(() => {
                         const method = payment_methods?.find((m: any) => m.method_key === 'lanka_qr');
                         if (method?.qr_image) {
                            return <img src={toStorageUrl(method.qr_image)} className="w-40 h-40 object-contain rounded-lg" alt="Lanka QR" />;
                         }
                         return <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SalonPayment" className="w-40 h-40 object-contain rounded-lg" alt="Placeholder QR" />;
                      })()}
                   </div>
                   
                   <div className="pt-2">
                      {proofPreview && (
                         <div className="mb-3">
                            <img src={proofPreview} className="max-h-24 mx-auto rounded-lg shadow-sm border border-slate-100" alt="Proof Preview" />
                         </div>
                      )}
                      <div className="relative">
                         <Button className="w-full bg-white border border-slate-100 text-slate-600 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            {proofFile ? "Change Proof" : "Upload Proof"}
                         </Button>
                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                      </div>
                   </div>
                </div>
             )}

             {selectedMethod === 'bank_transfer' && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Bank Transfer Details</p>
                   {(() => {
                      const method = payment_methods?.find((m: any) => m.method_key === 'bank_transfer');
                      if (method) {
                         return (
                            <div className="bg-white p-4 rounded-xl shadow-sm text-xs font-bold text-slate-700 space-y-2">
                               <div className="flex justify-between border-b pb-1">
                                  <span className="text-slate-400">Bank</span>
                                  <span>{method.bank_name || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between border-b pb-1">
                                  <span className="text-slate-400">Branch</span>
                                  <span>{method.branch_name || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between border-b pb-1">
                                  <span className="text-slate-400">Account Name</span>
                                  <span>{method.account_name || 'N/A'}</span>
                                </div>
                               <div className="flex justify-between">
                                  <span className="text-slate-400">Account Number</span>
                                  <span className="text-indigo-600 font-extrabold">{method.account_number || 'N/A'}</span>
                               </div>
                            </div>
                         );
                      }
                      return <p className="text-xs text-slate-400 text-center italic">Bank details not configured.</p>;
                   })()}

                   <div className="pt-2">
                      {proofPreview && (
                         <div className="mb-3">
                            <img src={proofPreview} className="max-h-24 mx-auto rounded-lg shadow-sm border border-slate-100" alt="Proof Preview" />
                         </div>
                      )}
                      <div className="relative">
                         <Button className="w-full bg-white border border-slate-100 text-slate-600 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            {proofFile ? "Change Proof" : "Upload Proof"}
                         </Button>
                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                      </div>
                   </div>
                </div>
             )}

             <div className="pt-6 border-t border-slate-100 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} className="h-14 rounded-2xl px-8"><ArrowLeft size={20} /></Button>
                <Button 
                  onClick={handleBook}
                  loading={isBooking}
                  className="flex-1 h-14 rounded-2xl text-white font-bold"
                  style={{ backgroundColor: salon.primary_color }}
                >
                  Confirm Appointment
                </Button>
             </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BookingModal;
