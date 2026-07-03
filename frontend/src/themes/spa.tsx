import React from 'react';
import { Scissors, Clock, ChevronRight, Menu, X, Star, Leaf, Droplets, Wind, Instagram, Facebook } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const SpaTheme = ({ 
  salon, selectedServices, toggleService, services, setIsModalOpen
}: any) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showAllServices, setShowAllServices] = React.useState(false);
  const accentColor = salon.primary_color || '#10b981';
  const btnRadius = salon.button_style === 'rounded' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2D3436] selection:bg-[#E8F3E8] font-sans" style={{ fontFamily: salon.font_family || 'sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=${salon.font_family?.replace(/ /g, '+')}:wght@400;500;700;900&display=swap');
        .spa-font { font-family: '${salon.font_family}', sans-serif; }
      `}} />
      
      {/* Organic Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#FDFCF8]/80 backdrop-blur-xl border-b border-emerald-900/5 px-6 h-20">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
             {salon.logo ? (
               <img src={salon.logo} className="w-10 h-10 object-contain rounded-full shadow-lg" alt={salon.name} />
             ) : (
               <div className="p-2 bg-white rounded-full shadow-lg">
                  <Droplets className="text-emerald-600" size={24} />
               </div>
             )}
             <span className="text-xl font-black tracking-tight text-[#1B4D3E] uppercase">{salon.name}</span>
          </div>


          <div className="hidden md:flex items-center gap-10">
            {['Home', 'Services'].map(item => (
              <a key={item} href={item === 'Home' ? '#' : `#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900/40 hover:text-emerald-900 transition-colors">{item}</a>
            ))}

            <Button 
              onClick={() => setIsModalOpen(true)}
              className={cn("px-8 h-12 font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-white border-none", btnRadius)}
              style={{ backgroundColor: salon.primary_color || '#10b981' }}
            >
              Book Ritual
            </Button>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto pt-32 pb-20 px-6 spa-font">
        {/* Organic Hero */}
        <header className="text-center mb-32 animate-in fade-in slide-in-from-top-12 duration-1000 relative">
           <Leaf size={120} className="absolute -top-12 -left-12 text-emerald-900/5 rotate-45" />
           <div className="inline-flex items-center gap-3 mb-8">
             <div className="w-12 h-[1px] bg-emerald-900/10" />
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-900/30">{salon.hero_tagline || 'Find Your Balance'}</span>
             <div className="w-12 h-[1px] bg-emerald-900/10" />
           </div>
           <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.85] text-[#1B4D3E] uppercase">
              {salon.hero_title ? salon.hero_title : (
                <>Heal Your <br /><span className="text-emerald-900/10">Soul.</span></>
              )}
           </h1>
           <p className="text-emerald-900/40 text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
             {salon.hero_subtitle || `Escape the noise and rediscover yourself at ${salon.name}. A sanctuary dedicated to holistic beauty and inner peace.`}
           </p>
           <Button 
              onClick={() => setIsModalOpen(true)}
              className={cn("h-20 px-16 text-white text-lg font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all border-none", btnRadius)}
              style={{ backgroundColor: salon.primary_color || '#10b981', boxShadow: `0 20px 40px ${salon.primary_color}40` }}
           >
              Begin Your Journey
           </Button>
        </header>

        {/* Healing Rituals Grid */}
        <section id="services" className="mb-32 pt-24 border-t border-emerald-900/5">
           <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8 text-center md:text-left">
              <div className="max-w-xl">
                 <h2 className="text-4xl font-black text-[#1B4D3E] mb-4 tracking-tight uppercase">Healing Rituals.</h2>
                 <p className="text-emerald-900/40 font-medium italic">Ancient wisdom meets modern luxury. Choose your path to rejuvenation.</p>
              </div>
              <Wind className="text-emerald-900/5 animate-spin-slow" size={64} />
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
                      "p-10 rounded-[3.5rem] border transition-all cursor-pointer group hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden",
                      isSelected ? "bg-white shadow-2xl shadow-emerald-900/10 border-transparent ring-2" : "bg-white/40 border-emerald-900/5 hover:bg-white"
                    )}
                    style={isSelected ? { '--tw-ring-color': salon.primary_color || '#10b981' } as any : {}}
                  >
                     <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-10 transition-all shadow-sm bg-white", isSelected ? "text-white" : "text-emerald-300 group-hover:scale-110")}>
                        <Droplets size={28} style={isSelected ? { color: salon.primary_color || '#10b981' } : {}} />
                     </div>
                     <h3 className="text-2xl font-black text-[#1B4D3E] mb-2 tracking-tight uppercase">{service.name}</h3>
                     <p className="text-emerald-900/20 text-[10px] font-black uppercase tracking-widest mb-10">{service.duration_minutes} MINS OF TRANQUILITY</p>
                     
                     <div className="flex items-center justify-between">
                        <span className="text-3xl font-black text-[#1B4D3E]">
                           {Number(service.price) === 0 ? 'Free' : `${salon.currency}${Number(service.price).toLocaleString()}`}
                        </span>
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all bg-emerald-50 text-emerald-400 group-hover:bg-emerald-900 group-hover:text-white")}>
                           <ChevronRight size={24} />
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
                 className={cn("h-14 px-10 text-sm font-black uppercase tracking-widest border-2 transition-all hover:scale-105 mx-auto flex items-center gap-2", btnRadius)}
                 style={{ borderColor: accentColor, color: accentColor }}
               >
                 {showAllServices ? 'Show Less' : `Explore All Treatments (${services.length})`}
                 <ChevronRight size={16} className={showAllServices ? 'rotate-90' : ''} />
               </button>
             </div>
           )}
        </section>

        {/* Footer Spa */}
        <footer className="py-24 border-t border-emerald-900/5 flex flex-col items-center gap-12">
           <div className="flex gap-12">
              <a href={salon.social_instagram || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_instagram ? 'pointer-events-none opacity-30' : ''}>
                <Instagram className="text-emerald-900/60 hover:text-emerald-900 transition-colors" size={32} />
              </a>
              <a href={salon.social_facebook || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_facebook ? 'pointer-events-none opacity-30' : ''}>
                <Facebook className="text-emerald-900/60 hover:text-emerald-900 transition-colors" size={32} />
              </a>
           </div>
           <div className="text-center space-y-4">
              <p className="text-[10px] font-black text-emerald-900/20 uppercase tracking-[0.5em]">© {new Date().getFullYear()} {salon.name} Wellness Group</p>
              <p className="text-xs font-medium text-emerald-900/30">{salon.address} • {salon.phone}</p>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default SpaTheme;
