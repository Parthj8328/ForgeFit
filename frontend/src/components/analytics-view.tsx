import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ActionButton, Card, Icon, SectionTitle } from "./ui";
import { makeStyles, useTheme } from "@/src/theme";
import type { AppState, BodyweightLog } from "@/src/types";

const ranges = ["30D", "60D", "90D"];

export function AnalyticsView({ state, onSave }: { state: AppState; onSave: (next: AppState) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [range, setRange] = useState("30D");
  const [weight, setWeight] = useState("");
  const logs = state.workout_logs.slice(0, 7).reverse();
  const body = state.bodyweight_logs.slice(-7);
  const maxVolume = Math.max(...logs.map((log) => log.volume), 1);
  const addWeight = () => {
    const value = Number(weight);
    if (!value) return;
    const point: BodyweightLog = { id: Date.now().toString(), date: new Date().toISOString(), weight: value };
    onSave({ ...state, bodyweight_logs: [...state.bodyweight_logs, point] });
    setWeight("");
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <SectionTitle eyebrow="PROGRESS LAB" title="Earn the trend" action={<View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>Live sync</Text></View>} />
      <Card style={styles.hero}><View><Text style={styles.eyebrow}>TOTAL SESSIONS</Text><Text style={styles.big}>{state.workout_logs.length}</Text><Text style={styles.muted}>completed workouts</Text></View><View style={styles.heroStat}><Text style={styles.eyebrow}>VOLUME LOAD</Text><Text style={styles.big}>{Math.round(state.workout_logs.reduce((sum, log) => sum + log.volume, 0)).toLocaleString()}</Text><Text style={styles.muted}>kg moved</Text></View></Card>
      <View style={styles.rangeRow}>{ranges.map((item) => <Pressable testID={`range-${item.toLowerCase()}`} key={item} onPress={() => setRange(item)} style={[styles.range, range === item && styles.rangeActive]}><Text style={[styles.rangeText, range === item && styles.rangeTextActive]}>{item}</Text></Pressable>)}</View>
      <SectionTitle eyebrow="STRENGTH / VOLUME" title="Volume load" />
      {logs.length ? <Card><View style={styles.chart}>{logs.map((log, index) => <View key={log.id} style={styles.barColumn}><View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max((log.volume / maxVolume) * 100, 8)}%` }]} /></View><Text style={styles.barLabel}>W{index + 1}</Text></View>)}</View><View style={styles.chartLegend}><Text style={styles.muted}>Recent completed sessions</Text><Text style={styles.legendValue}>{Math.round(logs[logs.length - 1].volume)} kg</Text></View></Card> : <Card style={styles.empty}><Icon name="chart-line" size={28} color={colors.muted} /><Text style={styles.emptyTitle}>Your chart starts here</Text><Text style={styles.muted}>Finish a workout to see volume and estimated 1RM progression.</Text></Card>}
      <SectionTitle eyebrow="BODYWEIGHT" title="Trend log" action={<Text style={styles.unit}>kg</Text>} />
      <Card><View style={styles.weightTop}><View><Text style={styles.weightValue}>{body.length ? body[body.length - 1].weight : "—"}</Text><Text style={styles.muted}>latest check-in</Text></View><View style={styles.weightInputRow}><TextInput testID="bodyweight-input" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 82.5" placeholderTextColor={colors.muted} style={styles.weightInput} /><ActionButton testID="log-bodyweight" icon="plus" onPress={addWeight}>Log</ActionButton></View></View>{body.length ? <View style={styles.bodyRows}>{body.slice().reverse().map((point) => <View key={point.id} style={styles.bodyRow}><Text style={styles.muted}>{new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text><Text style={styles.bodyWeight}>{point.weight} kg</Text></View>)}</View> : <Text style={styles.muted}>Log your bodyweight to make the trend personal.</Text>}</Card>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { padding: 20, gap: 16, paddingBottom: 120 }, live: { flexDirection: "row", alignItems: "center" }, liveText: { color: colors.success, fontSize: 12, fontWeight: "800" }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginRight: 5 }, hero: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong }, heroStat: { alignItems: "flex-end" }, eyebrow: { color: colors.brandPrimary, fontSize: 10, letterSpacing: 1.2, fontWeight: "900" }, big: { color: colors.onSurface, fontSize: 34, fontWeight: "900", marginTop: 3 }, muted: { color: colors.muted, fontSize: 12, lineHeight: 18 }, rangeRow: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: 13, padding: 4, gap: 4 }, range: { flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }, rangeActive: { backgroundColor: colors.brandPrimary }, rangeText: { color: colors.muted, fontSize: 12, fontWeight: "900" }, rangeTextActive: { color: colors.onBrandPrimary }, chart: { height: 160, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", gap: 7 }, barColumn: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" }, barTrack: { width: "70%", height: "86%", justifyContent: "flex-end", backgroundColor: colors.surfaceTertiary, borderRadius: 8, overflow: "hidden" }, bar: { width: "100%", backgroundColor: colors.brandPrimary, borderRadius: 8 }, barLabel: { color: colors.muted, fontSize: 10, marginTop: 8 }, chartLegend: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 14, paddingTop: 12, flexDirection: "row", justifyContent: "space-between" }, legendValue: { color: colors.brandPrimary, fontSize: 13, fontWeight: "900" }, empty: { alignItems: "center", gap: 8, paddingVertical: 25 }, emptyTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900" }, unit: { color: colors.brandSecondary, fontSize: 12, fontWeight: "800" }, weightTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 }, weightValue: { color: colors.onSurface, fontSize: 34, fontWeight: "900" }, weightInputRow: { flexDirection: "row", alignItems: "center", gap: 8 }, weightInput: { width: 100, height: 44, borderRadius: 12, backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, fontSize: 12 }, bodyRows: { borderTopWidth: 1, borderTopColor: colors.divider }, bodyRow: { minHeight: 35, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, bodyWeight: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "800" },
}));