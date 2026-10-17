import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Trash2 } from "lucide-react";
import ScratchCard from "./interactive/ScratchCard";
import PolaroidCard from "./interactive/PolaroidCard";
import CapsuleCard from "./interactive/CapsuleCard";
import MilestoneCard from "./interactive/MilestoneCard";

export default function MemoryModal({ memory, onClose, onUpdated, onEdit, onDelete }) {
  return (
    <AnimatePresence>
      {memory && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="memory-modal"
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(10px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto glass rounded-3xl p-7"
          >
            <button
              data-testid="modal-close-btn"
              onClick={onClose}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8C8AA3] hover:text-white transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {memory.memory_type === "letter" && <ScratchCard memory={memory} onUpdated={onUpdated} />}
            {memory.memory_type === "polaroid" && <PolaroidCard memory={memory} />}
            {memory.memory_type === "capsule" && <CapsuleCard memory={memory} />}
            {memory.memory_type === "milestone" && <MilestoneCard memory={memory} />}

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                data-testid="memory-edit-btn"
                onClick={() => onEdit(memory)}
                className="flex items-center gap-2 text-sm text-[#8C8AA3] hover:text-[#F6D06D] transition-colors"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                data-testid="memory-delete-btn"
                onClick={() => onDelete(memory)}
                className="flex items-center gap-2 text-sm text-[#8C8AA3] hover:text-[#FF6B8B] transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
