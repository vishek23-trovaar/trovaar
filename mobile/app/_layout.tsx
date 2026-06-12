import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import { AppThemeProvider, useAppTheme } from "@/lib/appTheme";
import ErrorBoundary from "@/components/ErrorBoundary";

function ThemedStatusBar() {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ThemedStatusBar />
              <Slot />
            </ToastProvider>
          </AuthProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
