// Design tokens for CARI KROTO. Light + Dark. Keys match the "color" block of
// /app/design_guidelines.json. Build StyleSheets with makeStyles() and read
// colors props via useTheme().colors. Never write color literals in components.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F9F9F7",
  onSurface: "#1C1D1C",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1C1D1C",
  surfaceTertiary: "#F0F2F0",
  onSurfaceTertiary: "#3B3D3B",
  surfaceInverse: "#121412",
  onSurfaceInverse: "#F9F9F7",
  muted: "#6E736F",

  brand: "#2B5336",
  onBrand: "#FFFFFF",
  brandPrimary: "#2B5336",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#78947C",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E3EBE4",
  onBrandTertiary: "#2B5336",

  success: "#3A7D44",
  onSuccess: "#FFFFFF",
  warning: "#B36B00",
  onWarning: "#FFFFFF",
  error: "#A93B3B",
  onError: "#FFFFFF",
  info: "#4C4F4D",
  onInfo: "#FFFFFF",

  border: "#E5E8E5",
  borderStrong: "#B4BDB5",
  divider: "#E5E8E5",
};

const dark: typeof light = {
  surface: "#121412",
  onSurface: "#F2F4F1",
  surfaceSecondary: "#1C1D1C",
  onSurfaceSecondary: "#F2F4F1",
  surfaceTertiary: "#262826",
  onSurfaceTertiary: "#C7CCC7",
  surfaceInverse: "#F9F9F7",
  onSurfaceInverse: "#121412",
  muted: "#8A908A",

  brand: "#4E875F",
  onBrand: "#0B0F0B",
  brandPrimary: "#4E875F",
  onBrandPrimary: "#0B0F0B",
  brandSecondary: "#5F7A63",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#233026",
  onBrandTertiary: "#B7D6BF",

  success: "#5BA96A",
  onSuccess: "#0B0F0B",
  warning: "#E0982E",
  onWarning: "#0B0F0B",
  error: "#D46A6A",
  onError: "#0B0F0B",
  info: "#B7BCB7",
  onInfo: "#121412",

  border: "#2E312E",
  borderStrong: "#454A45",
  divider: "#2E312E",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
