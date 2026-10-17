import React, { useRef, useEffect, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ScratchCard({ memory, onUpdated }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const firedRef = useRef(false);
  const [revealed, setRevealed] = useState(!!memory.is_scratched);
  const [cleared, setCleared] = useState(memory.is_scratched ? 100 : 0);
  const [saving, setSaving] = useState(false);

  const paintFoil = useCallback((canvas) => {
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, "#c7ccd6");
    g.addColorStop(0.25, "#9aa1ad");
    g.addColorStop(0.5, "#e8ebf0");
    g.addColorStop(0.75, "#8b93a1");
    g.addColorStop(1, "#c0c6d1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // shimmer streaks
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = i % 2 ? "#ffffff" : "#7c8290";
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(-50 + i * 60, 0);
      ctx.lineTo(-50 + i * 60 + 140, canvas.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(60,66,78,0.85)";
    ctx.font = "600 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✦ scratch to reveal ✦", canvas.width / 2, canvas.height / 2);
  }, []);

  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    paintFoil(canvas);
  }, [revealed, paintFoil]);

  const checkCleared = useCallback((ctx, w, h) => {
    const img = ctx.getImageData(0, 0, w, h).data;
    let clear = 0;
    const stride = 32; // sample every Nth pixel for perf
    let count = 0;
    for (let i = 3; i < img.length; i += 4 * stride) {
      count++;
      if (img[i] === 0) clear++;
    }
    const pct = (clear / count) * 100;
    setCleared(pct);
    if (pct >= 60 && !firedRef.current) {
      firedRef.current = true;
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 }, colors: ["#F6D06D", "#FF6B8B", "#ffffff"] });
      setTimeout(() => setRevealed(true), 250);
    }
  }, []);

  const pointer = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const scratch = (e) => {
    if (!drawing.current || revealed) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = pointer(e);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 44;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    lastPos.current = { x, y };
    checkCleared(ctx, canvas.width, canvas.height);
  };

  const start = (e) => { drawing.current = true; lastPos.current = null; scratch(e); };
  const end = () => { drawing.current = false; lastPos.current = null; };

  const saveKeepsake = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/memories/${memory.id}`, { is_scratched: true });
      onUpdated && onUpdated(data);
      toast.success("Saved as a keepsake ✦");
    } catch (e) {
      toast.error("Could not save keepsake");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div
        ref={wrapRef}
        className="relative w-full rounded-xl overflow-hidden paper"
        style={{ minHeight: 300 }}
      >
        {/* letter content underneath */}
        <div className="absolute inset-0 p-8 flex flex-col justify-center">
          <p className="font-hand text-[#a8564f] text-lg mb-2">Dear you,</p>
          <p className="font-hand text-[#2b2620] text-2xl leading-relaxed whitespace-pre-wrap">
            {memory.content || "..."}
          </p>
          <p className="font-hand text-[#a8564f] text-xl mt-4 self-end">— {memory.author_name}</p>
        </div>

        {!revealed && (
          <canvas
            ref={canvasRef}
            data-testid="scratch-canvas"
            className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
            onMouseDown={start}
            onMouseMove={scratch}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={scratch}
            onTouchEnd={end}
          />
        )}
      </div>

      {!revealed ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#8C8AA3]">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#F6D06D] transition-all" style={{ width: `${Math.min(cleared, 100)}%` }} />
          </div>
          <span>{Math.round(Math.min(cleared, 100))}%</span>
        </div>
      ) : (
        <motion.button
          data-testid="save-keepsake-btn"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={saveKeepsake}
          disabled={saving || memory.is_scratched}
          className="btn-primary mt-4 w-full rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {memory.is_scratched ? <><Check className="h-4 w-4" /> Kept forever</> : <><Sparkles className="h-4 w-4" /> Save as Keepsake</>}
        </motion.button>
      )}
    </div>
  );
}
