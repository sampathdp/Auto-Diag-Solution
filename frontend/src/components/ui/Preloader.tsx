import React from "react";
import { Scissors, Calendar } from "lucide-react";

export const Preloader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      {/* Decorative Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />

      {/* Main Core Loading Container */}
      <div className="relative flex flex-col items-center space-y-8 z-10 scale-95 md:scale-100">
        
        {/* Animated Rings & Logo */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* External Glowing Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-indigo-500 animate-spin" />
          
          {/* Inner Counter-Rotating Ring */}
          <div className="absolute inset-2.5 rounded-full border-4 border-slate-900 border-b-violet-500 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
          
          {/* Central Pulsing Sphere with Icon */}
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
            <Calendar className="text-white w-8 h-8" />
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent animate-gradient-shift">
              Storefront
            </span>
          </h2>
          <p className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase animate-pulse">
            Initializing System
          </p>
        </div>

        {/* Loading Progress Dot Indicators */}
        <div className="flex items-center gap-1.5 pt-4">
          <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" />
          <span className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]" />
          <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>

      {/* Inline styles for background gradient animation */}
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          background-size: 200% auto;
          animation: gradient-shift 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Preloader;
