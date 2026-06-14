import React, { useState, useEffect, useRef } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export default function SearchBar({
  placeholder = "Search...",
  onSearch,
  debounceMs = 300,
}: SearchBarProps) {
  const [text, setText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(text);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, debounceMs, onSearch]);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#8a8f98" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#6b7079"
        value={text}
        onChangeText={setText}
        autoCorrect={false}
      />
      {text.length > 0 && (
        <Pressable onPress={() => setText("")} style={styles.clear}>
          <Ionicons name="close-circle" size={20} color="#8a8f98" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1b1f",
    borderWidth: 1,
    borderColor: "#23252a",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#f7f8f8",
  },
  clear: {
    padding: 4,
  },
});
