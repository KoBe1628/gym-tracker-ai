import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "./lib/supabase";

// 🛡️ RANK CONFIGURATION
const RANKS = [
  {
    name: "RUST RECRUIT",
    threshold: 0,
    color: "#cd7f32",
    icon: "shield-outline",
  }, // Bronze
  {
    name: "IRON SOLDIER",
    threshold: 10000,
    color: "#9ca3af",
    icon: "shield-half",
  }, // Silver
  {
    name: "STEEL WARLORD",
    threshold: 100000,
    color: "#ffd700",
    icon: "shield",
  }, // Gold
  {
    name: "TITANIUM GOD",
    threshold: 1000000,
    color: "#22d3ee",
    icon: "diamond",
  }, // Cyan
];

export default function IronRank() {
  const [volume, setVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLifetimeVolume();
  }, []);

  async function fetchLifetimeVolume() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch ALL logs (Note: For massive scale, this should be a DB function, but this works for now)
    const { data } = await supabase
      .from("workout_logs")
      .select("weight_kg, reps, workouts!inner(user_id)")
      .eq("workouts.user_id", user.id);

    let total = 0;
    data?.forEach((log: any) => {
      total += (log.weight_kg || 0) * (log.reps || 0);
    });

    setVolume(total);
    setLoading(false);
  }

  // 🧮 Determine Rank Logic
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (volume >= RANKS[i].threshold) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || null; // Null if max rank
      break;
    }
  }

  // Calculate Progress %
  let progress = 0;
  let label = "MAX RANK REACHED";

  if (nextRank) {
    const range = nextRank.threshold - currentRank.threshold;
    const current = volume - currentRank.threshold;
    progress = Math.min(100, Math.round((current / range) * 100));
    label = `${(nextRank.threshold - volume).toLocaleString()}kg to ${
      nextRank.name
    }`;
  } else {
    progress = 100;
  }

  if (loading) return <ActivityIndicator color="#bef264" />;

  return (
    <View style={[styles.container, { borderColor: currentRank.color }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons
            name={currentRank.icon as any}
            size={24}
            color={currentRank.color}
          />
        </View>
        <View>
          <Text style={styles.label}>CURRENT RANK</Text>
          <Text style={[styles.rankTitle, { color: currentRank.color }]}>
            {currentRank.name}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={styles.volumeText}>
            {(volume / 1000).toFixed(1)}k<Text style={styles.unit}> kg</Text>
          </Text>
          <Text style={styles.lifetimeLabel}>LIFETIME VOLUME</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${progress}%`, backgroundColor: currentRank.color },
          ]}
        />
      </View>

      <Text style={styles.nextRankLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 15,
  },
  iconBox: {
    width: 45,
    height: 45,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  rankTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  volumeText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  unit: {
    fontSize: 12,
    color: "#666",
  },
  lifetimeLabel: {
    color: "#666",
    fontSize: 8,
    fontWeight: "bold",
    marginTop: 2,
  },
  progressContainer: {
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  nextRankLabel: {
    color: "#888",
    fontSize: 10,
    fontStyle: "italic",
    textAlign: "right",
  },
});
