import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Gallery from "./Gallery";

export default function MilestoneCard({ memory }) {
  useEffect(() => {
    const t = setTimeout(() => {
      confetti({ particleCount: 90, spread: 100, origin: { y: 0.4 }, colors: ["#FF6B8B", "#F6D06D", "#ffffff"], scalar: 0.9 });
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const date = memory.created_at ? new Date(memory.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-center"
    >
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center blush-glow"
        style={{ background: "radial-gradient(circle, rgba(255,107,139,0.45), transparent 70%)" }}
      >
        <Star className="h-8 w-8 text-[#FF6B8B]" fill="#FF6B8B" />
      </motion.div>
      <p className="text-xs uppercase tracking-[0.3em] text-[#FF6B8B] mb-2">Milestone</p>
      <h3 className="font-heading text-4xl text-[#E9E6F0] mb-1">{memory.title}</h3>
      <p className="text-xs text-[#8C8AA3] mb-5">{date}</p>
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
