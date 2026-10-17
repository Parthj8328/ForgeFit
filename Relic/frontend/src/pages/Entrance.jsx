import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, LockKeyhole, ArrowRight, Loader2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useVault } from "@/context/VaultContext";
import engine from "@/lib/audio";
import { toast } from "sonner";

function StaticStars() {
  const stars = useRef(
    Array.from({ length: 90 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 2 + 0.5,
      d: Math.random() * 4,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.current.map((st, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            animation: `twinkle ${2 + st.d}s ease-in-out ${st.d}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function Entrance() {
  const [mode, setMode] = useState("enter"); // enter | create
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const { authenticate } = useVault();
  const navigate = useNavigate();

  useEffect(() => {
    const warm = () => engine.ensure();
    window.addEventListener("pointerdown", warm, { once: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !passcode.trim()) {
      toast.error("Give your vault a name and a passcode");
      return;
    }
    setBusy(true);
    engine.ensure();
    try {
      const endpoint = mode === "create" ? "/vaults" : "/vaults/enter";
      const { data } = await api.post(endpoint, { name: name.trim(), passcode });
      authenticate(data.token, data.vault);
      engine.play("cosmic");
      toast.success(mode === "create" ? "Vault forged. Welcome home." : `Welcome back to ${data.vault.name}`);
      navigate("/vault");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen w-full flex items-center justify-center px-6 overflow-y-auto">
      <StaticStars />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md py-14"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mx-auto mb-6 h-16 w-16 rounded-full flex items-center justify-center"
            style={{ background: "radial-gradient(circle, rgba(246,208,109,0.35), transparent 70%)" }}
          >
            <Sparkles className="h-8 w-8 text-[#F6D06D]" strokeWidth={1.4} />
          </motion.div>
          <h1 className="font-heading text-6xl tracking-[0.18em] text-[#F6D06D] mb-3" style={{ fontWeight: 500 }}>
            RELIC
          </h1>
          <p className="font-hand text-2xl text-[#FF6B8B]">a shared vault of memories</p>
          <p className="text-sm text-[#8C8AA3] mt-2 max-w-xs mx-auto leading-relaxed">
            Letters, polaroids and voices, plotted as stars across your private night sky.
          </p>
        </div>

        <div className="glass rounded-2xl p-7 amber-glow">
          <div className="flex gap-2 mb-6 p-1 rounded-full bg-black/30">
            {[
              { id: "enter", label: "Enter Vault" },
              { id: "create", label: "New Vault" },
            ].map((t) => (
              <button
                key={t.id}
                data-testid={`mode-${t.id}-btn`}
                onClick={() => setMode(t.id)}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  mode === t.id ? "bg-[#F6D06D] text-[#0A0A0F]" : "text-[#8C8AA3] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#8C8AA3] mb-2">Vault name</label>
              <input
                data-testid="vault-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Us, Since 2019"
                className="pin-input w-full rounded-xl px-4 py-3 text-base"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#8C8AA3] mb-2">
                Shared passcode
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8AA3]" />
                <input
                  data-testid="vault-passcode-input"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••"
                  className="pin-input w-full rounded-xl pl-11 pr-4 py-3 text-base tracking-widest"
                />
              </div>
            </div>

            <button
              data-testid="vault-submit-btn"
              type="submit"
              disabled={busy}
              className="btn-primary w-full rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === "create" ? "Forge the Vault" : "Unlock"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <AnimatePresence>
            {mode === "create" && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-[#8C8AA3] mt-4 leading-relaxed"
              >
                Share the vault name & passcode with the people you love. Anyone with both can add and revisit memories.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
