import React, { useState } from 'react';
import { 
  Scissors, User, Phone, Calendar, Clock, CreditCard, 
  Banknote, QrCode, Upload, CheckCircle2, ChevronRight, 
  ArrowLeft, Heart, Sparkles, Menu, X, Award, ShieldCheck,
  Droplets, Gem, Sparkle, MapPin, Instagram, Facebook
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const RoseTheme = ({ 
  salon, selectedServices, toggleService, services, setIsModalOpen
}: any) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const accentColor = salon.primary_color || '#E85078';
  const btnRadius = salon.button_style === 'rounded' ? 'rounded-full' : 'rounded-xl';

  // Helper for icons based on service name
  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('cut') || n.includes('hair')) return <Scissors size={24} />;
    if (n.includes('facial') || n.includes('skin')) return <Droplets size={24} />;
    if (n.includes('spa') || n.includes('massage')) return <Sparkles size={24} />;
    if (n.includes('nail')) return <Gem size={24} />;
    return <Sparkle size={24} />;
  };
 

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .rose-serif { font-family: 'Playfair Display', serif; }
        .rose-sans { font-family: 'Outfit', sans-serif; }
      `}} />

      <div className="rose-sans min-h-screen bg-[#FCFBF7] text-neutral-800 selection:bg-[#E85078]/10 selection:text-[#E85078]">
        
        {/* Playful & Clean Navbar */}
        <nav className="fixed top-0 left-0 w-full z-50 bg-[#FCFBF7]/90 backdrop-blur-md border-b border-neutral-100 px-6 h-20 transition-all duration-300">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              {salon.logo ? (
                <img src={salon.logo} className="w-10 h-10 object-contain rounded-xl" alt={salon.name} />
              ) : (
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: accentColor }}
                >
                  <Scissors size={20} />
                </div>
              )}
              <span className="text-xl font-black tracking-tight text-neutral-900 uppercase">{salon.name}</span>
            </div>

            <div className="hidden md:flex items-center gap-10">
              {['Home', 'Services'].map(item => (
                <a 
                  key={item} 
                  href={item === 'Home' ? '#' : `#${item.toLowerCase()}`} 
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-widest"
                >
                  {item}
                </a>
              ))}

              <Button 
                onClick={() => setIsModalOpen(true)}
                className={cn("px-8 h-12 font-black uppercase tracking-widest text-xs shadow-md hover:scale-105 transition-all text-white border-none", btnRadius)}
                style={{ backgroundColor: accentColor }}
              >
                Book Now
              </Button>
            </div>

            <button className="md:hidden text-neutral-700" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-white pt-24 px-6 flex flex-col gap-6 animate-in fade-in duration-300">
            {['Home', 'Services'].map(item => (
              <a 
                key={item} 
                href={item === 'Home' ? '#' : `#${item.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-black text-neutral-800 border-b border-neutral-100 pb-4"
              >
                {item}
              </a>
            ))}
            <Button 
              onClick={() => {
                setMobileMenuOpen(false);
                setIsModalOpen(true);
              }}
              className={cn("w-full h-14 font-bold uppercase tracking-widest text-white text-sm", btnRadius)}
              style={{ backgroundColor: accentColor }}
            >
              Book Now
            </Button>
          </div>
        )}

        <div className="max-w-7xl mx-auto pt-32 pb-20 px-6">
          
          {/* Editorial Two-Column Hero */}
          <header className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-32">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 animate-in slide-in-from-left duration-1000">
              <span className="inline-block text-xs font-black tracking-widest uppercase" style={{ color: accentColor }}>
                {salon.hero_tagline || 'Beauty. Simplified.'}
              </span>
              
              <h1 className="rose-serif text-5xl lg:text-7xl font-bold text-neutral-900 leading-[1.08] tracking-tight">
                {salon.hero_title || (
                  <>Enhance Your <br /> Natural Beauty</>
                )}
              </h1>
              
              <p className="text-neutral-500 text-lg leading-relaxed max-w-xl">
                {salon.hero_subtitle || `Premium beauty services tailored just for you. Discover the ultimate relaxation and style at ${salon.name}. Professional care and beautiful results every single time.`}
              </p>
              
              <div className="pt-4">
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className={cn("h-16 px-10 text-white text-base font-black shadow-lg hover:scale-105 transition-all border-none", btnRadius)}
                  style={{ backgroundColor: accentColor }}
                >
                  Book Appointment
                </Button>
              </div>

              {/* High-End Feature Row */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 pt-10 border-t border-neutral-100">
                {[
                  { icon: <User size={18} />, label: 'Expert Team' },
                  { icon: <Award size={18} />, label: 'Premium Products' },
                  { icon: <ShieldCheck size={18} />, label: 'Hygiene Focused' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-neutral-600 font-bold text-xs">
                    <div style={{ color: accentColor }}>{item.icon}</div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Asset Column with Soft Decor */}
            <div className="lg:col-span-5 relative group hidden lg:block animate-in slide-in-from-right duration-1000">
              {/* Soft decorative background element */}
              <div className="absolute -inset-4 bg-[#E85078]/5 rounded-full blur-3xl opacity-60 pointer-events-none" />
              
              <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/40">
                <img 
                  src={salon.cover_image || "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=1000"} 
                  className="w-full h-full object-cover" 
                  alt="Luxury Salon Experience"
                />
              </div>
            </div>
          </header>

          {/* Services Section */}
          <section id="services" className="mb-32 pt-20 border-t border-neutral-100/60">
            <div className="text-center mb-16 space-y-4">
              <h2 className="rose-serif text-4xl lg:text-5xl font-bold text-neutral-900">Our Services</h2>
              <div className="w-16 h-1 rounded-full mx-auto" style={{ backgroundColor: accentColor }} />
            </div>

            {/* Clean Rounded Service Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {(showAllServices ? services : services?.slice(0, 6))?.map((service: any) => {
                const isSelected = selectedServices.find((s: any) => s.id === service.id);
                return (
                  <div 
                    key={service.id}
                    onClick={() => {
                      toggleService(service);
                      setIsModalOpen(true);
                    }}
                    className={cn(
                      "p-8 rounded-[2rem] bg-white border border-neutral-100 transition-all duration-300 cursor-pointer group hover:shadow-xl flex flex-col justify-between h-[280px]",
                      isSelected ? "ring-2 ring-offset-2" : ""
                    )}
                    style={isSelected ? { ringColor: accentColor, borderColor: accentColor } as any : {}}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                        >
                          {getServiceIcon(service.name)}
                        </div>
                        <Heart 
                          className={cn("transition-colors", isSelected ? "fill-rose-500 text-rose-500" : "text-neutral-200 group-hover:text-rose-300")} 
                          size={22} 
                        />
                      </div>
                      
                      <h3 className="text-xl font-bold text-neutral-900 group-hover:text-rose-600 transition-colors mb-1">{service.name}</h3>
                      <p className="text-neutral-400 text-xs font-semibold uppercase tracking-widest">{service.duration_minutes} MINS</p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-neutral-50">
                      <span className="text-2xl font-black text-neutral-900">
                        {Number(service.price) === 0 ? 'Free' : `${salon.currency} ${Number(service.price).toLocaleString()}`}
                      </span>
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-neutral-50 text-neutral-400 group-hover:text-white"
                        style={{ '--hover-bg': accentColor } as any}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleService(service);
                          setIsModalOpen(true);
                        }}
                      >
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {services?.length > 6 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowAllServices(!showAllServices)}
                  className={cn("h-12 px-8 font-black uppercase tracking-widest text-xs border-2 transition-all hover:scale-105 mx-auto flex items-center gap-2", btnRadius)}
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  {showAllServices ? 'Show Less' : `View All Services (${services.length})`}
                  <ChevronRight size={14} className={showAllServices ? 'rotate-90' : ''} />
                </button>
              </div>
            )}

          </section>

          {/* Contact & Info Section */}
          <section id="contact" className="mb-20 pt-20 border-t border-neutral-100/60">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-4">
                   <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-transform hover:scale-105" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                      <MapPin size={28} />
                   </div>
                   <h4 className="text-2xl rose-serif font-bold text-neutral-900">Visit Us</h4>
                   <p className="text-neutral-500 font-medium max-w-[250px] leading-relaxed">{salon.address}</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                   <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-transform hover:scale-105" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                      <Phone size={28} />
                   </div>
                   <h4 className="text-2xl rose-serif font-bold text-neutral-900">Call Us</h4>
                   <p className="text-neutral-500 font-medium leading-relaxed">{salon.phone}</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                   <div className="flex gap-4 mb-2">
                      <a href={salon.social_instagram || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_instagram ? 'pointer-events-none opacity-40' : ''}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                          <Instagram size={28} />
                        </div>
                      </a>
                      <a href={salon.social_facebook || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_facebook ? 'pointer-events-none opacity-40' : ''}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                          <Facebook size={28} />
                        </div>
                      </a>
                   </div>
                   <h4 className="text-2xl rose-serif font-bold text-neutral-900">Follow Us</h4>
                   <p className="text-neutral-500 font-medium max-w-[250px] leading-relaxed">Stay updated with our latest styles and offers.</p>
                </div>
             </div>
          </section>

          {/* Simple Premium Footer */}
          <footer className="text-center pt-16 border-t border-neutral-100">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.4em]">
              Love your hair with {salon.name} • {salon.address}
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default RoseTheme;
