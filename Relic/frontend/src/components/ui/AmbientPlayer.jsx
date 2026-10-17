import React, { useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, Flame, Radio, Sparkles, Volume2, VolumeX, ChevronUp } from "lucide-react";
import engine from "@/lib/audio";

const CHANNELS = [
  { id: "rain", label: "Late Night Rain", icon: CloudRain },
  { id: "fireplace", label: "Warm Fireplace", icon: Flame },
  { id: "tape", label: "Lo-Fi Tape Hiss", icon: Radio },
  { id: "cosmic", label: "Cosmic Dream", icon: Sparkles },
];

export default function AmbientPlayer() {
  const [active, setActive] = useState("cosmic");
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(0.45);
  const [expanded, setExpanded] = useState(false);

  const pick = (id) => {
    engine.ensure();
    if (active === id) {
      engine.stop();
      setActive(null);
    } else {
      engine.play(id);
      setActive(id);
      if (muted) { setMuted(false); engine.setVolume(vol); }
    }
  };

  const toggleMute = () => {
    engine.ensure();
    const m = !muted;
    setMuted(m);
    engine.setVolume(m ? 0 : vol);
  };

  const changeVol = (v) => {
    setVol(v);
    setMuted(false);
    engine.setVolume(v);
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 24 }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30"
      data-testid="ambient-player"
    >
      <div className="glass rounded-2xl px-3 py-2.5 flex items-center gap-2 shadow-2xl">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="hidden sm:flex items-center gap-1.5 pr-2 border-r border-white/10 text-[#8C8AA3] hover:text-[#F6D06D] text-xs"
          data-testid="ambient-toggle-btn"
        >
          <ChevronUp className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          <span className="uppercase tracking-widest">Ambience</span>
        </button>

        <div className="flex items-center gap-1">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const on = active === c.id;
            return (
              <button
                key={c.id}
                data-testid={`ambient-${c.id}-btn`}
                onClick={() => pick(c.id)}
                title={c.label}
                className={`group relative h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                  on ? "bg-[#F6D06D] text-[#0A0A0F]" : "text-[#8C8AA3] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {expanded && (
                  <span className="absolute -top-8 whitespace-nowrap text-[10px] px-2 py-1 rounded bg-black/80 text-white opacity-0 group-hover:opacity-100 pointer-events-none">
                    {c.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <button onClick={toggleMute} data-testid="ambient-mute-btn" className="text-[#8C8AA3] hover:text-white">
            {muted || vol === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={muted ? 0 : vol}
            onChange={(e) => changeVol(parseFloat(e.target.value))}
            className="w-16 accent-[#F6D06D]"
            data-testid="ambient-volume"
          />
        </div>
      </div>
    </motion.div>
  );
}
