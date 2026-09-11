import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ActionButton, Card, Icon, ProgressBar, SectionTitle } from "./ui";
import { makeStyles, useTheme } from "@/src/theme";
import { TARGETS, type AppState, type Meal } from "@/src/types";

const categories: Meal["category"][] = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const emptyForm = { food: "", serving: "", calories: "", protein: "", carbs: "", fat: "" };

export function NutritionView({ state, onSave }: { state: AppState; onSave: (next: AppState) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [category, setCategory] = useState<Meal["category"]>("Breakfast");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const totals = useMemo(() => state.meals.reduce((sum, meal) => ({ calories: sum.calories + meal.calories, protein: sum.protein + meal.protein, carbs: sum.carbs + meal.carbs, fat: sum.fat + meal.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [state.meals]);
  const visibleMeals = state.meals.filter((meal) => meal.category === category);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const addMeal = () => {
    if (!form.food.trim()) return;
    const meal: Meal = { id: Date.now().toString(), category, food: form.food.trim(), serving: form.serving || "1 serving", calories: Number(form.calories) || 0, protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0 };
    onSave({ ...state, meals: [meal, ...state.meals] });
    setForm(emptyForm);
    setShowForm(false);
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <SectionTitle eyebrow="NUTRITION HQ" title="Fuel the work" action={<Text style={styles.date}>Today</Text>} />
      <Card style={styles.summary}>
        <View style={styles.summaryTop}><View><Text style={styles.summaryEyebrow}>DAILY BALANCE</Text><Text style={styles.calories}>{Math.max(TARGETS.calories - totals.calories, 0)} <Text style={styles.kcal}>kcal left</Text></Text></View><View style={styles.calorieIcon}><Icon name="silverware-fork-knife" size={24} color={colors.brandPrimary} /></View></View>
        <ProgressBar value={totals.calories / TARGETS.calories} />
        <View style={styles.macroLine}><Text style={styles.macroText}><Text style={styles.bold}>{totals.protein}g</Text> protein</Text><Text style={styles.macroText}><Text style={styles.bold}>{totals.carbs}g</Text> carbs</Text><Text style={styles.macroText}><Text style={styles.bold}>{totals.fat}g</Text> fat</Text></View>
      </Card>
      <View style={styles.categoryRow}>{categories.map((item) => <Pressable testID={`meal-category-${item.toLowerCase()}`} key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categorySelected]}><Text style={[styles.categoryText, category === item && styles.categoryTextSelected]}>{item}</Text></Pressable>)}</View>
      <View style={styles.addHeader}><Text style={styles.subheading}>{category}</Text><Pressable testID="open-add-meal" onPress={() => setShowForm((value) => !value)} style={styles.plus}><Icon name={showForm ? "close" : "plus"} size={20} color={colors.onBrandPrimary} /></Pressable></View>
      {showForm ? <Card style={styles.form}><Text style={styles.formTitle}>Quick add food</Text><TextInput testID="meal-food-input" value={form.food} onChangeText={(value) => update("food", value)} placeholder="Food name" placeholderTextColor={colors.muted} style={styles.field} /><TextInput testID="meal-serving-input" value={form.serving} onChangeText={(value) => update("serving", value)} placeholder="Serving size" placeholderTextColor={colors.muted} style={styles.field} /><View style={styles.fieldGrid}>{([ ["calories", "Calories"], ["protein", "Protein g"], ["carbs", "Carbs g"], ["fat", "Fat g"] ] as const).map(([key, label]) => <TextInput key={key} value={form[key]} onChangeText={(value) => update(key, value)} keyboardType="decimal-pad" placeholder={label} placeholderTextColor={colors.muted} style={[styles.field, styles.gridField]} />)}</View><ActionButton testID="add-meal" onPress={addMeal} icon="plus">Add to {category}</ActionButton></Card> : null}
      {visibleMeals.map((meal) => <Card key={meal.id} style={styles.meal}><View style={styles.mealIcon}><Icon name="food-apple-outline" size={20} color={colors.success} /></View><View style={{ flex: 1 }}><Text style={styles.food}>{meal.food}</Text><Text style={styles.serving}>{meal.serving}  •  {meal.calories} kcal</Text></View><View style={styles.mealMacros}><Text style={styles.macroValue}>{meal.protein}g</Text><Text style={styles.macroCaption}>protein</Text></View></Card>)}
      {visibleMeals.length === 0 && !showForm ? <Card style={styles.empty}><Icon name="silverware-clean" size={26} color={colors.muted} /><Text style={styles.emptyTitle}>Nothing logged yet</Text><Text style={styles.emptyBody}>Add your first {category.toLowerCase()} to keep your targets honest.</Text><ActionButton tone="muted" onPress={() => setShowForm(true)}>Log a meal</ActionButton></Card> : null}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { padding: 20, gap: 16, paddingBottom: 120 }, date: { color: colors.brandSecondary, fontSize: 13, fontWeight: "800" }, summary: { gap: 16, borderColor: colors.brandPrimary }, summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, summaryEyebrow: { color: colors.brandPrimary, fontSize: 10, letterSpacing: 1.2, fontWeight: "900" }, calories: { color: colors.onSurface, fontSize: 31, fontWeight: "900", marginTop: 4 }, kcal: { color: colors.muted, fontSize: 13, fontWeight: "700" }, calorieIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" }, macroLine: { flexDirection: "row", justifyContent: "space-between" }, macroText: { color: colors.muted, fontSize: 12 }, bold: { color: colors.onSurface, fontWeight: "900" }, categoryRow: { flexDirection: "row", gap: 8 }, category: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }, categorySelected: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary }, categoryText: { color: colors.muted, fontSize: 11, fontWeight: "800" }, categoryTextSelected: { color: colors.brandPrimary }, addHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }, subheading: { color: colors.onSurface, fontSize: 20, fontWeight: "900" }, plus: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" }, form: { gap: 11 }, formTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "900", marginBottom: 2 }, field: { minHeight: 44, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, color: colors.onSurface, fontSize: 13 }, fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, gridField: { width: "48%" }, meal: { flexDirection: "row", alignItems: "center", paddingVertical: 14 }, mealIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: 11 }, food: { color: colors.onSurface, fontSize: 15, fontWeight: "900" }, serving: { color: colors.muted, fontSize: 12, marginTop: 4 }, mealMacros: { alignItems: "flex-end" }, macroValue: { color: colors.success, fontSize: 15, fontWeight: "900" }, macroCaption: { color: colors.muted, fontSize: 10, marginTop: 2 }, empty: { alignItems: "center", gap: 9, paddingVertical: 28 }, emptyTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900" }, emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: "center", maxWidth: 260, marginBottom: 4 },
}));