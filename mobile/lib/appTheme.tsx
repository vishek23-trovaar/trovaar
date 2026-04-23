/**
 * App-wide theme mode provider. Controls dark/light/system preference and
 * exposes the active color palette via useAppTheme().
 *
 * ⚠ Migration note: existing screens import `colors` directly from theme.ts.
 * That static import always resolves to the light palette. Any screen you
 * want to make theme-reactive needs to switch to:
 *     const { colors } = useAppTheme();
 * New screens should use the hook; old screens can migrate incrementally.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors as lightColors, darkColors, ColorPalette } from "./theme";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "trovaar-theme-mode";

interface AppThemeContext {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
  colors: ColorPalette;
}

const Ctx = createContext<AppThemeContext | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Load the persisted preference once on mount.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark" || saved === "system") {
          setModeState(saved);
        }
      } catch {
        // ignore — default to "system"
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const isDark = useMemo(() => {
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return systemScheme === "dark";
  }, [mode, systemScheme]);

  const value: AppThemeContext = useMemo(
    () => ({
      mode,
      setMode,
      isDark,
      colors: isDark ? darkColors : lightColors,
    }),
    [mode, setMode, isDark]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppTheme(): AppThemeContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fail-soft: return light defaults so call sites never crash if a screen
    // accidentally renders outside the provider.
    return {
      mode: "system",
      setMode: () => {},
      isDark: false,
      colors: lightColors,
    };
  }
  return ctx;
}
