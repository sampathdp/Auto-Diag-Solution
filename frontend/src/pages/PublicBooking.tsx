import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ModernTheme from "@/themes/modern";
import ElegantTheme from "@/themes/elegant";
import RoseTheme from "@/themes/rose";
import DarkTheme from "@/themes/dark";
import SpaTheme from "@/themes/spa";
import BookingModal from "@/components/booking/BookingModal";
import SEO from "@/components/SEO";

const PublicBooking = () => {
  const { slug } = useParams();
  const [step, setStep] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [bookingData, setBookingData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    start_time: "",
    notes: "",
    staff_id: "",
    branch_id: ""
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedMethod, setSelectedMethod] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const totalAmount = selectedServices.reduce((acc, s: any) => acc + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((acc, s: any) => acc + Number(s.duration_minutes), 0);

  const { data, isLoading, error } = useApiQuery<any>(
    [`public-salon`, slug],
    `/public/salons/${slug}`
  );

  const { mutate: book, isPending: isBooking, isSuccess: isBooked } = useApiMutation(
    (payload: any) => apiClient.post(`/public/salons/${slug}/book`, payload),
    "Appointment requested!"
  );

  useEffect(() => {
    const phoneClean = bookingData.phone.replace(/[^0-9]/g, '');
    if (phoneClean.length === 10) {
        apiClient.get(`/public/salons/${slug}/lookup`, { params: { phone: phoneClean } })
        .then(res => {
            if (res.data.data) {
                const customer = res.data.data;
                setBookingData(prev => ({
                    ...prev,
                    first_name: customer.first_name || prev.first_name,
                    last_name: customer.last_name || prev.last_name,
                    email: customer.email || prev.email
                }));
            }
        });
    }
  }, [bookingData.phone, slug]);

  useEffect(() => {
    if (selectedDate && totalDuration > 0) {
        setIsLoadingSlots(true);
        apiClient.get(`/public/salons/${slug}/availability`, {
            params: {
                date: selectedDate,
                duration: totalDuration,
                staff_id: bookingData.staff_id
            }
        })
        .then(res => {
            setAvailableSlots(res.data.data || []);
        })
        .finally(() => setIsLoadingSlots(false));
    }
  }, [selectedDate, totalDuration, bookingData.staff_id, slug]);

  useEffect(() => {
    if (data?.data) {
      if (data.data.payment_methods) {
        const firstMethod = data.data.payment_methods.find((m: any) => m.is_enabled);
        if (firstMethod) {
          setSelectedMethod(firstMethod.method_key);
        } else if (!data.data.require_payment_upfront) {
          setSelectedMethod('cash');
        }
      }

      if (Array.isArray(data.data.branches) && data.data.branches.length === 1) {
        setBookingData(prev => ({ ...prev, branch_id: String(data.data.branches[0].id) }));
      }
    }
  }, [data]);

  const handleSlotSelect = (slot: any) => {
    setBookingData({...bookingData, start_time: `${selectedDate} ${slot.time}`});
    setErrors(prev => ({...prev, start_time: ""}));
  };

  const toggleService = (service: any) => {
    setSelectedServices(prev => {
        const exists = prev.find((s: any) => s.id === service.id);
        if (exists) {
            return prev.filter(s => s.id !== service.id);
        }
        return [...prev, service];
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!bookingData.first_name) newErrors.first_name = "Required";
    if (!bookingData.last_name) newErrors.last_name = "Required";
    if (!bookingData.start_time) newErrors.start_time = "Please pick a time";
    
    if (data?.data?.branches && data.data.branches.length > 1 && !bookingData.branch_id) {
        newErrors.branch_id = "Please select a branch location";
    }

    const phoneClean = bookingData.phone.replace(/[^0-9]/g, '');
    if (phoneClean.length !== 10) {
        newErrors.phone = "Enter a valid 10-digit number";
    }

    if (bookingData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email)) {
        newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBook = () => {
    if (!validate()) {
      setStep(2); 
      return;
    }

    const formData = new FormData();
    formData.append('first_name', bookingData.first_name);
    formData.append('last_name', bookingData.last_name);
    formData.append('email', bookingData.email || '');
    formData.append('phone', bookingData.phone);
    formData.append('start_time', bookingData.start_time);
    
    selectedServices.forEach((s: any) => {
      formData.append('service_ids[]', s.id);
    });

    formData.append('staff_id', bookingData.staff_id || '');
    formData.append('branch_id', bookingData.branch_id || '');
    formData.append('method', selectedMethod);

    if (proofFile) {
      formData.append('proof_image', proofFile);
    }

    book(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">Loading Salon...</div>;
  if (error || !data) return <div className="h-screen flex items-center justify-center font-bold text-rose-500">Salon not found or unavailable.</div>;

  const { salon, services, staff, branches, payment_methods, require_payment_upfront, upfront_type, upfront_amount, theme } = data.data;

  const requiredUpfront = require_payment_upfront 
    ? (upfront_type === 'percentage' ? (totalAmount * (upfront_amount / 100)) : upfront_amount)
    : 0;

  // Generate LocalBusiness Schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "name": salon.name,
    "image": "https://salonflow.cloud/og-image.jpg",
    "description": salon.description || `Book your appointment at ${salon.name} via SalonFlow.`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": salon.address || "Sri Lanka",
      "addressCountry": "LK"
    },
    "telephone": salon.phone,
    "url": `https://salonflow.cloud/book/${slug}`
  };

  const seoTitle = `${salon.name} | Book Appointment`;
  const seoDesc = salon.description || `Book your appointment at ${salon.name} instantly. Powered by SalonFlow.`;

  if (isBooked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl shadow-slate-200 border border-slate-100 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Booking Requested!</h2>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            Thank you, <span className="text-slate-900 font-bold">{bookingData.first_name}</span>. We've received your request for <span className="text-slate-900 font-bold">{salon.name}</span>.
            {selectedMethod !== 'cash' ? " Our team will verify your payment proof and confirm your slot shortly." : " We'll reach out via phone to confirm your appointment time."}
          </p>
          <Button className="w-full h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold transition-all shadow-xl" onClick={() => window.location.reload()}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const themeProps = {
    salon, step, setStep, bookingData, setBookingData, selectedServices, 
    toggleService, totalAmount, totalDuration, selectedDate, setSelectedDate,
    availableSlots, isLoadingSlots, handleSlotSelect, handleBook, isBooking,
    errors, validate, staff, branches, payment_methods, require_payment_upfront, 
    requiredUpfront, selectedMethod, setSelectedMethod, proofPreview, 
    handleFileChange, proofFile, upfront_type, upfront_amount, services,
    isModalOpen, setIsModalOpen
  };

  return (
    <>
      <SEO 
        title={seoTitle}
        description={seoDesc}
        url={`https://salonflow.cloud/book/${slug}`}
        name={salon.name}
        schema={schema}
      />
      <BookingModal {...themeProps} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {(() => {
        switch (theme) {
          case 'elegant': return <ElegantTheme {...themeProps} />;
          case 'rose': return <RoseTheme {...themeProps} />;
          case 'dark': return <DarkTheme {...themeProps} />;
          case 'spa': return <SpaTheme {...themeProps} />;
          default: return <ModernTheme {...themeProps} />;
        }
      })()}
    </>
  );
};

export default PublicBooking;
