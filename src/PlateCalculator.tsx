import React from "react";
import { View, Text, StyleSheet } from "react-native";

// 🎨 COLORS
const PLATE_COLORS: Record<number, string> = {
  25: "#ef4444", // Red
  20: "#3b82f6", // Blue
  15: "#eab308", // Yellow
  10: "#22c55e", // Green
  5: "#ffffff", // White
  2.5: "#000000", // Black
  1.25: "#9ca3af", // Silver
  0.5: "#9ca3af",
  0.25: "#9ca3af",
};

interface Props {
  weight: number;
  barWeight?: number; // 🆕 New Prop
  availablePlates?: number[]; // 🆕 New Prop
}

export default function PlateCalculator({
  weight,
  barWeight = 20,
  availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25],
}: Props) {
  // Logic: Calculate one side
  const targetOneSide = (weight - barWeight) / 2;

  if (targetOneSide <= 0) return null;

  const platesToLoad: number[] = [];
  let remaining = targetOneSide;

  // 🧮 MATH LOOP
  availablePlates.forEach((plate) => {
    while (remaining >= plate) {
      platesToLoad.push(plate);
      remaining -= plate;
    }
  });

  return (
    <View style={styles.container}>
      {/* 1. Barbell Graphics */}
      <View style={styles.barbell}>
        <View style={styles.barLine} />
        {platesToLoad.map((p, i) => (
          <View
            key={i}
            style={[
              styles.plate,
              {
                backgroundColor: PLATE_COLORS[p] || "#555",
                height: 30 + p * 2, // Dynamic height based on size
                width: 8 + p / 2, // Dynamic width
              },
            ]}
          />
        ))}
        {/* Collar */}
        <View style={styles.collar} />
      </View>

      {/* 2. Text Summary */}
      <View style={styles.textRow}>
        <Text style={styles.label}>LOAD PER SIDE:</Text>
        <Text style={styles.value}>
          {platesToLoad.length > 0 ? platesToLoad.join(", ") : "Empty Bar"}
        </Text>
      </View>
      <View style={styles.barInfo}>
        <Text style={{ color: "#444", fontSize: 10 }}>
          (Based on {barWeight}kg bar)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  barbell: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    justifyContent: "center",
  },
  barLine: {
    width: 40,
    height: 8,
    backgroundColor: "#666",
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    marginRight: 2,
  },
  plate: {
    marginHorizontal: 1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.3)",
  },
  collar: {
    width: 6,
    height: 12,
    backgroundColor: "#888",
    marginLeft: 1,
  },
  textRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  },
  label: {
    color: "#888",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  value: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  barInfo: {
    marginTop: 2,
  },
});
