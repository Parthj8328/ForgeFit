import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { getState, saveState } from "@/src/api";
import { useTheme } from "@/src/theme";
import type { AppState, Screen } from "@/src/types";
import { DashboardView } from "@/src/components/dashboard-view";
import { WorkoutsView } from "@/src/components/workouts-view";
import { NutritionView } from "@/src/components/nutrition-view";
import { AnalyticsView } from "@/src/components/analytics-view";
import { ProfileView } from "@/src/components/profile-view";
import { ActionButton, Icon } from "@/src/components/ui";

const tabs: { key: Screen; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: "Dashboard", label: "Home", icon: "view-dashboard-outline" },
  { key: "Workouts", label: "Train", icon: "dumbbell" },
  { key: "Nutrition", label: "Fuel", icon: "silverware-fork-knife" },
  { key: "Analytics", label: "Progress", icon: "chart-line" },
];

function LoadingScreen({ label = "Syncing ForgeFit" }: { label?: string }) {
  const { colors } = useTheme();
  return <View style={[styles.center, { backgroundColor: colors.surface }]}><View style={[styles.loadingMark, { backgroundColor: colors.brandTertiary }]}><Icon name="fire" size={34} color={colors.brandPrimary} /></View><ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 20 }} /><Text style={[styles.loadingText, { color: colors.muted }]}>{label}</Text></View>;
}

function AuthScreen() {
  const { colors } = useTheme(); const { signIn, loading } = useAuth();
  return <View style={[styles.auth, { backgroundColor: colors.surface }]}><View style={[styles.authGlow, { backgroundColor: colors.brandTertiary }]} /><View style={styles.authContent}><View style={[styles.logoMark, { backgroundColor: colors.brandPrimary }]}><Icon name="fire" size={38} color={colors.onBrandPrimary} /></View><Text style={[styles.brand, { color: colors.onSurface }]}>FORGE<Text style={{ color: colors.brandPrimary }}>FIT</Text></Text><Text style={[styles.authKicker, { color: colors.brandSecondary }]}>TRAIN WITH INTENT</Text><Text style={[styles.authTitle, { color: colors.onSurface }]}>Your strongest self{ "\n" }is built daily.</Text><Text style={[styles.authBody, { color: colors.muted }]}>Track your training, fuel your sessions, and turn consistency into strength.</Text><Pressable testID="google-sign-in" onPress={signIn} disabled={loading} style={({ pressed }) => [styles.googleButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.googleIcon, { backgroundColor: colors.surfaceTertiary }]}><Text style={[styles.googleG, { color: colors.onSurface }]}>G</Text></View><Text style={[styles.googleText, { color: colors.onSurface }]}>{loading ? "Connecting..." : "Continue with Google"}</Text><Icon name="arrow-right" size={19} color={colors.brandPrimary} /></Pressable><Text style={[styles.authFoot, { color: colors.muted }]}>Secure sign-in • Your data stays yours</Text></View></View>;
}

