/**
 * Lightweight toast system — replaces native `Alert.alert()` for
 * non-blocking feedback (success/info/error banners that auto-dismiss).
 *
 * Keep `Alert.alert()` for blocking confirmations ("Are you sure?" Y/N).
 * Use `showToast()` for fire-and-forget "Payment confirmed" / "Bid sent".
 *
 * Usage:
 *   import { useToast } from "@/lib/toast";
 *   const toast = useToast();
 *   toast.success("Bid sent!");
 *   toast.error("Network error — try again");
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastKind = "success" | "error" | "info";

interface ToastPayload {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastAPI {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastAPI | null>(null);

const KIND_STYLE: Record<
  ToastKind,
  { bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { bg: "#10B981", icon: "checkmark-circle" },
  error: { bg: "#EF4444", icon: "alert-circle" },
  info: { bg: "#2563EB", icon: "information-circle" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      nextId.current += 1;
      setToast({ id: nextId.current, kind, message });
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      hideTimer.current = setTimeout(hide, 3500);
    },
    [translateY, opacity, hide]
  );

  const api: ToastAPI = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    info: (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              top: insets.top + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={hide}>
            <View style={[styles.toast, { backgroundColor: KIND_STYLE[toast.kind].bg }]}>
              <Ionicons
                name={KIND_STYLE[toast.kind].icon}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.text} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail-soft: if someone forgot to wrap the tree, log in dev but don't crash.
    if (__DEV__) {
      console.warn("useToast() called outside <ToastProvider> — falling back to no-op");
    }
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  text: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
});
