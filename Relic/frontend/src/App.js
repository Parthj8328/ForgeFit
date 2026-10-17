import "@/App.css";
import "@/index.css";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { VaultProvider, useVault } from "@/context/VaultContext";
import Entrance from "@/pages/Entrance";
import Vault from "@/pages/Vault";
import { Toaster } from "sonner";

function Gate({ children }) {
  const { vault, loading } = useVault();
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0F]">
        <div className="font-heading text-2xl tracking-[0.3em] text-[#F6D06D] animate-pulse">RELIC</div>
      </div>
    );
  }
  return vault ? children : <Navigate to="/" replace />;
}

function Landing() {
  const { vault, loading } = useVault();
  if (loading) return null;
  return vault ? <Navigate to="/vault" replace /> : <Entrance />;
}

function App() {
  return (
    <VaultProvider>
      <BrowserRouter>
        <div className="cosmic-bg" />
        <div className="grain" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/vault" element={<Gate><Vault /></Gate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster theme="dark" position="top-center" richColors />
      </BrowserRouter>
    </VaultProvider>
  );
}

export default App;
