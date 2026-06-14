import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  // Hairline well that brightens to the blue accent on focus (Linear pattern).
  const borderColor = error
    ? "#f87171"
    : focused
    ? "#3b82f6"
    : "#23252a";

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, { borderColor }]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={focused ? "#60a5fa" : "#8a8f98"}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, leftIcon && { paddingLeft: 0 }]}
          placeholderTextColor="#6b7079"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color="#8a8f98" />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#c9cdd3",
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1b1f",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: "#f7f8f8",
  },
  rightIcon: {
    padding: 4,
  },
  error: {
    fontSize: 12,
    color: "#f87171",
    marginTop: 4,
    marginLeft: 4,
  },
});
