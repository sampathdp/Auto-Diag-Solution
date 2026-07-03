import React, { useState } from 'react';
import {
  Scissors, User, Phone, Calendar, Clock, CreditCard,
  Banknote, QrCode, Upload, CheckCircle2, ChevronRight,
  ArrowLeft, Heart, Sparkles, Menu, X, Award, ShieldCheck,
  Droplets, Gem, Sparkle, MapPin, Instagram, Facebook, Search
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const DarkTheme = ({ 
  salon, selectedServices, toggleService, services, setIsModalOpen
}: any) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const gold = salon.primary_color || '#bba574';
  const btnRadius = salon.button_style === 'rounded' ? 'rounded-full' : 'rounded-lg';

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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
        .serif-font { font-family: 'Playfair Display', serif; }
        .sans-font { font-family: 'Jost', sans-serif; }
      `}} />

      <div className="sans-font min-h-screen bg-[#0d0d0d] text-white selection:bg-[#bba574]/30 selection:text-white relative">
        
        {/* Full Screen Hero Section */}
        <div className="relative min-h-screen flex items-center">
          {/* Background Image on Left */}
          <div className="absolute top-0 left-0 w-full md:w-[65%] h-full z-0">
            <img 
              src={salon.cover_image || "/hair_weaves_model.png"} 
              alt="Model"
              className="w-full h-full object-cover object-top md:object-center"
            />
            {/* Seamless Gradient Fade to Black */}
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-[#0d0d0d]/50 to-[#0d0d0d]" />
            <div className="absolute inset-0 bg-[#0d0d0d]/30 md:hidden" />
          </div>

          {/* Abstract background shapes on the right (faint) */}
          <div className="absolute top-0 right-0 w-full md:w-1/2 h-full overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[100px]" />
             <div className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] bg-[#bba574]/[0.02] rounded-full blur-[120px]" />
             {/* Diagonal subtle lines */}
             <div className="absolute top-0 right-[-20%] w-[150%] h-[150%] rotate-[-15deg] bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />
          </div>

          {/* Top Navbar overlay */}
          <nav className="absolute top-0 left-0 w-full z-50 p-6 md:p-10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {salon.logo ? (
                <img src={salon.logo} className="w-12 h-12 object-contain" alt={salon.name} />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center text-white">
                  <Scissors size={28} />
                </div>
              )}
              <div className="flex flex-col">
                <span className="serif-font text-2xl font-bold tracking-widest text-white uppercase">{salon.name}</span>
                <span className="text-[10px] uppercase tracking-[0.3em] opacity-70" style={{ color: gold }}>Hair & Beauty</span>
              </div>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 text-sm uppercase tracking-widest text-white/70 hover:text-white transition-colors"
              style={{ color: gold }}
            >
              Menu
            </button>
          </nav>

          {/* Mobile Menu Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-[60] bg-[#0d0d0d]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-300">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-10 right-10 text-white hover:text-[#bba574] transition-colors"
              >
                <X size={32} />
              </button>
              {['Home', 'Services', 'Contact'].map(item => (
                <a 
                  key={item} 
                  href={item === 'Home' ? '#' : `#${item.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="serif-font text-4xl text-white hover:text-[#bba574] transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          )}

          {/* Hero Content (Right aligned) */}
          <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex justify-end">
            <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col items-start space-y-6 pt-32 md:pt-0">
              <span className="text-sm tracking-wide" style={{ color: gold }}>
                {salon.hero_tagline || 'Premium Salon Experience'}
              </span>
              
              <h2 className="serif-font text-3xl md:text-4xl text-white/90">
                {salon.name} | Luxury Care
              </h2>
              
              <h1 className="serif-font text-6xl md:text-7xl lg:text-[5.5rem] font-bold text-white leading-[1.1] tracking-tight">
                {salon.hero_title ? salon.hero_title : (<>Crafting<br />Elegance</>)}
              </h1>
              
              <span className="text-sm tracking-[0.2em] uppercase pt-4" style={{ color: gold }}>
                Book Your Signature Look
              </span>
              
              <div className="pt-8">
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className={cn("px-12 h-14 text-[#0d0d0d] text-sm font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity border-none shadow-[0_0_30px_rgba(187,165,116,0.15)]", btnRadius)}
                  style={{ backgroundColor: gold }}
                >
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <section id="services" className="py-32 relative z-10 bg-[#FDFCF8] text-[#111111] overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 relative">
            
            {/* Background faint circle */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] border-[1px] border-black/10 rounded-full pointer-events-none" />

            {/* Title */}
            <div className="text-center mb-24 relative z-10">
              <h2 className="serif-font text-6xl md:text-8xl font-light text-[#111111]">Our services</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center relative z-10">
              
              {/* Left Column */}
              <div className="space-y-12 order-2 lg:order-1">
                <div className="space-y-8 max-w-sm mx-auto lg:mx-0">
                  <p className="sans-font text-[#111]/70 text-sm md:text-base leading-relaxed">
                    {salon.hero_subtitle || `Transform your hair into a masterpiece of beauty and vitality at ${salon.name}. Our expert stylists blend artistry with rejuvenating treatments to give you the hair you've always dreamed of.`}
                  </p>
                  <button 
                    className="sans-font px-8 py-3 rounded-full border text-sm transition-all hover:opacity-80"
                    style={{ borderColor: gold, color: gold }}
                  >
                    Read More
                  </button>
                </div>
                
                <div className="aspect-[4/3] rounded-sm overflow-hidden relative shadow-lg">
                  <img src="/service_image_left.png" className="w-full h-full object-cover" alt="Salon experience" />
                </div>
              </div>

              {/* Center Column */}
              <div className="flex justify-center lg:-mt-32 order-1 lg:order-2">
                <div className="w-[80%] lg:w-[95%] aspect-[2/3] rounded-[15rem] overflow-hidden shadow-2xl relative border-4 border-white">
                  <img src="/service_image_center.png" className="w-full h-full object-cover" alt="Hair consultation" />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-16 flex flex-col justify-between h-full order-3 lg:order-3">
                
                <div className="space-y-6 pt-10">
                  {services?.slice(0, 6).map((service: any) => {
                    const isSelected = selectedServices.find((s: any) => s.id === service.id);
                    return (
                      <div 
                        key={service.id} 
                        className="flex items-center gap-4 group cursor-pointer"
                        onClick={() => {
                          toggleService(service);
                          setIsModalOpen(true);
                        }}
                      >
                        <span 
                          className="group-hover:translate-x-2 transition-transform text-2xl font-light"
                          style={{ color: gold }}
                        >→</span>
                        <h3 className="serif-font text-2xl md:text-3xl font-light group-hover:opacity-70 transition-colors" style={isSelected ? { color: gold } as any : {}}>{service.name}</h3>
                      </div>
                    )
                  })}

                  {services?.length > 6 && (
                    <button
                      onClick={() => setServicesModalOpen(true)}
                      className="flex items-center gap-3 group cursor-pointer mt-2"
                    >
                      <span className="group-hover:translate-x-2 transition-transform text-2xl font-light" style={{ color: gold }}>→</span>
                      <span className="serif-font text-xl font-light text-[#111]/50 group-hover:opacity-70 transition-colors">
                        View all {services.length} services
                      </span>
                    </button>
                  )}
                </div>

                <div className="aspect-[4/3] rounded-sm overflow-hidden relative shadow-lg">
                  <img src="/service_image_right.png" className="w-full h-full object-cover" alt="Hair treatment" />
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-32 border-t border-white/5 bg-[#0d0d0d]">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#161616] flex items-center justify-center border border-white/5" style={{ color: gold }}>
                <MapPin size={24} />
              </div>
              <h4 className="serif-font text-2xl text-white">Visit Us</h4>
              <p className="text-white/50 font-light max-w-[200px] leading-relaxed">{salon.address}</p>
            </div>
            <div className="flex flex-col items-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#161616] flex items-center justify-center border border-white/5" style={{ color: gold }}>
                <Phone size={24} />
              </div>
              <h4 className="serif-font text-2xl text-white">Contact Us</h4>
              <p className="text-white/50 font-light leading-relaxed">{salon.phone}</p>
            </div>
            <div className="flex flex-col items-center space-y-6">
              <div className="flex gap-4">
                <a href={salon.social_instagram || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_instagram ? 'pointer-events-none opacity-40' : ''}>
                  <div className="w-16 h-16 rounded-full bg-[#161616] flex items-center justify-center border border-white/5 hover:bg-white/10 transition-colors" style={{ color: gold }}>
                    <Instagram size={24} />
                  </div>
                </a>
                <a href={salon.social_facebook || undefined} target="_blank" rel="noopener noreferrer" className={!salon.social_facebook ? 'pointer-events-none opacity-40' : ''}>
                  <div className="w-16 h-16 rounded-full bg-[#161616] flex items-center justify-center border border-white/5 hover:bg-white/10 transition-colors" style={{ color: gold }}>
                    <Facebook size={24} />
                  </div>
                </a>
              </div>
              <h4 className="serif-font text-2xl text-white">Follow Us</h4>
              <p className="text-white/50 font-light leading-relaxed max-w-[200px]">Stay updated with our latest styles.</p>
            </div>
          </div>
        </section>

        <footer className="py-10 border-t border-white/5 text-center bg-[#0d0d0d]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/30">
            © {new Date().getFullYear()} {salon.name}. All Rights Reserved.
          </p>
        </footer>
      </div>

      {/* ── All Services Modal ── */}
      {servicesModalOpen && (() => {
        const categories = ['All', ...Array.from(new Set((services || []).map((s: any) => s.category_name || 'Other'))) as string[]];
        const filtered = (services || []).filter((s: any) => {
          const matchSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
          const matchCat = activeCategory === 'All' || (s.category_name || 'Other') === activeCategory;
          return matchSearch && matchCat;
        });
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setServicesModalOpen(false)} />
            <div className="relative z-10 w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div>
                  <h2 className="serif-font text-3xl font-light text-white">All Services</h2>
                  <p className="sans-font text-sm text-white/40 mt-1">{filtered.length} of {services?.length} services</p>
                </div>
                <button
                  onClick={() => setServicesModalOpen(false)}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search + Categories */}
              <div className="px-8 py-4 border-b border-white/5 space-y-4">
                <div className="relative">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={e => setServiceSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors sans-font"
                  />
                  {serviceSearch && (
                    <button onClick={() => setServiceSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider sans-font transition-all",
                        activeCategory === cat
                          ? "text-black"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                      )}
                      style={activeCategory === cat ? { backgroundColor: gold } : {}}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services Grid */}
              <div className="overflow-y-auto flex-1 px-8 py-6">
                {filtered.length === 0 ? (
                  <div className="py-16 text-center text-white/30 sans-font">
                    No services match "<span className="text-white/50">{serviceSearch}</span>"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filtered.map((service: any) => {
                      const isSelected = selectedServices.find((s: any) => s.id === service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => {
                            toggleService(service);
                            setServicesModalOpen(false);
                            setIsModalOpen(true);
                          }}
                          className={cn(
                            "flex items-center justify-between p-5 rounded-2xl border text-left transition-all hover:-translate-y-0.5",
                            isSelected
                              ? "border-opacity-60 bg-white/5"
                              : "border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10"
                          )}
                          style={isSelected ? { borderColor: gold } : {}}
                        >
                          <div className="space-y-1 min-w-0 pr-4">
                            <p className={cn("serif-font text-lg font-light truncate", isSelected ? "text-white" : "text-white/80")}
                               style={isSelected ? { color: gold } : {}}
                            >{service.name}</p>
                            <div className="flex items-center gap-3 sans-font text-xs text-white/30">
                              <span className="flex items-center gap-1"><Clock size={11} />{service.duration_minutes} min</span>
                              {service.category_name && <span className="truncate">{service.category_name}</span>}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="sans-font font-bold text-sm" style={{ color: gold }}>
                              {Number(service.price) === 0 ? 'Free' : `${salon.currency} ${Number(service.price).toLocaleString()}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between">
                <p className="sans-font text-xs text-white/30">
                  {selectedServices.length > 0
                    ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`
                    : 'Click a service to select it'}
                </p>
                {selectedServices.length > 0 && (
                  <button
                    onClick={() => { setServicesModalOpen(false); setIsModalOpen(true); }}
                    className="sans-font px-6 py-2.5 rounded-full text-sm font-bold text-black transition-all hover:opacity-90"
                    style={{ backgroundColor: gold }}
                  >
                    Book Now →
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </>
  );
};

export default DarkTheme;
