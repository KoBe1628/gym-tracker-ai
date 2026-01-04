import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "./lib/supabase";
import { Ionicons } from "@expo/vector-icons";

// 🎯 CONFIGURATION
const DEFAULT_TARGET = 20000; // 20,000 kg (Beginner/Intermediate Goal)

export default function WeeklyTarget() {
  const [currentVol, setCurrentVol] = useState(0);
  const [targetVol, setTargetVol] = useState(DEFAULT_TARGET);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyVolume();
  }, []);

  async function fetchWeeklyVolume() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Calculate Start of Week (Monday 00:00)
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    // 2. Fetch Logs since Monday
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("weight_kg, reps")
      .eq("workouts.user_id", user.id) // Filter by user via join
      .select("weight_kg, reps, workouts!inner(user_id)") // Filter properly
      .gte("created_at", monday.toISOString());

    // 3. Sum Volume
    let total = 0;
    logs?.forEach((log: any) => {
      total += (log.weight_kg || 0) * (log.reps || 0);
    });

    setCurrentVol(total);
    setLoading(false);
  }

  // Calculate Percentage for Bar Width (Cap at 100%)
  const percentage = Math.min(100, Math.round((currentVol / targetVol) * 100));

  // Dynamic Message
  const getMessage = () => {
    if (percentage >= 100) return "🔥 WEEK CRUSHED! GOAL MET.";
    if (percentage >= 75) return "💪 Almost there! One more session.";
    if (percentage >= 50) return "⚡ Halfway mark. Keep pushing.";
    return "📅 New week. Let's build momentum.";
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      {/* Header Text */}
      <View style={styles.header}>
        <Text style={styles.title}>WEEKLY VOLUME 📊</Text>
        <Text style={styles.volumeText}>
          <Text style={{ color: "white" }}>
            {(currentVol / 1000).toFixed(1)}k
          </Text>
          <Text style={{ color: "#666" }}>
            {" "}
            / {(targetVol / 1000).toFixed(0)}k kg
          </Text>
        </Text>
      </View>

      {/* Progress Bar Background */}
      <View style={styles.barBackground}>
        {/* Fill Bar */}
        <View style={[styles.barFill, { width: `${percentage}%` }]} />
      </View>

      {/* Motivational Subtext */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
      >
        <Ionicons
          name={percentage >= 100 ? "trophy" : "trending-up"}
          size={14}
          color={percentage >= 100 ? "#bef264" : "#A1A1AA"}
          style={{ marginRight: 5 }}
        />
        <Text
          style={[
            styles.subText,
            percentage >= 100 && { color: "#bef264", fontWeight: "bold" },
          ]}
        >
          {getMessage()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20, // Space below it
    borderWidth: 1,
    borderColor: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "#A1A1AA",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  volumeText: {
    fontSize: 14,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },

  // Bar Styles
  barBackground: {
    height: 12,
    backgroundColor: "#111",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#bef264", // Lime Green
    borderRadius: 6,
  },

  subText: {
    color: "#A1A1AA",
    fontSize: 12,
    fontStyle: "italic",
  },
});
