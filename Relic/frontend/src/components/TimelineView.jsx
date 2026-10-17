import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Mail, Camera, Star, Clock, Lock, Sparkles, ImageOff } from "lucide-react";
import { fileUrl } from "@/lib/api";

const TYPE_META = {
  letter: { icon: Mail, color: "#E9E6F0", label: "Letter", bg: "rgba(233,230,240,0.08)" },
  polaroid: { icon: Camera, color: "#F6D06D", label: "Polaroid", bg: "rgba(246,208,109,0.08)" },
  milestone: { icon: Star, color: "#FF6B8B", label: "Milestone", bg: "rgba(255,107,139,0.08)" },
  capsule: { icon: Clock, color: "#F6A94D", label: "Time Capsule", bg: "rgba(246,169,77,0.08)" },
};

function groupByMonth(memories) {
  const groups = {};
  const sorted = [...memories].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  for (const m of sorted) {
    const d = new Date(m.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
    if (!groups[key]) groups[key] = { key, label, memories: [] };
    groups[key].memories.push(m);
  }
  return Object.values(groups);
}

function countdown(unlockAt) {
  const diff = new Date(unlockAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function TimelineCard({ memory, index, onSelect }) {
  const meta = TYPE_META[memory.memory_type] || TYPE_META.letter;
  const Icon = meta.icon;
  const isLeft = index % 2 === 0;
  const locked = memory.is_locked;
  const photos = memory.media_urls && memory.media_urls.length
    ? memory.media_urls
    : memory.media_url ? [memory.media_url] : [];
  const date = new Date(memory.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={`timeline-row ${isLeft ? "tl-left" : "tl-right"}`}>
      {/* connector dot on the spine */}
      <motion.div
        className="timeline-dot"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
        style={{ borderColor: meta.color, boxShadow: `0 0 12px ${meta.color}55` }}
      />

      {/* card */}
      <motion.div
        className="timeline-card group"
        initial={{ opacity: 0, x: isLeft ? -40 : 40, y: 16 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ type: "spring", stiffness: 200, damping: 22, delay: index * 0.04 }}
        whileHover={{ y: -4, boxShadow: `0 12px 40px -8px ${meta.color}30` }}
        onClick={() => onSelect(memory)}
        style={{ cursor: "pointer" }}
      >
        {/* type badge */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center"
            style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="ml-auto text-[10px] text-[#8C8AA3] tabular-nums">{date}</span>
        </div>

        {/* photo preview for polaroid / milestone / capsule */}
        {photos.length > 0 && !locked && (
          <div className="mb-3 rounded-lg overflow-hidden" style={{ maxHeight: 200 }}>
            <img
              src={fileUrl(photos[0])}
              alt={memory.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: "contrast(1.04) saturate(0.94)" }}
            />
            {photos.length > 1 && (
              <div className="absolute bottom-2 right-2 glass rounded-full px-2 py-0.5 text-[10px] text-white/80">
                +{photos.length - 1} more
              </div>
            )}
          </div>
        )}

        {/* title */}
        <h4 className="font-heading text-xl text-[#E9E6F0] mb-1 leading-tight">
          {locked ? "Sealed Capsule" : memory.title}
        </h4>

        {/* content preview */}
        {!locked && memory.content && (
          <p className="font-hand text-base text-[#8C8AA3] leading-relaxed line-clamp-2">
            {memory.content}
          </p>
        )}

        {/* locked capsule state */}
        {locked && (
          <div className="flex items-center gap-2 mt-2">
            <Lock className="h-3.5 w-3.5 text-[#F6A94D]" />
            <span className="text-xs text-[#F6A94D]">
              {countdown(memory.unlock_at)
                ? `Unlocks in ${countdown(memory.unlock_at)}`
                : "Unlocking soon…"}
            </span>
          </div>
        )}

        {/* polaroid caption */}
        {!locked && memory.memory_type === "polaroid" && memory.caption && (
          <p className="font-hand text-sm text-[#F6D06D] mt-1 italic">"{memory.caption}"</p>
        )}

        {/* author & audio badge */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
          <span className="font-hand text-sm text-[#FF6B8B]">— {memory.author_name}</span>
          {memory.audio_url && !locked && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#8C8AA3]">
              <span className="tl-audio-dot" /> voice memo
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function TimelineView({ memories, onSelect }) {
  const groups = useMemo(() => groupByMonth(memories), [memories]);

  if (memories.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center justify-center h-full text-center px-6"
      >
        <p className="font-heading text-4xl text-[#E9E6F0] mb-2">No memories yet</p>
        <p className="text-sm text-[#8C8AA3] max-w-xs">
          Plot your first memory and it will appear on this timeline.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="timeline-view">
      {/* glowing spine */}
      <div className="timeline-spine" />

      {groups.map((group, gi) => (
        <div key={group.key} className="timeline-group">
          {/* month header */}
          <motion.div
            className="timeline-month"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
          >
            <Sparkles className="h-3 w-3 text-[#F6D06D]" />
            <span>{group.label}</span>
          </motion.div>

          {group.memories.map((m, mi) => (
            <TimelineCard
              key={m.id}
              memory={m}
              index={gi * 10 + mi}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}

      {/* bottom cap */}
      <motion.div
        className="timeline-end"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="h-2 w-2 rounded-full bg-[#F6D06D]" />
        <span className="text-[10px] text-[#8C8AA3] uppercase tracking-widest mt-2">The beginning</span>
      </motion.div>
    </div>
  );
}
