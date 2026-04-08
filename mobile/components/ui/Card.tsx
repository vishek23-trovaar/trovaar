import React from "react";
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, onPress, padding = 16, style }: CardProps) {
  const content = (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
});
