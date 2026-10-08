"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AboutImageCarouselProps {
  images: string[];
  imageTag?: string;
  autoPlayInterval?: number;
}

export function AboutImageCarousel({
  images,
  imageTag,
  autoPlayInterval = 4000,
}: AboutImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const slideCount = images.length;

  const nextSlide = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrent((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrent((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;
    const timer = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(timer);
  }, [slideCount, isPaused, autoPlayInterval, nextSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
    } else if (e.key === "ArrowRight") {
      nextSlide();
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Warehouse Image Carousel"
    >
      {/* Slides */}
      {images.map((src, index) => (
        <div
          key={src + index}
          className={`absolute inset-0 transition-all duration-700 ease-out ${
            index === current
              ? "opacity-100 scale-100 z-10"
              : "opacity-0 scale-105 z-0 pointer-events-none"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Slide ${index + 1}`}
            loading={index === 0 ? "eager" : "lazy"}
            className="h-full w-full object-cover object-center"
          />
        </div>
      ))}

      {/* Subtle overlay gradients & dynamic elements */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10 pointer-events-none" />
      <div className="absolute -bottom-16 -end-16 h-72 w-72 rounded-full border-[22px] border-white/10 z-10 pointer-events-none" />

      {/* Image tag label if provided */}
      {imageTag && (
        <div className="absolute bottom-5 start-5 z-20 text-xs font-bold uppercase tracking-wider text-white/90 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/15 shadow-sm">
          {imageTag}
        </div>
      )}

      {/* Navigation Chevrons */}
      {slideCount > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute start-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:scale-110 active:scale-95 shadow-lg focus:opacity-100"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute end-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:scale-110 active:scale-95 shadow-lg focus:opacity-100"
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Slide Indicators & Count Pill */}
      {slideCount > 1 && (
        <div className="absolute bottom-5 end-5 z-20 flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm">
          <span className="text-[11px] font-bold text-white/90 tracking-wider me-0.5">
            0{current + 1} / 0{slideCount}
          </span>
          <div className="flex items-center gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`Go to slide ${index + 1}`}
                className="group/dot flex h-4 w-4 items-center justify-center focus:outline-none"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    index === current
                      ? "w-5 bg-primary shadow-sm"
                      : "w-2 bg-white/40 group-hover/dot:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

