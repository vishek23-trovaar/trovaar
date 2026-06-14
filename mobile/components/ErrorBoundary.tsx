import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Without this, an exception thrown during render
 * unmounts the entire app and leaves the user staring at a blank screen.
 * The fallback shows the error to the user and offers a "Try again" reset.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error("ErrorBoundary caught:", error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.subtitle}>
            The app hit an unexpected error. Tap below to try again — if it keeps happening, please restart the app.
          </Text>

          {__DEV__ && (
            <View style={styles.devBox}>
              <Text style={styles.devLabel}>DEV — error details</Text>
              <Text style={styles.devText} selectable>
                {this.state.error.message}
              </Text>
              {this.state.error.stack && (
                <Text style={styles.devStack} selectable>
                  {this.state.error.stack}
                </Text>
              )}
            </View>
          )}

          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#010102" },
  inner: { flexGrow: 1, justifyContent: "center", padding: 24 },
  emoji: { fontSize: 56, textAlign: "center", marginBottom: 16 },
  title: { color: "#f7f8f8", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 10, letterSpacing: -0.4 },
  subtitle: { color: "#c9cdd3", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  devBox: { backgroundColor: "#18191b", borderColor: "#23252a", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 28 },
  devLabel: { color: "#fbbf24", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  devText: { color: "#f87171", fontSize: 13, fontFamily: "monospace", marginBottom: 8 },
  devStack: { color: "#8a8f98", fontSize: 11, fontFamily: "monospace", lineHeight: 16 },
  button: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
