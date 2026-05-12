import { useState, useRef } from "react";
import { fileUrl } from "./TaskCard";

export function PhotoCarousel({ photos }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);
  if (!photos?.length) return null;

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const i = Math.round(el.scrollLeft / w);
    if (i !== index) setIndex(i);
  };

  return (
    <div className="relative" data-testid="photo-carousel">
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-0 rounded-3xl"
        style={{ scrollbarWidth: "none" }}
      >
        {photos.map((p, i) => (
          <div key={i} className="snap-center shrink-0 w-full aspect-[4/3] bg-lavender-50">
            <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="absolute bottom-3 right-3 bg-white/95 text-black text-xs font-bold rounded-full px-3 py-1 shadow"
          data-testid="carousel-counter"
        >
          {index + 1}/{photos.length}
        </div>
      )}
    </div>
  );
}
