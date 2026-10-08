"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const defaultSlides = [
  "/hero-brakepads-1.jpg",
  "/hero-brakepads-2.jpg",
  "/hero-brakepads-3.jpg",
];

interface HeroCarouselBgProps {
  customImages?: string[];
}

export function HeroCarouselBg({ customImages }: HeroCarouselBgProps) {
  const slides = customImages && customImages.length > 0 ? customImages : defaultSlides;
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <>
      {slides.map((slide, index) => (
        <div
          key={slide + index}
          aria-hidden
          className={
            "absolute inset-0 overflow-hidden transition-opacity duration-1000 " +
            (index === currentSlide ? "opacity-90 z-[1]" : "opacity-0 z-0")
          }
          style={{
            maskImage: "linear-gradient(to left, black 35%, transparent 80%)",
            WebkitMaskImage: "linear-gradient(to left, black 35%, transparent 80%)",
          }}
        >
          <Image
            src={slide}
            alt=""
            fill
            priority={index === 0}
            loading={index === 0 ? undefined : "lazy"}
            sizes="100vw"
            quality={85}
            className="object-cover object-[right_center] rtl:-scale-x-100"
          />
        </div>
      ))}

      {/* Carousel Dots */}
      {slides.length > 1 && (
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
      )}
    </>
  );
}

