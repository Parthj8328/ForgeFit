import React, { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Mic, ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { fileUrl } from "@/lib/api";
import AudioVisualizer from "./AudioVisualizer";

export default function PolaroidCard({ memory }) {
  const [flipped, setFlipped] = useState(false);
  const [idx, setIdx] = useState(0);
  const photos = memory.media_urls && memory.media_urls.length ? memory.media_urls : (memory.media_url ? [memory.media_url] : []);
  const hasAudio = !!memory.audio_url;
  const date = memory.created_at ? new Date(memory.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
  const cur = photos[Math.min(idx, photos.length - 1)];
  const go = (dir) => setIdx((i) => (i + dir + photos.length) % photos.length);

  return (
    <div className="w-full flex flex-col items-center">
      <div style={{ perspective: 1400 }} className="w-full max-w-[320px]">
        <motion.div
          className="relative w-full"
          style={{ transformStyle: "preserve-3d", aspectRatio: "3/3.7" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 rounded-sm bg-[#f8f6ef] p-3 pb-14 shadow-2xl"
            style={{ backfaceVisibility: "hidden", boxShadow: "0 20px 50px -12px rgba(0,0,0,0.7)" }}
          >
            <div className="relative w-full h-full rounded-sm overflow-hidden bg-[#20202a]">
              {cur ? (
                <img
                  src={fileUrl(cur)}
                  alt={memory.title}
                  className="w-full h-full object-cover"
                  style={{ filter: "contrast(1.05) saturate(0.92) sepia(0.12)" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8C8AA3]">
                  <ImageOff className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.45)" }} />

              {photos.length > 1 && (
                <>
                  <button data-testid="polaroid-prev" onClick={() => go(-1)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button data-testid="polaroid-next" onClick={() => go(1)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                    {photos.map((_, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="absolute bottom-3 left-0 right-0 px-4 flex items-center justify-between">
              <span className="font-hand text-[#2b2620] text-xl truncate">{memory.caption || memory.title}</span>
              <span className="text-[10px] text-[#8a8578] tracking-wide">{date}</span>
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 rounded-sm bg-[#14151f] p-5 flex flex-col"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", border: "1px solid rgba(246,208,109,0.15)" }}
          >
            <div className="flex items-center gap-2 text-[#F6D06D] mb-4">
              <Mic className="h-4 w-4" />
              <span className="text-xs uppercase tracking-widest">Voice Memo</span>
            </div>
            <p className="font-hand text-2xl text-[#E9E6F0] mb-2">{memory.title}</p>
            {memory.content && <p className="text-sm text-[#8C8AA3] mb-4 flex-1 overflow-y-auto">{memory.content}</p>}
            <div className="mt-auto">
              {hasAudio ? (
                <AudioVisualizer src={fileUrl(memory.audio_url)} />
              ) : (
                <p className="text-xs text-[#8C8AA3]">No recording attached.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <button
        data-testid="polaroid-flip-btn"
        onClick={() => setFlipped((f) => !f)}
        className="mt-5 flex items-center gap-2 text-sm text-[#8C8AA3] hover:text-[#F6D06D] transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        {flipped ? "Show photos" : hasAudio ? "Play voice memo" : "Flip card"}
      </button>
    </div>
  );
}
