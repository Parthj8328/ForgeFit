import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { type ReactNode } from "react";
import { makeStyles, useTheme } from "@/src/theme";

export function Icon({ name, size = 20, color }: { name: keyof typeof MaterialCommunityIcons.glyphMap; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? colors.onSurface} />;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ActionButton({ children, icon, tone = "brand", style, ...props }: PressableProps & { children: ReactNode; icon?: keyof typeof MaterialCommunityIcons.glyphMap; tone?: "brand" | "muted" | "outline"; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <Pressable {...props} style={({ pressed }) => [styles.button, styles[tone], pressed && styles.pressed, style]} accessibilityRole="button">
      {icon ? <Icon name={icon} size={18} color={tone === "brand" ? styles.buttonText.color : styles.mutedText.color} /> : null}
      <Text style={tone === "brand" ? styles.buttonText : styles.mutedText}>{children}</Text>
    </Pressable>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.sectionTitle}><View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text></View>{action}</View>;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { colors } = useTheme();
  return <View style={[stylesStatic.progressTrack, { backgroundColor: colors.surfaceTertiary }]}><View style={[stylesStatic.progressFill, { width: `${Math.min(value, 1) * 100}%`, backgroundColor: color ?? colors.brandPrimary }]} /></View>;
}

export function MetricRing({ label, value, unit, progress, color }: { label: string; value: string; unit: string; progress: number; color: string }) {
  const styles = useStyles();
  return <View style={styles.metric}><View style={[styles.ring, { borderColor: color }]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricUnit}>{unit}</Text></View><Text style={styles.metricLabel}>{label}</Text></View>;
}

const stylesStatic = StyleSheet.create({
  progressTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
});

const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18 },
  button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  brand: { backgroundColor: colors.brandPrimary },
  muted: { backgroundColor: colors.surfaceTertiary },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
  mutedText: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  sectionTitle: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 },
  eyebrow: { color: colors.brandSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 5 },
  title: { color: colors.onSurface, fontSize: 23, fontWeight: "800" },
  metric: { alignItems: "center", flex: 1 },
  ring: { width: 66, height: 66, borderRadius: 33, borderWidth: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  metricValue: { color: colors.onSurface, fontSize: 17, fontWeight: "900" },
  metricUnit: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  metricLabel: { color: colors.onSurfaceSecondary, fontSize: 11, marginTop: 8 },
}));