import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, ActionButton, MetricRing, ProgressBar, SectionTitle, Icon } from "./ui";
import { makeStyles, useTheme } from "@/src/theme";
import { TARGETS, type AppState } from "@/src/types";

export function DashboardView({ state, userName, onAddWater, onStartWorkout, onOpenWorkouts, onOpenProfile }: { state: AppState; userName: string; onAddWater: (amount: number) => void; onStartWorkout: () => void; onOpenWorkouts: () => void; onOpenProfile: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const routine = state.routines[day] ?? state.routines.Monday;
  const totals = state.meals.reduce((sum, meal) => ({ calories: sum.calories + meal.calories, protein: sum.protein + meal.protein, carbs: sum.carbs + meal.carbs, fat: sum.fat + meal.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const waterProgress = state.water_ml / state.water_goal_ml;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.header}><View><Text style={styles.kicker}>FORGEFIT / TODAY</Text><Text style={styles.greeting}>Ready, {userName.split(" ")[0] || "athlete"}?</Text></View><Pressable testID="profile-avatar" onPress={onOpenProfile} style={styles.avatar}><Text style={styles.avatarText}>{userName.slice(0, 1).toUpperCase()}</Text></Pressable></View>
      <Card style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>YOUR DAILY EDGE</Text><Text style={styles.heroTitle}>Build momentum.{"\n"}One session at a time.</Text><Text style={styles.heroBody}>Stay consistent, track the details, and let the numbers follow.</Text></View><View style={styles.heroIcon}><Icon name="fire" size={38} color={colors.brandPrimary} /></View></Card>
      <SectionTitle eyebrow="NUTRITION / 01" title="Macro targets" action={<Text style={styles.link}>Today</Text>} />
      <Card style={styles.macroCard}><View style={styles.rings}>{([ ["Calories", totals.calories.toString(), "kcal", totals.calories / TARGETS.calories, colors.brandPrimary], ["Protein", totals.protein.toString(), "g", totals.protein / TARGETS.protein, colors.info], ["Carbs", totals.carbs.toString(), "g", totals.carbs / TARGETS.carbs, colors.warning], ["Fat", totals.fat.toString(), "g", totals.fat / TARGETS.fat, colors.success] ] as const).map(([label, value, unit, progress, color]) => <MetricRing key={label} label={label} value={value} unit={unit} progress={progress} color={color} />)}</View><View style={styles.remaining}><Text style={styles.remainingLabel}>Remaining calories</Text><Text style={styles.remainingValue}>{Math.max(TARGETS.calories - totals.calories, 0)} <Text style={styles.remainingUnit}>kcal</Text></Text></View><ProgressBar value={totals.calories / TARGETS.calories} /></Card>
      <SectionTitle eyebrow="HYDRATION / 02" title="Water check-in" />
      <Card><View style={styles.waterTop}><View style={styles.waterBadge}><MaterialCommunityIcons name="water-outline" size={20} color={colors.info} /></View><View style={styles.waterCopy}><Text style={styles.waterValue}>{(state.water_ml / 1000).toFixed(2)}L <Text style={styles.waterGoal}>/ {(state.water_goal_ml / 1000).toFixed(1)}L goal</Text></Text><Text style={styles.muted}>Keep the engine running.</Text></View><Text style={styles.percent}>{Math.round(waterProgress * 100)}%</Text></View><ProgressBar value={waterProgress} color={colors.info} /><View style={styles.waterActions}><ActionButton testID="water-add-250" icon="plus" tone="muted" onPress={() => onAddWater(250)}>+250 ml</ActionButton><ActionButton testID="water-add-500" icon="plus" tone="muted" onPress={() => onAddWater(500)}>+500 ml</ActionButton></View></Card>
      <SectionTitle eyebrow="TRAINING / 03" title="Today's session" action={<Text style={styles.link} onPress={onOpenWorkouts}>Edit split</Text>} />
      <Card><View style={styles.sessionHeader}><View style={styles.sessionIcon}><Icon name="dumbbell" size={22} color={colors.brandPrimary} /></View><View style={{ flex: 1 }}><Text style={styles.sessionName}>{routine.name}</Text><Text style={styles.muted}>{routine.focus}  •  {routine.exercises.length} exercises</Text></View><View style={styles.statusDot} /></View><View style={styles.exercisePreview}>{routine.exercises.slice(0, 3).map((exercise, index) => <View key={exercise} style={styles.exerciseRow}><Text style={styles.exerciseNumber}>0{index + 1}</Text><Text style={styles.exerciseName}>{exercise}</Text><Text style={styles.ghost}>3 × 8</Text></View>)}</View><ActionButton icon="play" onPress={onStartWorkout}>Start workout</ActionButton></Card>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { padding: 20, gap: 22, paddingBottom: 120 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  greeting: { color: colors.onSurface, fontSize: 30, fontWeight: "900", marginTop: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.brandPrimary, fontSize: 18, fontWeight: "900" },
  hero: { minHeight: 150, flexDirection: "row", overflow: "hidden", backgroundColor: colors.surfaceTertiary, borderColor: colors.brandPrimary },
  heroCopy: { flex: 1 }, heroEyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 }, heroTitle: { color: colors.onSurface, fontSize: 24, lineHeight: 27, fontWeight: "900", marginTop: 8 }, heroBody: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 18, marginTop: 9, maxWidth: 250 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginTop: 8 },
  link: { color: colors.brandSecondary, fontSize: 13, fontWeight: "800" },
  macroCard: { gap: 16 }, rings: { flexDirection: "row" }, remaining: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, remainingLabel: { color: colors.onSurfaceSecondary, fontSize: 13 }, remainingValue: { color: colors.onSurface, fontSize: 21, fontWeight: "900" }, remainingUnit: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 12, marginTop: 4 }, waterTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 }, waterBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(59, 130, 246, 0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 }, waterCopy: { flex: 1 }, waterValue: { color: colors.onSurface, fontSize: 20, fontWeight: "900" }, waterGoal: { color: colors.muted, fontSize: 12, fontWeight: "600" }, percent: { color: colors.info, fontSize: 13, fontWeight: "900" }, waterActions: { flexDirection: "row", gap: 10, marginTop: 16 }, sessionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 }, sessionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: 12 }, sessionName: { color: colors.onSurface, fontSize: 18, fontWeight: "900" }, statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success }, exercisePreview: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider, marginBottom: 16 }, exerciseRow: { flexDirection: "row", alignItems: "center", minHeight: 40 }, exerciseNumber: { color: colors.brandPrimary, fontSize: 11, fontWeight: "900", width: 30 }, exerciseName: { flex: 1, color: colors.onSurfaceTertiary, fontSize: 14 }, ghost: { color: colors.muted, fontSize: 12 },
}));