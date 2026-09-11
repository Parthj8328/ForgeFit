import { Appearance, StyleSheet, useColorScheme } from "react-native";
import { useMemo } from "react";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#121316",
  onSurface: "#F4F5F7",
  surfaceSecondary: "#1A1C23",
  onSurfaceSecondary: "#9CA3AF",
  surfaceTertiary: "#252833",
  onSurfaceTertiary: "#D1D5DB",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#121316",
  muted: "#9CA3AF",
  brand: "#FF5722",
  onBrand: "#FFFFFF",
  brandPrimary: "#FF5722",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FF7043",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(255, 87, 34, 0.15)",
  onBrandTertiary: "#FF5722",
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",
  border: "#2D323E",
  borderStrong: "#FF5722",
  divider: "#222630",
};

export type ThemeColors = typeof dark;
export const defaultScheme = "dark" satisfies ColorScheme;
export const themes: { dark: ThemeColors; light?: ThemeColors } = { dark };

Appearance.setColorScheme?.("dark");

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "dark");
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  useColorScheme();
  return { scheme: "dark", colors: themes.dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}