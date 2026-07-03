import React, { useState } from 'react';
import { 
  Scissors, User, Phone, Calendar, Clock, CreditCard, 
  Banknote, QrCode, Upload, CheckCircle2, ChevronRight, 
  ArrowLeft, Search, Star, Award, ShieldCheck, Gem,
  Menu, X, Sparkles, Droplets, Heart, Camera,
  MapPin, Instagram, Facebook
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const ElegantTheme = ({ 
  salon, selectedServices, toggleService, services, setIsModalOpen
}: any) => {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);

  // Helper for icons based on service name
  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('cut') || n.includes('hair')) return <Scissors size={32} />;
    if (n.includes('color')) return <Palette size={32} />;
    if (n.includes('makeup') || n.includes('bridal')) return <Heart size={32} />;
    if (n.includes('facial') || n.includes('skin')) return <Droplets size={32} />;
    if (n.includes('nail')) return <Award size={32} />;
    if (n.includes('spa') || n.includes('massage')) return <Sparkles size={32} />;
    return <Gem size={32} />;
  };

  const primary = salon.primary_color || '#d4af37';
  const btnRadius = salon.button_style === 'rounded' ? 'rounded-full' : 'rounded-md';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=${salon.font_family?.replace(/ /g, '+')}:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
        .custom-font { font-family: '${salon.font_family}', sans-serif; }
        .metallic-text {
          background: linear-gradient(135deg, #fff 0%, ${primary} 50%, #fff 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shine 5s linear infinite;
        }
        @keyframes shine {
          to { background-position: 200% center; }
        }
        .luxury-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .luxury-glow {
          box-shadow: 0 0 40px ${primary}30;
        }
      `}} />

      <div className="custom-font min-h-screen bg-zinc-950 text-white selection:bg-[#d4af37]/30 relative overflow-hidden">
        
        {/* Dynamic Abstract Lighting */}
        <div className="absolute top-0 left-0 w-full h-screen overflow-hidden -z-10 pointer-events-none">
           <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-20" style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}></div>
           <div className="absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[150px] opacity-10" style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}></div>
        </div>

        {/* Header */}
        <header className="fixed top-0 left-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {salon.logo ? (
                <img src={salon.logo} className="w-12 h-12 object-contain rounded-lg shadow-2xl" alt={salon.name} />
              ) : (
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-black shadow-lg luxury-glow"
                  style={{ backgroundColor: primary }}
                >
                  <Gem size={24} />
                </div>
              )}
              <h1 className="text-2xl font-black tracking-widest uppercase italic metallic-text">{salon.name}</h1>
            </div>

            <nav className="hidden md:flex items-center gap-12">
              {['Home', 'Services', 'Contact'].map((link) => (
                <a 
                  key={link} 
                  href={`#${link.toLowerCase()}`} 
                  className="text-xs font-black uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors relative group"
                >
                  {link}
                  <span className="absolute -bottom-2 left-0 w-0 h-[1px] transition-all duration-500 group-hover:w-full" style={{ backgroundColor: primary }}></span>
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setIsModalOpen(true)}
                className={cn("hidden md:flex text-black font-black uppercase tracking-[0.2em] text-xs px-10 h-14 transition-all hover:scale-105", btnRadius)}
                style={{ backgroundColor: primary, boxShadow: `0 10px 30px -10px ${primary}` }}
              >
                Book Experience
              </Button>
              <button className="md:hidden text-white/80 hover:text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-24 pb-20">
          {/* Faint Background Logo/Text */}
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15vw] font-black text-white/[0.02] select-none pointer-events-none whitespace-nowrap leading-none tracking-tighter">
            {salon.name?.toUpperCase()}
          </div>

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-150">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                  <Sparkles size={14} style={{ color: primary }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">{salon.hero_tagline || 'Premium Studio'}</span>
                </div>
                <h2 className="text-6xl md:text-[5.5rem] italic tracking-tighter leading-[0.9] font-serif">
                  {salon.hero_title ? (
                    <span className="metallic-text">{salon.hero_title}</span>
                  ) : (
                    <>Luxury & <br /><span className="metallic-text">Perfection.</span></>
                  )}
                </h2>
              </div>
              <p className="text-white/60 text-xl max-w-lg leading-relaxed font-light">
                {salon.hero_subtitle || `Elevate your beauty routine. Discover the ultimate relaxation and bespoke styling at ${salon.name}.`}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 pt-4">
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className={cn("text-black font-black uppercase tracking-[0.2em] text-xs px-12 h-16 transition-all hover:scale-105", btnRadius)}
                  style={{ backgroundColor: primary, boxShadow: `0 15px 40px -10px ${primary}` }}
                >
                  Reserve Appointment
                </Button>
                <a 
                  href="#services"
                  className={cn("flex items-center justify-center font-black uppercase tracking-[0.2em] text-xs px-10 h-16 border border-white/20 hover:border-white/50 transition-colors bg-transparent", btnRadius)}
                >
                  Explore Services
                </a>
              </div>

              <div className="flex flex-wrap gap-x-12 gap-y-6 pt-10 border-t border-white/10">
                {[
                  { icon: <Award />, label: 'Master Stylists' },
                  { icon: <ShieldCheck />, label: 'Premium Brands' },
                  { icon: <Heart />, label: 'Bespoke Care' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/5 border border-white/10" style={{ color: primary }}>{item.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group perspective-1000 hidden lg:block animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <div className="absolute -inset-4 blur-[60px] rounded-full opacity-20 group-hover:opacity-40 transition-all duration-1000" style={{ backgroundColor: primary }} />
              <div className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-md transform transition-all duration-1000 group-hover:scale-[1.03] luxury-card p-2">
                <div className="w-full h-full rounded-t-full rounded-b-sm overflow-hidden relative">
                  <img 
                    src={salon.cover_image || "/luxury_salon_hero.png"} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    alt="Luxury Salon Experience"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-32 relative border-t border-white/5">
          {/* Subtle bg glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] blur-[150px] opacity-[0.03] pointer-events-none" style={{ backgroundColor: primary }} />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-24 space-y-6">
               <h3 className="text-5xl md:text-6xl italic font-serif metallic-text inline-block">Curated Services</h3>
               <div className="w-24 h-[2px] mx-auto opacity-50" style={{ backgroundColor: primary }} />
               <p className="text-white/50 max-w-2xl mx-auto text-lg font-light">Experience our comprehensive menu of premium treatments, performed by industry-leading professionals.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                      "group relative luxury-card p-10 flex flex-col transition-all duration-700 cursor-pointer overflow-hidden",
                      isSelected 
                        ? "scale-[1.02] border-transparent" 
                        : "hover:border-white/20 hover:bg-white/[0.02] hover:-translate-y-2"
                    )}
                   >
                      {/* Selection Background */}
                      <div className={cn(
                        "absolute inset-0 transition-opacity duration-700 z-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )} style={{ background: `linear-gradient(135deg, ${primary}90 0%, ${primary}30 100%)` }} />

                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-12">
                          <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 border",
                            isSelected ? "bg-black/20 border-black/10 text-black" : "bg-white/5 border-white/10"
                          )} style={!isSelected ? { color: primary } : {}}>
                            {getServiceIcon(service.name)}
                          </div>
                          
                          {isSelected && (
                            <div className="text-black animate-in zoom-in spin-in-12 duration-500 bg-white/20 p-2 rounded-full backdrop-blur-md">
                              <CheckCircle2 size={24} />
                            </div>
                          )}
                        </div>

                        <h4 className={cn("text-2xl font-black mb-3 tracking-wide", isSelected ? "text-black" : "text-white")}>
                          {service.name}
                        </h4>

                        <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-10", isSelected ? "text-black/70" : "text-white/40")}>
                          <Clock size={14} /> {service.duration_minutes} Mins
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-8 border-t" style={{ borderColor: isSelected ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)' }}>
                          <span className={cn("text-3xl font-serif italic font-bold", isSelected ? "text-black" : "")} style={!isSelected ? { color: primary } : {}}>
                             {Number(service.price) === 0 ? 'Free' : `${salon.currency} ${Number(service.price).toLocaleString()}`}
                          </span>
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:translate-x-2 border", isSelected ? "bg-black text-white border-black" : "bg-white/5 text-white/50 border-white/10 group-hover:text-white")}>
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      </div>
                   </div>
                 );
               })}
            </div>

            {services?.length > 6 && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setShowAllServices(!showAllServices)}
                  className="h-14 px-10 text-sm font-black uppercase tracking-widest border transition-all hover:scale-105 mx-auto flex items-center gap-2 rounded-full"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                >
                  {showAllServices ? 'Show Less' : `View Full Collection (${services.length})`}
                  <ChevronRight size={16} className={showAllServices ? 'rotate-90' : ''} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Info/Contact Section */}
        <section id="contact" className="py-24 border-t border-white/5 relative z-10">
           <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div className="space-y-6 flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10" style={{ color: primary }}>
                    <MapPin size={24} />
                 </div>
                 <h4 className="text-xl font-serif italic tracking-wide">Visit Us</h4>
                 <p className="text-white/50 font-light max-w-[200px] leading-relaxed">{salon.address}</p>
              </div>
              <div className="space-y-6 flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10" style={{ color: primary }}>
                    <Phone size={24} />
                 </div>
                 <h4 className="text-xl font-serif italic tracking-wide">Contact Us</h4>
                 <p className="text-white/50 font-light leading-relaxed">{salon.phone}</p>
              </div>
              <div className="space-y-6 flex flex-col items-center">
                 <div className="flex gap-4">
                    <a href={salon.social_instagram || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_instagram ? 'pointer-events-none opacity-40' : ''}>
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors" style={{ color: primary }}>
                        <Instagram size={24} />
                      </div>
                    </a>
                    <a href={salon.social_facebook || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_facebook ? 'pointer-events-none opacity-40' : ''}>
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors" style={{ color: primary }}>
                        <Facebook size={24} />
                      </div>
                    </a>
                 </div>
                 <h4 className="text-xl font-serif italic tracking-wide">Follow Us</h4>
                 <p className="text-white/50 font-light leading-relaxed max-w-[200px]">Stay updated with our latest styles and offers.</p>
              </div>
           </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/5 bg-black relative z-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
               <Gem size={18} style={{ color: primary }} />
               <span className="text-sm font-black uppercase tracking-widest text-white/50">{salon.name}</span>
            </div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} All Rights Reserved
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

const Palette = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.688-1.688h1.954c3.14 0 5.688-2.548 5.688-5.688 0-4.754-4.595-8.688-10.125-8.688z"/>
  </svg>
);

export default ElegantTheme;