function BottomNav({ screen, onChange }: { screen: Screen; onChange: (screen: Screen) => void }) {
  const { colors } = useTheme();
  return <View style={[styles.nav, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>{tabs.map((tab) => <Pressable testID={`tab-${tab.key.toLowerCase()}`} key={tab.key} onPress={() => onChange(tab.key)} style={styles.navItem}>{({ pressed }) => <><View style={[styles.navIcon, screen === tab.key && { backgroundColor: colors.brandTertiary }, pressed && styles.pressed]}><MaterialCommunityIcons name={tab.icon} size={21} color={screen === tab.key ? colors.brandPrimary : colors.muted} /></View><Text style={[styles.navLabel, { color: screen === tab.key ? colors.onSurface : colors.muted }]}>{tab.label}</Text></>}</Pressable>)}</View>;
}

export default function Index() {
  const { colors } = useTheme(); const insets = useSafeAreaInsets(); const { user, loading: authLoading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>("Dashboard"); const [state, setState] = useState<AppState | null>(null); const [stateLoading, setStateLoading] = useState(false); const [stateError, setStateError] = useState(false); const [launchWorkout, setLaunchWorkout] = useState(false);
  const loadState = async () => { setStateLoading(true); setStateError(false); try { setState(await getState()); } catch { setStateError(true); } finally { setStateLoading(false); } };
  useEffect(() => { if (user) void loadState(); else setState(null); }, [user]);
  const updateState = (next: AppState) => { setState(next); void saveState(next).catch(() => setStateError(true)); };
  if (authLoading) return <LoadingScreen label="Checking your session" />;
  if (!user) return <AuthScreen />;
  if (stateLoading || !state) return stateError ? <View style={[styles.center, { backgroundColor: colors.surface }]}><Icon name="cloud-alert" size={36} color={colors.error} /><Text style={[styles.errorTitle, { color: colors.onSurface }]}>Sync is taking a break</Text><Text style={[styles.errorBody, { color: colors.muted }]}>We couldn’t load your ForgeFit data.</Text><ActionButton onPress={loadState} icon="refresh">Try again</ActionButton></View> : <LoadingScreen />;
  const openWorkout = () => { setScreen("Workouts"); setLaunchWorkout(true); };
  const renderScreen = () => { if (screen === "Dashboard") return <DashboardView state={state} userName={user.name} onAddWater={(amount) => updateState({ ...state, water_ml: state.water_ml + amount })} onStartWorkout={openWorkout} onOpenWorkouts={() => setScreen("Workouts")} onOpenProfile={() => setScreen("Profile")} />; if (screen === "Workouts") return <WorkoutsView key={`${screen}-${launchWorkout}`} state={state} onSave={updateState} autoStart={launchWorkout} />; if (screen === "Nutrition") return <NutritionView state={state} onSave={updateState} />; if (screen === "Analytics") return <AnalyticsView state={state} onSave={updateState} />; return <ProfileView user={user} state={state} onSave={updateState} onSignOut={() => void signOut()} />; };
  return <View style={[styles.app, { backgroundColor: colors.surface, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 10) }]}><StatusBar barStyle="light-content" />{screen !== "Dashboard" ? <View style={styles.appHeader}><Text style={[styles.appHeaderText, { color: colors.onSurface }]}>FORGE<Text style={{ color: colors.brandPrimary }}>FIT</Text></Text><Pressable testID="profile-header" onPress={() => setScreen("Profile")} style={[styles.headerButton, { backgroundColor: colors.surfaceSecondary }]}><Icon name="account-cog-outline" size={20} color={colors.brandPrimary} /></Pressable></View> : null}<View style={styles.screen}>{renderScreen()}</View><BottomNav screen={screen} onChange={(next) => { setScreen(next); setLaunchWorkout(false); }} /></View>;
}

const styles = StyleSheet.create({
  app: { flex: 1 }, appHeader: { height: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, appHeaderText: { fontSize: 18, fontWeight: "900", letterSpacing: 1.5 }, headerButton: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, screen: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, loadingMark: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center" }, loadingText: { fontSize: 13, marginTop: 12 }, errorTitle: { fontSize: 20, fontWeight: "900", marginTop: 16 }, errorBody: { fontSize: 13, marginTop: 6, marginBottom: 18 }, auth: { flex: 1, justifyContent: "center", padding: 28, overflow: "hidden" }, authGlow: { position: "absolute", width: 310, height: 310, borderRadius: 155, top: -95, right: -125 }, authContent: { alignItems: "center" }, logoMark: { width: 82, height: 82, borderRadius: 27, alignItems: "center", justifyContent: "center", marginBottom: 22 }, brand: { fontSize: 36, fontWeight: "900", letterSpacing: 2 }, authKicker: { fontSize: 11, letterSpacing: 2, fontWeight: "900", marginTop: 9 }, authTitle: { textAlign: "center", fontSize: 31, lineHeight: 35, fontWeight: "900", marginTop: 42 }, authBody: { textAlign: "center", fontSize: 14, lineHeight: 21, maxWidth: 300, marginTop: 16 }, googleButton: { width: "100%", minHeight: 58, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginTop: 32, gap: 12 }, googleIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" }, googleG: { fontSize: 18, fontWeight: "900" }, googleText: { flex: 1, fontSize: 14, fontWeight: "900" }, authFoot: { fontSize: 11, marginTop: 19 }, pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] }, nav: { minHeight: 74, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginHorizontal: 12, paddingHorizontal: 3 }, navItem: { alignItems: "center", justifyContent: "center", minWidth: 58, minHeight: 60, gap: 3 }, navIcon: { width: 36, height: 30, borderRadius: 11, alignItems: "center", justifyContent: "center" }, navLabel: { fontSize: 10, fontWeight: "800" },
});