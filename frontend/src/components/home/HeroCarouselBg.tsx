"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";

const slides = [
  "/slider-1.png",
  "/slider-2.png",
  "/slider-3.png",
];

export function HeroCarouselBg() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {slides.map((slide, index) => (
        <div
          key={slide}
          aria-hidden
          className={
            "absolute inset-0 bg-[length:auto_130%] bg-no-repeat transition-opacity duration-1000 " +
            "bg-[position:right_center] rtl:-scale-x-100 " +
            (index === currentSlide ? "opacity-90 z-[1]" : "opacity-0 z-0")
          }
          style={{
            backgroundImage: `url('${slide}')`,
            maskImage: "linear-gradient(to left, black 30%, transparent 76%)",
            WebkitMaskImage: "linear-gradient(to left, black 30%, transparent 76%)",
          }}
        />
      ))}
      
      {/* Carousel Dots */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3 z-[10]">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={
              "h-2 rounded-full transition-all duration-300 " +
              (index === currentSlide ? "bg-primary w-6" : "bg-white/30 hover:bg-white/50 w-2")
            }
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
}
