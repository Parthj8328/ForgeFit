import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LogOut, Sparkles, Loader2, Move, Check, Orbit, List } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import ConstellationSky from "@/components/canvas/ConstellationSky";
import TimelineView from "@/components/TimelineView";
import MemoryModal from "@/components/MemoryModal";
import AddMemoryModal from "@/components/AddMemoryModal";
import AmbientPlayer from "@/components/ui/AmbientPlayer";
import engine from "@/lib/audio";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Vault() {
  const { vault, memories, setMemories, loadMemories, leave } = useVault();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editMemory, setEditMemory] = useState(null);
  const [rearrange, setRearrange] = useState(false);
  const [authorName, setAuthorName] = useState(localStorage.getItem("relic_author") || "");
  const [view, setView] = useState(localStorage.getItem("relic_view") || "constellation");

  useEffect(() => {
    loadMemories().finally(() => setLoading(false));
  }, [loadMemories]);

  useEffect(() => {
    localStorage.setItem("relic_author", authorName);
  }, [authorName]);

  useEffect(() => {
    localStorage.setItem("relic_view", view);
  }, [view]);

  const handleSelect = useCallback((mem) => setSelected(mem), []);
  const handleCreated = (mem) => setMemories((prev) => [...prev, mem]);
  const handleUpdated = (mem) => {
    setMemories((prev) => prev.map((m) => (m.id === mem.id ? mem : m)));
    if (selected && selected.id === mem.id) setSelected(mem);
  };

  const openEdit = (mem) => { setSelected(null); setEditMemory(mem); setAdding(true); };
  const closeAdd = () => { setAdding(false); setEditMemory(null); };

  const handleDelete = async (mem) => {
    setMemories((prev) => prev.filter((m) => m.id !== mem.id));
    setSelected(null);
    try {
      await api.delete(`/memories/${mem.id}`);
      toast.success("Memory released to the cosmos");
    } catch (e) {
      toast.error("Could not delete memory");
      loadMemories();
    }
  };

  const handleReposition = async (id, coords) => {
    setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, coord_x: coords[0], coord_y: coords[1], coord_z: coords[2] } : m)));
    try {
      await api.patch(`/memories/${id}`, { coord_x: coords[0], coord_y: coords[1], coord_z: coords[2] });
    } catch (e) {
      toast.error("Could not save new position");
    }
  };

  const doLeave = () => { engine.stop(); leave(); };

  const isConstellation = view === "constellation";

  return (
    <div className="relative z-10 h-screen w-full overflow-hidden">
      {/* constellation (always mounted but hidden when timeline active, to preserve orbit state) */}
      <div className="absolute inset-0" style={{ visibility: isConstellation ? "visible" : "hidden" }}>
        {!loading && (
          <ConstellationSky
            memories={memories}
            onSelect={handleSelect}
            focus={selected}
            rearrange={rearrange}
            onReposition={handleReposition}
          />
        )}
      </div>

      {/* timeline view (scrollable) */}
      <AnimatePresence>
        {!isConstellation && !loading && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 overflow-y-auto z-10"
            style={{ paddingTop: 80 }}
          >
            <TimelineView memories={memories} onSelect={handleSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 pointer-events-none">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto">
          <div className="flex items-center gap-2 text-[#F6D06D]">
            <Sparkles className="h-4 w-4" />
            <span className="font-heading text-2xl tracking-[0.15em]">{vault?.name}</span>
          </div>
          <p className="text-[11px] text-[#8C8AA3] tracking-widest uppercase ml-6">
            {memories.length} {memories.length === 1 ? "memory" : "memories"} in orbit
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto flex items-center gap-4">
          {/* view toggle */}
          <div className="view-toggle" data-testid="view-toggle">
            <button
              onClick={() => { setView("constellation"); setRearrange(false); }}
              className={view === "constellation" ? "active" : ""}
              data-testid="view-constellation-btn"
            >
              <Orbit className="h-3.5 w-3.5" /> Sky
            </button>
            <button
              onClick={() => { setView("timeline"); setRearrange(false); }}
              className={view === "timeline" ? "active" : ""}
              data-testid="view-timeline-btn"
            >
              <List className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>

          {isConstellation && memories.length > 0 && (
            <button
              onClick={() => setRearrange((r) => !r)}
              data-testid="rearrange-toggle-btn"
              className={`flex items-center gap-2 text-sm transition-colors ${rearrange ? "text-[#F6D06D]" : "text-[#8C8AA3] hover:text-white"}`}
            >
              {rearrange ? <Check className="h-4 w-4" /> : <Move className="h-4 w-4" />}
              {rearrange ? "Done" : "Rearrange"}
            </button>
          )}
          <button onClick={doLeave} data-testid="leave-vault-btn" className="flex items-center gap-2 text-sm text-[#8C8AA3] hover:text-white transition-colors">
            <LogOut className="h-4 w-4" /> Leave
          </button>
        </motion.div>
      </div>

      {/* rearrange hint */}
      {rearrange && isConstellation && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-20 glass rounded-full px-4 py-2 text-xs text-[#F6D06D] pointer-events-none"
        >
          Drag any star to reposition it in the sky ✦
        </motion.div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#F6D06D] animate-spin" />
        </div>
      )}

      {!loading && memories.length === 0 && isConstellation && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <p className="font-heading text-4xl text-[#E9E6F0] mb-2">Your sky is empty</p>
          <p className="text-sm text-[#8C8AA3] max-w-xs">
            Plot your first memory — a letter, a polaroid, a milestone or a sealed capsule — and watch it rise as a star.
          </p>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
        onClick={() => { setEditMemory(null); setAdding(true); }} data-testid="add-memory-btn"
        className="absolute bottom-6 right-6 z-30 h-14 w-14 rounded-full btn-primary flex items-center justify-center amber-glow">
        <Plus className="h-6 w-6" />
      </motion.button>

      <AmbientPlayer />

      <MemoryModal
        memory={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <AddMemoryModal
        open={adding}
        onClose={closeAdd}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        editMemory={editMemory}
        authorName={authorName}
        setAuthorName={setAuthorName}
      />
    </div>
  );
}
