import React from 'react';
import { Scissors, Clock, ChevronRight, Menu, X, Star, MapPin, Phone, Instagram, Facebook, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const ModernTheme = ({ 
  salon, selectedServices, toggleService, services, setIsModalOpen
}: any) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showAllServices, setShowAllServices] = React.useState(false);
  const btnRadius = salon.button_style === 'rounded' ? 'rounded-full' : 'rounded-md';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-slate-900 selection:text-white font-sans relative overflow-hidden" style={{ fontFamily: salon.font_family || 'sans-serif' }}>
      
      {/* Dynamic Background Mesh Gadients */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob" style={{ backgroundColor: salon.primary_color || '#94a3b8' }}></div>
        <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-10 animate-blob animation-delay-2000 bg-slate-400"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob animation-delay-4000" style={{ backgroundColor: salon.primary_color || '#94a3b8' }}></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=${salon.font_family?.replace(/ /g, '+')}:wght@400;500;700;900&display=swap');
        .modern-font { font-family: '${salon.font_family}', sans-serif; }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 15s infinite alternate ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.8); }
        .gradient-text { background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      `}} />
      
      {/* Sleek Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 glass-card px-6 h-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
             {salon.logo ? (
               <img src={salon.logo} className="w-12 h-12 object-contain rounded-2xl shadow-sm" alt={salon.name} />
             ) : (
               <div 
                className="w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: salon.primary_color || '#0f172a' }}
               >
                  <Scissors size={20} />
               </div>
             )}
             <span className="text-2xl font-black tracking-tighter">{salon.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-12">
            {['Home', 'Services', 'Contact'].map(item => (
              <a key={item} href={item === 'Home' ? '#' : `#${item.toLowerCase()}`} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] relative group">
                {item}
                <span className="absolute -bottom-2 left-0 w-0 h-0.5 rounded-full transition-all duration-300 group-hover:w-full" style={{ backgroundColor: salon.primary_color || '#0f172a' }}></span>
              </a>
            ))}

            <Button 
              onClick={() => setIsModalOpen(true)}
              className={cn("px-8 h-12 font-bold shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:scale-105 transition-all text-white border-none group relative overflow-hidden", btnRadius)}
              style={{ backgroundColor: salon.primary_color || '#0f172a' }}
            >
              <span className="relative z-10 flex items-center gap-2">Book Appointment <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
            </Button>
          </div>

          <button className="md:hidden p-2 bg-slate-100 rounded-full text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto pt-40 pb-20 px-6 modern-font relative z-10">
        {/* Apple-style Hero */}
        <header className="text-center mb-40 animate-in fade-in slide-in-from-bottom-12 duration-1000">
           <div className="inline-flex items-center gap-3 px-6 py-2.5 glass-card rounded-full text-[11px] font-black uppercase tracking-widest text-slate-600 mb-10 shadow-sm">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: salon.primary_color || '#0f172a' }}></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: salon.primary_color || '#0f172a' }}></span>
              </div>
              {salon.hero_tagline || `Top Rated Salon in ${salon.address?.split(',')[0] || 'Your Area'}`}
           </div>
           
           <h1 className="text-7xl md:text-[8rem] font-black tracking-tighter mb-8 leading-[0.9]">
              {salon.hero_title ? (
                <span className="gradient-text" style={{ backgroundImage: `linear-gradient(135deg, ${salon.primary_color || '#0f172a'} 0%, #94a3b8 100%)` }}>
                  {salon.hero_title}
                </span>
              ) : (
                <>
                  Redefining <br />
                  <span className="gradient-text" style={{ backgroundImage: `linear-gradient(135deg, ${salon.primary_color || '#0f172a'} 0%, #94a3b8 100%)` }}>
                    the Standard.
                  </span>
                </>
              )}
           </h1>
           
           <p className="text-slate-500 text-xl md:text-2xl max-w-2xl mx-auto mb-14 font-medium leading-relaxed">
             {salon.hero_subtitle || `Experience the pinnacle of hair artistry and wellness at ${salon.name}. Our expert stylists are dedicated to bringing your vision to life.`}
           </p>
           
           <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <Button 
                onClick={() => setIsModalOpen(true)}
                className={cn("h-16 px-12 text-white text-lg font-bold shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all border-none relative overflow-hidden group", btnRadius)}
                style={{ backgroundColor: salon.primary_color || '#0f172a' }}
             >
                <span className="relative z-10 flex items-center gap-2"><Sparkles size={18} /> Book Your Experience</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
             </Button>
             
             <a href="#services" className={cn("h-16 px-10 text-slate-900 text-lg font-bold flex items-center gap-2 border-2 border-slate-200 hover:border-slate-900 transition-colors bg-white/50 backdrop-blur-sm", btnRadius)}>
                View All Services
             </a>
           </div>
        </header>

        {/* Services Grid */}
        <section id="services" className="mb-40 pt-10">
           <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div className="max-w-xl">
                 <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter">Our Services.</h2>
                 <p className="text-slate-500 font-medium text-lg">Precision, care, and the finest products. Browse our curated selection of treatments designed to enhance your natural beauty.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      "p-10 rounded-[2.5rem] transition-all cursor-pointer group relative overflow-hidden z-10 glass-card hover:-translate-y-2",
                      isSelected ? "text-white shadow-2xl" : "hover:shadow-xl hover:bg-white/90"
                    )}
                    style={isSelected ? { backgroundColor: salon.primary_color || '#0f172a', borderColor: salon.primary_color || '#0f172a' } : {}}
                  >
                     {/* Decorative background accent on hover */}
                     {!isSelected && (
                       <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 -z-10" style={{ backgroundColor: salon.primary_color || '#94a3b8' }}></div>
                     )}
                     
                     <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-10 transition-transform duration-500 group-hover:scale-110", isSelected ? "bg-white/10" : "bg-slate-100/80")} style={isSelected ? {} : { color: salon.primary_color || '#0f172a' }}>
                        <Scissors size={28} />
                     </div>
                     
                     <h3 className="text-2xl font-bold mb-3 tracking-tight">{service.name}</h3>
                     
                     <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest mb-12" style={{ opacity: isSelected ? 0.8 : 0.4 }}>
                        <Clock size={14} /> {service.duration_minutes} Minutes
                     </div>
                     
                     <div className="flex items-center justify-between mt-auto">
                        <span className="text-3xl font-black" style={!isSelected ? { color: salon.primary_color || '#0f172a' } : {}}>
                           {Number(service.price) === 0 ? 'Free' : `${salon.currency} ${Number(service.price).toLocaleString()}`}
                        </span>
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:translate-x-2", isSelected ? "bg-white/20" : "bg-slate-100")}>
                           <ChevronRight size={20} style={isSelected ? { color: '#fff' } : { color: salon.primary_color || '#0f172a' }} />
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
                 className={cn("h-14 px-10 text-slate-900 text-sm font-bold flex items-center gap-2 border-2 border-slate-200 hover:border-slate-900 transition-colors bg-white/50 backdrop-blur-sm mx-auto", btnRadius)}
               >
                 {showAllServices ? 'Show Less' : `View All Services (${services.length})`}
                 <ChevronRight size={16} className={showAllServices ? 'rotate-90' : ''} />
               </button>
             </div>
           )}
        </section>

        {/* Info Grid */}
        <section id="contact" className="py-24 border-t border-slate-200/60">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto text-center md:text-left">
              <div className="space-y-6 flex flex-col items-center md:items-start">
                 <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center" style={{ color: salon.primary_color || '#0f172a' }}>
                    <MapPin size={28} />
                 </div>
                 <h4 className="text-2xl font-black tracking-tight">Visit Us.</h4>
                 <p className="text-slate-500 font-medium leading-relaxed">{salon.address}</p>
              </div>
              <div className="space-y-6 flex flex-col items-center md:items-start">
                 <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center" style={{ color: salon.primary_color || '#0f172a' }}>
                    <Phone size={28} />
                 </div>
                 <h4 className="text-2xl font-black tracking-tight">Call Us.</h4>
                 <p className="text-slate-500 font-medium leading-relaxed">{salon.phone}</p>
              </div>
              <div className="space-y-6 flex flex-col items-center md:items-start">
                 <div className="flex gap-4">
                    <a href={salon.social_instagram || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_instagram ? 'pointer-events-none opacity-40' : ''}>
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform" style={{ color: salon.primary_color || '#0f172a' }}>
                        <Instagram size={28} />
                      </div>
                    </a>
                    <a href={salon.social_facebook || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_facebook ? 'pointer-events-none opacity-40' : ''}>
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform" style={{ color: salon.primary_color || '#0f172a' }}>
                        <Facebook size={28} />
                      </div>
                    </a>
                 </div>
                 <h4 className="text-2xl font-black tracking-tight">Follow Us.</h4>
                 <p className="text-slate-500 font-medium leading-relaxed">Stay updated with our latest styles and offers.</p>
              </div>
           </div>
        </section>

        <footer className="text-center pt-20 pb-10 mt-20 border-t border-slate-200/60">
           <div className="flex items-center justify-center gap-2 mb-6">
              <Scissors size={20} className="text-slate-300" />
           </div>
           <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
             © {new Date().getFullYear()} {salon.name} Salon Group
           </p>
        </footer>
      </div>
    </div>
  );
};

export default ModernTheme;
