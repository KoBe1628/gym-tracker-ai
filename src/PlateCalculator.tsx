import React from "react";
import { StyleSheet, View, Text } from "react-native";

// Standard Gym Colors (Olympic Color Code)
const PLATES = [
  { weight: 25, color: "#FF0000", height: 70 }, // Red
  { weight: 20, color: "#0000FF", height: 70 }, // Blue
  { weight: 15, color: "#FFFF00", height: 60 }, // Yellow
  { weight: 10, color: "#008000", height: 50 }, // Green
  { weight: 5, color: "#FFFFFF", height: 40 }, // White
  { weight: 2.5, color: "#000000", height: 35 }, // Black
  { weight: 1.25, color: "#C0C0C0", height: 30 }, // Silver
];

export default function PlateCalculator({ weight }: { weight: number }) {
  // 1. Safety Check
  if (!weight || weight < 20) return null;

  // 2. The Math
  const barWeight = 20;
  let remainder = (weight - barWeight) / 2; // Weight for ONE side
  const platesOnOneSide: any[] = [];

  // 3. Greedy Calculation
  for (const plate of PLATES) {
    while (remainder >= plate.weight) {
      platesOnOneSide.push(plate);
      remainder -= plate.weight;
    }
  }

  // 4. Render the Barbell
  return (
    <View style={styles.container}>
      <Text style={styles.label}>LOAD THIS (PER SIDE):</Text>

      <View style={styles.barbellArea}>
        {/* The Bar Shaft */}
        <View style={styles.barShaft} />

        {/* The Sleeve (Where plates go) */}
        <View style={styles.barSleeve}>
          {platesOnOneSide.length === 0 ? (
            <Text style={styles.emptyText}>Empty Bar</Text>
          ) : (
            platesOnOneSide.map((p, index) => (
              <View key={index} style={styles.plateContainer}>
                {/* The Visual Plate */}
                <View
                  style={[
                    styles.plate,
                    {
                      backgroundColor: p.color,
                      height: p.height,
                      borderColor:
                        p.color === "#FFFFFF" ? "#ccc" : "transparent",
                    },
                  ]}
                />
                {/* The Number Label */}
                <Text style={styles.plateText}>{p.weight}</Text>
              </View>
            ))
          )}
        </View>

        {/* The End Cap */}
        <View style={styles.endCap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    marginBottom: 10,
    alignItems: "center",
    width: "100%",
  },
  label: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 5,
  },

  barbellArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
  },

  barShaft: { width: 40, height: 12, backgroundColor: "#71717a" }, // Dark Grey
  barSleeve: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#a1a1aa", // Lighter Grey (The sleeve)
    height: 20,
    paddingHorizontal: 2,
    minWidth: 50,
  },
  endCap: {
    width: 10,
    height: 20,
    backgroundColor: "#71717a",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },

  plateContainer: { alignItems: "center", marginHorizontal: 1 },
  plate: { width: 12, borderRadius: 2, borderWidth: 1 },
  plateText: { color: "#666", fontSize: 8, marginTop: 4, fontWeight: "bold" },
  emptyText: { color: "#444", fontSize: 10, marginLeft: 5 },
});
