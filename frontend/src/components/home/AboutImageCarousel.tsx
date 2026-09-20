"use client";

import { useEffect, useState } from "react";

export function AboutImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <>
      {images.map((src, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading={index === 0 ? undefined : "lazy"}
          className={
            "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 " +
            (index === current ? "opacity-100" : "opacity-0")
          }
        />
      ))}

      {images.length > 1 && (
        <div className="absolute bottom-4 end-6 z-[2] flex gap-1">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrent(index)}
              className="flex h-6 w-6 items-center justify-center"
              aria-label={`Go to image ${index + 1}`}
            >
              <span
                className={
                  "block h-2 rounded-full transition-all duration-300 " +
                  (index === current ? "w-6 bg-primary" : "w-2 bg-white/50")
                }
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
