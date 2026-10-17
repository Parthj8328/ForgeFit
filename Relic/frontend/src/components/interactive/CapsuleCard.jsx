import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import Gallery from "./Gallery";

function useCountdown(unlockAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(unlockAt).getTime() - now;
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function Unit({ v, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-heading text-4xl text-[#F6A94D] tabular-nums">{String(v).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-widest text-[#8C8AA3]">{label}</span>
    </div>
  );
}

export default function CapsuleCard({ memory }) {
  const cd = useCountdown(memory.unlock_at);
  const locked = memory.is_locked;

  if (locked && cd) {
    return (
      <div className="w-full flex flex-col items-center text-center py-4">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="h-20 w-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: "radial-gradient(circle, rgba(246,169,77,0.4), transparent 70%)" }}
        >
          <Lock className="h-8 w-8 text-[#F6A94D]" />
        </motion.div>
        <h3 className="font-heading text-3xl text-[#E9E6F0] mb-1">A Sealed Capsule</h3>
        <p className="text-sm text-[#8C8AA3] mb-8 max-w-xs">
          This memory is time-locked. Its contents are hidden — even from the server — until the stars align.
        </p>
        <div className="flex gap-5 glass rounded-2xl px-6 py-5">
          <Unit v={cd.d} label="days" />
          <Unit v={cd.h} label="hrs" />
          <Unit v={cd.m} label="min" />
          <Unit v={cd.s} label="sec" />
        </div>
        <p className="text-xs text-[#8C8AA3] mt-6">
          Unlocks {new Date(memory.unlock_at).toLocaleString()}
        </p>
      </div>
    );
  }

  // Unlocked — supernova reveal
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="w-full text-center"
    >
      <div className="flex items-center justify-center gap-2 text-[#FF6B8B] mb-3">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs uppercase tracking-widest">Capsule Unsealed</span>
      </div>
      <h3 className="font-heading text-4xl text-[#E9E6F0] mb-4">{memory.title}</h3>
      {memory.media_url && (
        <Gallery memory={memory} className="mb-5" />
      )}
      {memory.content && (
        <p className="font-hand text-2xl text-[#E9E6F0] leading-relaxed whitespace-pre-wrap">{memory.content}</p>
      )}
      <p className="font-hand text-lg text-[#FF6B8B] mt-4">— {memory.author_name}</p>
    </motion.div>
  );
}
