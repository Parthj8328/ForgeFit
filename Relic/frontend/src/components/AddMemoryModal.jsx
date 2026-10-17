import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Square, Upload, Loader2, Image as ImageIcon, Star, Mail, Camera, Clock, Trash2 } from "lucide-react";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { toast } from "sonner";

const TYPES = [
  { id: "letter", label: "Letter", icon: Mail, hint: "A hidden note to scratch open" },
  { id: "polaroid", label: "Polaroid", icon: Camera, hint: "Photos with a voice memo" },
  { id: "milestone", label: "Milestone", icon: Star, hint: "A moment worth celebrating" },
  { id: "capsule", label: "Time Capsule", icon: Clock, hint: "Sealed until a future date" },
];

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AddMemoryModal({ open, onClose, onCreated, onUpdated, authorName, setAuthorName, editMemory }) {
  const isEdit = !!editMemory;
  const [type, setType] = useState("letter");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [caption, setCaption] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [keptUrls, setKeptUrls] = useState([]);        // existing storage paths (edit)
  const [newPhotos, setNewPhotos] = useState([]);      // [{file, preview}]
  const [audioBlob, setAudioBlob] = useState(null);
  const [hasExistingAudio, setHasExistingAudio] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRec = useRef(null);
  const chunks = useRef([]);

  useEffect(() => {
    if (!open) return;
    if (editMemory) {
      setType(editMemory.memory_type);
      setTitle(editMemory.title || "");
      setContent(editMemory.content || "");
      setCaption(editMemory.caption || "");
      setUnlockAt(toLocalInput(editMemory.unlock_at));
      setKeptUrls(editMemory.media_urls && editMemory.media_urls.length ? editMemory.media_urls : (editMemory.media_url ? [editMemory.media_url] : []));
      setHasExistingAudio(!!editMemory.audio_url);
      setNewPhotos([]);
      setAudioBlob(null);
    } else {
      setType("letter"); setTitle(""); setContent(""); setCaption(""); setUnlockAt("");
      setKeptUrls([]); setNewPhotos([]); setAudioBlob(null); setHasExistingAudio(false);
    }
    setRecording(false);
  }, [open, editMemory]);

  const close = () => { if (!busy) onClose(); };

  const onPhoto = (e) => {
    const files = Array.from(e.target.files || []);
    setNewPhotos((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
    e.target.value = "";
  };
  const removeNew = (i) => setNewPhotos((prev) => prev.filter((_, idx) => idx !== i));
  const removeKept = (i) => setKeptUrls((prev) => prev.filter((_, idx) => idx !== i));

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        setAudioBlob(new Blob(chunks.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mediaRec.current = rec;
      setRecording(true);
    } catch (e) {
      toast.error("Microphone permission denied");
    }
  };
  const stopRec = () => { mediaRec.current?.stop(); setRecording(false); };

  const uploadBlob = async (blob, filename) => {
    const fd = new FormData();
    fd.append("file", blob, filename);
    const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    return data.url || data.path;
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("Add a title"); return; }
    if (type === "capsule" && !unlockAt) { toast.error("Pick an unlock date for the capsule"); return; }
    setBusy(true);
    try {
      const uploaded = [];
      for (const p of newPhotos) uploaded.push(await uploadBlob(p.file, p.file.name));
      const gallery = [...keptUrls, ...uploaded];

      let audio_url;
      if (audioBlob) audio_url = await uploadBlob(audioBlob, "memo.webm");

      if (isEdit) {
        const patch = {
          title: title.trim(),
          author_name: authorName || "Someone",
          content: content || "",
          caption: caption || "",
          media_urls: gallery,
        };
        if (audio_url) patch.audio_url = audio_url;
        if (type === "capsule" && unlockAt) patch.unlock_at = new Date(unlockAt).toISOString();
        const { data } = await api.patch(`/memories/${editMemory.id}`, patch);
        onUpdated(data);
        toast.success("Memory updated ✦");
      } else {
        const payload = {
          title: title.trim(),
          memory_type: type,
          author_name: authorName || "Someone",
          content: content || null,
          caption: caption || null,
          media_urls: gallery,
          audio_url: audio_url || null,
          unlock_at: type === "capsule" && unlockAt ? new Date(unlockAt).toISOString() : null,
        };
        const { data } = await api.post("/memories", payload);
        onCreated(data);
        toast.success("A new star joins your sky ✦");
      }
      onClose();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const showPhoto = ["polaroid", "milestone", "capsule"].includes(type);
  const showAudio = ["polaroid", "capsule"].includes(type);
  const showContent = ["letter", "milestone", "capsule"].includes(type);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="add-memory-modal">
          <motion.div className="absolute inset-0 bg-black/60" style={{ backdropFilter: "blur(10px)" }} onClick={close} />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass rounded-3xl p-7">
            <button onClick={close} data-testid="add-close-btn"
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8C8AA3]">
              <X className="h-4 w-4" />
            </button>
            <h2 className="font-heading text-3xl text-[#F6D06D] mb-1">{isEdit ? "Edit this memory" : "Plot a new memory"}</h2>
            <p className="text-sm text-[#8C8AA3] mb-6">{isEdit ? "Refine the star that already glows in your sky." : "It will appear as a star in your constellation."}</p>

            {!isEdit && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} data-testid={`type-${t.id}-btn`} onClick={() => setType(t.id)}
                      className={`text-left rounded-xl p-3 border transition-all ${
                        type === t.id ? "border-[#F6D06D] bg-[#F6D06D]/10" : "border-white/10 hover:border-white/25"}`}>
                      <Icon className={`h-4 w-4 mb-1 ${type === t.id ? "text-[#F6D06D]" : "text-[#8C8AA3]"}`} />
                      <div className="text-sm font-medium text-white">{t.label}</div>
                      <div className="text-[11px] text-[#8C8AA3] leading-tight">{t.hint}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              <input data-testid="mem-title-input" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Title" className="pin-input w-full rounded-xl px-4 py-3" />
              <input data-testid="mem-author-input" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name" className="pin-input w-full rounded-xl px-4 py-3" />

              {showContent && (
                <textarea data-testid="mem-content-input" value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder={type === "letter" ? "Write your hidden letter..." : "Write something..."}
                  rows={4} className="pin-input w-full rounded-xl px-4 py-3 resize-none" />
              )}

              {type === "polaroid" && (
                <input data-testid="mem-caption-input" value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="Photo caption" className="pin-input w-full rounded-xl px-4 py-3" />
              )}

              {type === "capsule" && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#8C8AA3] mb-2">Unlock date & time</label>
                  <input data-testid="mem-unlock-input" type="datetime-local" value={unlockAt}
                    onChange={(e) => setUnlockAt(e.target.value)} className="pin-input w-full rounded-xl px-4 py-3" />
                </div>
              )}

              {showPhoto && (
                <div>
                  <label data-testid="mem-photo-label" className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-[#8C8AA3] hover:border-[#F6D06D]/50">
                    <ImageIcon className="h-4 w-4" />
                    {type === "polaroid" ? "Add photos (you can pick several)" : "Attach photos"}
                    <input type="file" accept="image/*" multiple onChange={onPhoto} className="hidden" />
                  </label>
                  {(keptUrls.length > 0 || newPhotos.length > 0) && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {keptUrls.map((u, i) => (
                        <div key={`k${i}`} className="relative group aspect-square">
                          <img src={fileUrl(u)} alt="" className="w-full h-full object-cover rounded-lg" />
                          <button onClick={() => removeKept(i)} data-testid={`remove-kept-${i}`}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {newPhotos.map((p, i) => (
                        <div key={`n${i}`} className="relative group aspect-square">
                          <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg" />
                          <button onClick={() => removeNew(i)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showAudio && (
                <div className="flex items-center gap-3 flex-wrap">
                  {!recording ? (
                    <button data-testid="record-btn" onClick={startRec} type="button"
                      className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm text-white hover:border-[#FF6B8B]/60">
                      <Mic className="h-4 w-4 text-[#FF6B8B]" /> {audioBlob || hasExistingAudio ? "Re-record memo" : "Record voice memo"}
                    </button>
                  ) : (
                    <button data-testid="stop-record-btn" onClick={stopRec} type="button"
                      className="flex items-center gap-2 rounded-xl bg-[#FF6B8B] px-4 py-3 text-sm text-white animate-pulse">
                      <Square className="h-4 w-4" fill="white" /> Stop
                    </button>
                  )}
                  {(audioBlob && !recording) && <span className="text-xs text-[#F6D06D]">✓ new memo</span>}
                  {(!audioBlob && hasExistingAudio) && <span className="text-xs text-[#8C8AA3]">memo already attached</span>}
                </div>
              )}

              <button data-testid="mem-submit-btn" onClick={submit} disabled={busy}
                className="btn-primary w-full rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-4 w-4" /> {isEdit ? "Save changes" : "Add to Constellation"}</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
