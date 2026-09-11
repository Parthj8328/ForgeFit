export type Screen = "Dashboard" | "Workouts" | "Nutrition" | "Analytics" | "Profile";

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
};

export type Meal = {
  id: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  food: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Routine = { name: string; focus: string; exercises: string[] };
export type WorkoutLog = {
  id: string;
  date: string;
  routine: string;
  volume: number;
  exercises: { name: string; weight: number; reps: number; sets: number }[];
};
export type BodyweightLog = { id: string; date: string; weight: number };

export type AppState = {
  user_id: string;
  water_ml: number;
  water_goal_ml: number;
  meals: Meal[];
  workout_logs: WorkoutLog[];
  bodyweight_logs: BodyweightLog[];
  routines: Record<string, Routine>;
  settings: { sound: boolean; haptics: boolean; unit: "kg" | "lb" };
  updated_at?: string;
};

export const TARGETS = { calories: 2400, protein: 180, carbs: 260, fat: 75 };