import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Check, Layout, Upload, Image as ImageIcon, Type, Palette, Lock, Instagram, Facebook } from "lucide-react";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import ModernTheme from "@/themes/modern";
import ElegantTheme from "@/themes/elegant";
import RoseTheme from "@/themes/rose";
import DarkTheme from "@/themes/dark";
import SpaTheme from "@/themes/spa";

const THEMES = [
  { id: 'elegant', name: 'Luxury', preview: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=200' },
  { id: 'modern', name: 'Minimal', preview: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=200' },
  { id: 'rose', name: 'Feminine', preview: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=200' },
  { id: 'dark', name: 'Dark', preview: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=200' },
  { id: 'spa', name: 'Spa', preview: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=200' },
];

const COLORS = [
  '#F43F5E', '#8B5CF6', '#3B82F6', '#1E3A8A', '#A21CAF',
  '#10B981', '#5F9EA0', '#0EA5E9', '#94A3B8', '#F59E0B',
  '#F97316', '#EF4444', '#0F172A', '#1E293B', '#000000',
];

const FONTS = [
  { id: 'Playfair Display', label: 'Playfair', class: 'font-serif' },
  { id: 'Poppins', label: 'Poppins', class: 'font-sans' },
  { id: 'Inter', label: 'Inter', class: 'font-sans' },
  { id: 'Outfit', label: 'Outfit', class: 'font-sans' },
  { id: 'Montserrat', label: 'Montserrat', class: 'font-sans' },
  { id: 'Lora', label: 'Lora', class: 'font-serif' },
  { id: 'Cormorant Garamond', label: 'Cormorant', class: 'font-serif' },
  { id: 'Cinzel', label: 'Cinzel', class: 'font-serif' },
  { id: 'DM Sans', label: 'DM Sans', class: 'font-sans' },
  { id: 'Lato', label: 'Lato', class: 'font-sans' },
];

const SectionLabel = ({ icon, children, hint }: { icon?: React.ReactNode; children: React.ReactNode; hint?: string }) => (
  <div className="flex items-center gap-2 mb-4">
    {icon && <span className="text-slate-400">{icon}</span>}
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{children}</span>
    {hint && <span className="text-[10px] text-slate-300 normal-case tracking-normal font-normal ml-1">{hint}</span>}
  </div>
);

const AppearanceSettings = ({ salonData }: { salonData: any }) => {
  const [settings, setSettings] = useState({
    theme: salonData?.theme || 'modern',
    primary_color: salonData?.primary_color || '#6366f1',
    font_family: salonData?.font_family || 'Inter',
    button_style: salonData?.button_style || 'modern',
    layout_style: salonData?.layout_style || 'full',
    logo: salonData?.logo || null,
    cover_image: salonData?.cover_image || null,
    hero_tagline: salonData?.hero_tagline || '',
    hero_title: salonData?.hero_title || '',
    hero_subtitle: salonData?.hero_subtitle || '',
    social_instagram: salonData?.social_instagram || '',
    social_facebook: salonData?.social_facebook || '',
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (salonData) {
      setSettings({
        theme: salonData.theme || 'modern',
        primary_color: salonData.primary_color || '#6366f1',
        font_family: salonData.font_family || 'Inter',
        button_style: salonData.button_style || 'modern',
        layout_style: salonData.layout_style || 'full',
        logo: salonData.logo || null,
        cover_image: salonData.cover_image || null,
        hero_tagline: salonData.hero_tagline || '',
        hero_title: salonData.hero_title || '',
        hero_subtitle: salonData.hero_subtitle || '',
        social_instagram: salonData.social_instagram || '',
        social_facebook: salonData.social_facebook || '',
      });
    }
  }, [salonData]);

  const queryClient = useQueryClient();

  const handleFileChange = (type: 'logo' | 'cover_image', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error("Image too large. Please upload under 1.5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setSettings(prev => ({ ...prev, [type]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const user = useAuthStore(state => state.user);

  const handleSave = async () => {
    if (!user?.salon_id) return;
    setIsSaving(true);
    try {
      await apiClient.put(`/salons/${user.salon_id}`, settings);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success("Appearance settings updated!");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const set = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  const mockProps = {
    salon: {
      name: salonData?.salon_name || 'My Salon',
      theme: settings.theme,
      primary_color: settings.primary_color,
      font_family: settings.font_family,
      button_style: settings.button_style,
      layout_style: settings.layout_style,
      logo: settings.logo,
      cover_image: settings.cover_image,
      currency: salonData?.currency || 'LKR',
      address: salonData?.address || '123 Main St, City',
      phone: salonData?.phone || '123-456-7890',
      hero_tagline: settings.hero_tagline,
      hero_title: settings.hero_title,
      hero_subtitle: settings.hero_subtitle,
      social_instagram: settings.social_instagram,
      social_facebook: settings.social_facebook,
    },
    services: [
      { id: 1, name: 'Signature Haircut', price: 5000, duration_minutes: 45 },
      { id: 2, name: 'Full Color', price: 12000, duration_minutes: 120 },
      { id: 3, name: 'Spa Facial', price: 8000, duration_minutes: 60 },
      { id: 4, name: 'Manicure', price: 3000, duration_minutes: 30 },
    ],
    selectedServices: [],
    toggleService: () => {},
    setIsModalOpen: () => {},
    staff: [],
    branches: [],
  };

  return (
    <div className="max-w-full mx-auto p-5 bg-white rounded-[2rem] shadow-sm">
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=${settings.font_family?.replace(/ /g, '+')}:wght@400;700;900&display=swap');` }} />
      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange('logo', e)} />
      <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange('cover_image', e)} />

      <div className="flex gap-5 items-start">

        {/* ── LEFT PANEL: all controls ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Page title */}
          <div className="flex items-center justify-between py-1">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Customize Salon Theme</h2>
          </div>

          {/* Theme selector — horizontal scroll */}
          <div className="bg-slate-50 p-4 rounded-[1.5rem]">
            <SectionLabel icon={<Layout size={13} />}>Choose Theme</SectionLabel>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {THEMES.map(t => {
                const isAllowed = !salonData?.allowed_themes || salonData.allowed_themes.includes(t.id);
                const isActive = settings.theme === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (!isAllowed) {
                        toast.error(`"${t.name}" is a premium theme. Please upgrade to unlock it.`);
                        return;
                      }
                      set('theme', t.id);
                    }}
                    className={cn(
                      "relative flex-shrink-0 w-[100px] rounded-2xl overflow-hidden cursor-pointer transition-all border-2",
                      isActive ? "border-slate-950 shadow-lg shadow-slate-200" : "border-transparent hover:border-slate-200",
                      !isAllowed && "opacity-50"
                    )}
                  >
                    <img src={t.preview} className="w-full h-[64px] object-cover" alt={t.name} />
                    <div className={cn("px-2 py-1.5 flex items-center justify-between", isActive ? "bg-slate-950" : "bg-white")}>
                      <span className={cn("text-[10px] font-black uppercase tracking-wide", isActive ? "text-white" : "text-slate-600")}>{t.name}</span>
                      {!isAllowed && <Lock size={9} className="text-slate-400" />}
                      {isActive && <Check size={10} className="text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color + Assets — side by side */}
          <div className="grid grid-cols-2 gap-4">

            {/* Primary Color */}
            <div className="bg-slate-50 p-4 rounded-[1.5rem]">
              <SectionLabel icon={<Palette size={13} />}>Primary Color</SectionLabel>
              <div className="grid grid-cols-5 gap-2.5 mb-3">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => set('primary_color', color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center border-2",
                      settings.primary_color === color ? "border-slate-950 scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {settings.primary_color === color && <Check size={12} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
              {/* Custom hex input */}
              <div className="flex items-center gap-2 mt-1">
                <div className="w-7 h-7 rounded-lg border border-slate-200 flex-shrink-0" style={{ backgroundColor: settings.primary_color }} />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) set('primary_color', v);
                  }}
                  className="flex-1 text-[11px] font-mono font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 uppercase"
                  maxLength={7}
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Assets + Button Style stacked */}
            <div className="space-y-4">
              {/* Assets */}
              <div className="bg-slate-50 p-4 rounded-[1.5rem]">
                <SectionLabel icon={<ImageIcon size={13} />}>Assets</SectionLabel>
                <div className="space-y-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white rounded-xl hover:shadow-sm transition-all border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Upload size={13} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">Logo</span>
                    </div>
                    {settings.logo
                      ? <img src={settings.logo} className="w-6 h-6 rounded object-contain" />
                      : <span className="text-[9px] text-slate-300 font-bold uppercase">Upload</span>
                    }
                  </button>

                  {['elegant', 'rose'].includes(settings.theme) ? (
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-white rounded-xl hover:shadow-sm transition-all border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon size={13} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">Cover Image</span>
                      </div>
                      {settings.cover_image
                        ? <img src={settings.cover_image} className="w-6 h-6 rounded object-cover" />
                        : <span className="text-[9px] text-slate-300 font-bold uppercase">Upload</span>
                      }
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-100/60 rounded-xl border border-transparent opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={13} className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-400 line-through">Cover Image</span>
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">N/A</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Button Style */}
              <div className="bg-slate-50 p-4 rounded-[1.5rem]">
                <SectionLabel>Button Style</SectionLabel>
                <div className="flex gap-2">
                  {['modern', 'rounded'].map(s => (
                    <button
                      key={s}
                      onClick={() => set('button_style', s)}
                      className={cn(
                        "flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all border-2",
                        s === 'rounded' ? "rounded-full" : "rounded-md",
                        settings.button_style === s
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 text-slate-500 hover:border-slate-400"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="bg-slate-50 p-4 rounded-[1.5rem]">
            <SectionLabel icon={<Type size={13} />} hint="— leave blank to use theme defaults">Hero Content</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'hero_tagline', label: 'Tagline / Badge', placeholder: 'e.g. Top Rated Salon' },
                { key: 'hero_title', label: 'Main Headline', placeholder: 'e.g. Beauty Starts Here' },
                { key: 'hero_subtitle', label: 'Description', placeholder: 'e.g. Premium services tailored for you...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</label>
                  <input
                    type="text"
                    value={(settings as any)[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950/15"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-slate-50 p-4 rounded-[1.5rem]">
            <SectionLabel hint="— shown in your portal footer">Social Media</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Instagram URL</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => settings.social_instagram && window.open(settings.social_instagram, '_blank')}
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 transition-transform",
                      settings.social_instagram ? "cursor-pointer hover:scale-125" : "cursor-default pointer-events-none"
                    )}
                    title={settings.social_instagram ? "Open Instagram" : undefined}
                  >
                    <Instagram size={13} className={settings.social_instagram ? "text-pink-500" : "text-pink-300"} />
                  </button>
                  <input
                    type="url"
                    value={settings.social_instagram}
                    onChange={e => set('social_instagram', e.target.value)}
                    placeholder="https://instagram.com/yoursalon"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950/15"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Facebook URL</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => settings.social_facebook && window.open(settings.social_facebook, '_blank')}
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 transition-transform",
                      settings.social_facebook ? "cursor-pointer hover:scale-125" : "cursor-default pointer-events-none"
                    )}
                    title={settings.social_facebook ? "Open Facebook" : undefined}
                  >
                    <Facebook size={13} className={settings.social_facebook ? "text-blue-600" : "text-blue-300"} />
                  </button>
                  <input
                    type="url"
                    value={settings.social_facebook}
                    onChange={e => set('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/yoursalon"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950/15"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="bg-slate-50 p-4 rounded-[1.5rem]">
            <SectionLabel>Typography</SectionLabel>
            <div className="grid grid-cols-5 gap-2">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => set('font_family', f.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all",
                    settings.font_family === f.id
                      ? "border-slate-950 bg-white shadow-sm"
                      : "border-transparent bg-white/60 hover:bg-white hover:border-slate-200"
                  )}
                >
                  <span className={cn("text-xl leading-none text-slate-800", f.class)}>Aa</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide truncate w-full text-center">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT PANEL: sticky preview + save ── */}
        <div className="w-[320px] flex-shrink-0 sticky top-5 self-start space-y-3">

          <div className="bg-slate-50 p-4 rounded-[1.5rem]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Preview</span>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">{THEMES.find(t => t.id === settings.theme)?.name}</span>
            </div>
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-100">
              <div className="absolute top-0 left-0 w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none">
                {settings.theme === 'modern'  && <ModernTheme  {...mockProps} />}
                {settings.theme === 'elegant' && <ElegantTheme {...mockProps} />}
                {settings.theme === 'rose'    && <RoseTheme    {...mockProps} />}
                {settings.theme === 'dark'    && <DarkTheme    {...mockProps} />}
                {settings.theme === 'spa'     && <SpaTheme     {...mockProps} />}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            loading={isSaving}
            className="w-full h-12 bg-slate-950 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg transition-all hover:scale-[1.02]"
          >
            Save Settings
          </Button>

          {/* Color preview badge */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl">
            <div className="w-8 h-8 rounded-full shadow-inner border border-white/50" style={{ backgroundColor: settings.primary_color }} />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Accent Color</p>
              <p className="text-xs font-bold text-slate-700 font-mono uppercase">{settings.primary_color}</p>
            </div>
            <div className="ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-wide"
              style={{ fontFamily: settings.font_family }}>
              {settings.font_family.split(' ')[0]}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
