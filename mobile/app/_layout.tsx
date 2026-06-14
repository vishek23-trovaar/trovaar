import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import { AppThemeProvider } from "@/lib/appTheme";
import ErrorBoundary from "@/components/ErrorBoundary";

// Linear dark navigation theme — overrides React Navigation's default light
// background (#f2f2f2) that otherwise shows behind every screen.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#08090A",
    card: "#0F1011",
    text: "#F7F8F8",
    border: "#23252A",
    primary: "#3B82F6",
    notification: "#F87171",
  },
};

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppThemeProvider>
          <ThemeProvider value={navTheme}>
            <AuthProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <Slot />
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
