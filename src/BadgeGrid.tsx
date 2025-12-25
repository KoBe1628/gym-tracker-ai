import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 🏆 Define our Extended Badges
const BADGES = [
  // --- VOLUME TRACK (Consistency) ---
  {
    id: "first_step",
    name: "First Step",
    icon: "footsteps",
    color: "#bef264",
    condition: (stats: any) => stats.count >= 1,
  },
  {
    id: "regular",
    name: "Regular",
    icon: "walk",
    color: "#6ee7b7",
    condition: (stats: any) => stats.count >= 10,
  },
  {
    id: "dedicated",
    name: "Dedicated",
    icon: "flame",
    color: "#f59e0b",
    condition: (stats: any) => stats.count >= 25,
  },
  {
    id: "beast",
    name: "Beast",
    icon: "skull",
    color: "#ef4444",
    condition: (stats: any) => stats.count >= 50,
  },
  {
    id: "maniac",
    name: "Maniac",
    icon: "nuclear",
    color: "#dc2626",
    condition: (stats: any) => stats.count >= 100,
  },
  {
    id: "legend",
    name: "Godlike",
    icon: "infinite",
    color: "#ffd700",
    condition: (stats: any) => stats.count >= 200,
  },

  // --- STRENGTH TRACK (Heavy Lifting) ---
  {
    id: "100kg",
    name: "100kg Club",
    icon: "barbell",
    color: "#60a5fa",
    condition: (stats: any) => stats.maxWeight >= 100,
  },
  {
    id: "140kg",
    name: "3 Plates",
    icon: "disc",
    color: "#8b5cf6",
    condition: (stats: any) => stats.maxWeight >= 140,
  }, // Classic 315lbs
  {
    id: "180kg",
    name: "4 Plates",
    icon: "layers",
    color: "#c084fc",
    condition: (stats: any) => stats.maxWeight >= 180,
  }, // Classic 405lbs
  {
    id: "220kg",
    name: "Monster",
    icon: "hardware-chip",
    color: "#f472b6",
    condition: (stats: any) => stats.maxWeight >= 220,
  },
  {
    id: "300kg",
    name: "HERCULES",
    icon: "thunderstorm",
    color: "#fbbf24",
    condition: (stats: any) => stats.maxWeight >= 300,
  },

  // --- EXTRAS ---
  {
    id: "weekend",
    name: "No Days Off",
    icon: "calendar",
    color: "#10b981",
    condition: (stats: any) => stats.hasWeekendWorkout,
  },
];

export default function BadgeGrid({
  stats,
}: {
  stats: { count: number; maxWeight: number; hasWeekendWorkout: boolean };
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TROPHY CASE 🏆</Text>
        <Text style={styles.subtitle}>
          {stats.count} Workouts • Max {stats.maxWeight}kg
        </Text>
      </View>

      <View style={styles.grid}>
        {BADGES.map((badge) => {
          const isUnlocked = badge.condition(stats);
          return (
            <View
              key={badge.id}
              style={[styles.card, !isUnlocked && styles.lockedCard]}
            >
              <View
                style={[
                  styles.iconCircle,
                  isUnlocked
                    ? { backgroundColor: badge.color + "20" }
                    : { backgroundColor: "#222" },
                ]}
              >
                <Ionicons
                  name={badge.icon as any}
                  size={20}
                  color={isUnlocked ? badge.color : "#444"}
                />
              </View>
              <Text
                style={[styles.badgeName, !isUnlocked && { color: "#444" }]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  subtitle: { color: "#666", fontSize: 10, fontWeight: "bold" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  card: {
    width: "22%", // Fits 4 in a row nicely
    aspectRatio: 0.9,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 2,
  },
  lockedCard: {
    opacity: 0.5,
    borderColor: "#1A1A1A",
    backgroundColor: "#121212",
  },
  iconCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  badgeName: {
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
});
