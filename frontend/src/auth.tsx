import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import { clearToken, exchangeSession, getMe, logoutRemote, readToken } from "./api";
import type { User } from "./types";

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = { user: User | null; loading: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

function sessionIdFromUrl(url: string | null) {
  const match = url?.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const handled = useRef(new Set<string>());

  const handleUrl = useCallback(async (url: string | null) => {
    const sessionId = sessionIdFromUrl(url);
    if (!sessionId || handled.current.has(sessionId)) return false;
    handled.current.add(sessionId);
    try {
      const nextUser = await exchangeSession(sessionId);
      setUser(nextUser);
      if (Platform.OS === "web") {
        const clean = window.location.href.replace(/([?#])session_id=[^&#]+&?/, "$1").replace(/[?#]$/, "");
        window.history.replaceState(window.history.state, "", clean);
      }
      return true;
    } catch (error) {
      handled.current.delete(sessionId);
      console.warn("[ForgeFit auth] session exchange failed", error);
      return false;
    }
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => { void handleUrl(url); });
    const bootstrap = async () => {
      const initialUrl = Platform.OS === "web" ? window.location.href : await Linking.getInitialURL();
      const exchanged = await handleUrl(initialUrl);
      if (!exchanged) {
        try {
          if (await readToken()) setUser(await getMe());
        } catch {
          await clearToken();
          setUser(null);
        }
      }
      setLoading(false);
    };
    void bootstrap();
    return () => subscription.remove();
  }, [handleUrl]);

  const signIn = useCallback(async () => {
    const redirectUrl = Platform.OS === "web" ? `${window.location.origin}/` : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    await handleUrl(result.type === "success" ? result.url : await Linking.getInitialURL());
  }, [handleUrl]);

  const signOut = useCallback(async () => {
    try { await logoutRemote(); } catch { /* local cleanup still matters */ }
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}