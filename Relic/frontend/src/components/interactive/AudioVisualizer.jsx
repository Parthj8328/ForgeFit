import React, { useRef, useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import engine from "@/lib/audio";

export default function AudioVisualizer({ src }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, w, h);
    const bars = 42;
    const step = Math.floor(bins / bars);
    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const bh = Math.max(3, v * h * 0.9);
      const x = i * bw;
      const grad = ctx.createLinearGradient(0, h, 0, h - bh);
      grad.addColorStop(0, "#F6D06D");
      grad.addColorStop(1, "#FF6B8B");
      ctx.fillStyle = grad;
      const r = 2;
      ctx.beginPath();
      ctx.roundRect(x + bw * 0.2, h - bh, bw * 0.6, bh, r);
      ctx.fill();
    }
    rafRef.current = requestAnimationFrame(draw);
  };

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    engine.ensure();
    if (!analyserRef.current) {
      analyserRef.current = engine.attachElement(el);
    }
    if (playing) {
      el.pause();
    } else {
      try { await el.play(); } catch (e) {}
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => {
      setPlaying(true);
      engine.duck(true);
      cancelAnimationFrame(rafRef.current);
      draw();
    };
    const onPause = () => {
      setPlaying(false);
      engine.duck(false);
      cancelAnimationFrame(rafRef.current);
    };
    const onEnded = () => {
      setPlaying(false);
      engine.duck(false);
      setProgress(0);
      cancelAnimationFrame(rafRef.current);
    };
    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      cancelAnimationFrame(rafRef.current);
      try { el.pause(); } catch (e) {}
      engine.duck(false);
    };
  }, []);

  return (
    <div className="w-full">
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
      <div className="flex items-center gap-3">
        <button
          data-testid="memo-play-btn"
          onClick={toggle}
          className="h-11 w-11 shrink-0 rounded-full bg-[#F6D06D] text-[#0A0A0F] flex items-center justify-center hover:scale-105 transition-transform"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <div className="flex-1">
          <canvas ref={canvasRef} width={260} height={44} className="w-full h-11" />
          <div className="h-0.5 mt-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#FF6B8B]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
