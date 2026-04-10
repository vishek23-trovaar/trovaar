import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface Props {
  size?: number;
  showText?: boolean;
}

export default function TrovaarLogo({ size = 40, showText = true }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconBadge, { width: size, height: size, borderRadius: size * 0.3 }]}>
        <Image
          source={require("../assets/trovaar-logo.png")}
          style={{ width: size * 0.65, height: size * 0.65 }}
          resizeMode="contain"
        />
      </View>
      {showText && <Text style={styles.brand}>trovaar</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  brand: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -1,
  },
});
