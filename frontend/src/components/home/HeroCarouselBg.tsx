"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import Image from "next/image";

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
            "absolute inset-0 overflow-hidden transition-opacity duration-1000 " +
            (index === currentSlide ? "opacity-90 z-[1]" : "opacity-0 z-0")
          }
          style={{
            maskImage: "linear-gradient(to left, black 30%, transparent 76%)",
            WebkitMaskImage: "linear-gradient(to left, black 30%, transparent 76%)",
          }}
        >
          {/* Only the first slide is eager/priority — it's the one visible at first
              paint (LCP candidate); the other two are lazy so all three PNGs don't
              download upfront just to sit at opacity-0. next/image also serves these
              as responsive AVIF/WebP instead of the original ~640KB PNGs. */}
          <Image
            src={slide}
            alt=""
            fill
            priority={index === 0}
            loading={index === 0 ? undefined : "lazy"}
            sizes="100vw"
            quality={70}
            className="object-cover object-[right_center] rtl:-scale-x-100"
          />
        </div>
      ))}

      {/* Carousel Dots */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-1 z-[10]">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className="flex h-6 w-6 items-center justify-center"
            aria-label={`Go to slide ${index + 1}`}
          >
            <span
              className={
                "block h-2 rounded-full transition-all duration-300 " +
                (index === currentSlide ? "bg-primary w-6" : "bg-white/30 group-hover:bg-white/50 w-2")
              }
            />
          </button>
        ))}
      </div>
    </>
  );
}
