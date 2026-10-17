import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const VaultContext = createContext(null);
export const useVault = () => useContext(VaultContext);

export function VaultProvider({ children }) {
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState([]);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("relic_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get("/vault/me");
      setVault(data);
    } catch (e) {
      localStorage.removeItem("relic_token");
      setVault(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const loadMemories = useCallback(async () => {
    const { data } = await api.get("/memories");
    setMemories(data);
    return data;
  }, []);

  const authenticate = (token, vaultData) => {
    localStorage.setItem("relic_token", token);
    setVault(vaultData);
  };

  const leave = () => {
    localStorage.removeItem("relic_token");
    setVault(null);
    setMemories([]);
  };

  return (
    <VaultContext.Provider value={{ vault, loading, memories, setMemories, loadMemories, authenticate, leave }}>
      {children}
    </VaultContext.Provider>
  );
}
