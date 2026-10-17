import React, { useState } from "react";
import { fileUrl } from "@/lib/api";

export default function Gallery({ memory, className = "" }) {
  const photos = memory.media_urls && memory.media_urls.length ? memory.media_urls : (memory.media_url ? [memory.media_url] : []);
  const [active, setActive] = useState(0);
  if (!photos.length) return null;
  return (
    <div className={className}>
      <img
        src={fileUrl(photos[Math.min(active, photos.length - 1)])}
        alt={memory.title}
        className="w-full rounded-xl max-h-72 object-cover"
      />
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 justify-center flex-wrap">
          {photos.map((p, i) => (
            <button
              key={i}
              data-testid={`gallery-thumb-${i}`}
              onClick={() => setActive(i)}
              className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${i === active ? "border-[#F6D06D]" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
