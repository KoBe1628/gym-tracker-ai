import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { supabase } from "./lib/supabase";

// 🦴 1. VISUALS: Keep your nice muscle shapes
const BODY_PATHS = {
  chest:
    "M100 80 Q130 110 160 80 L160 130 Q130 150 100 130 Z M200 80 Q230 110 260 80 L260 130 Q230 150 200 130 Z",
  lats: "M80 140 L100 130 L100 220 L80 200 Z M260 130 L280 140 L280 200 L260 220 Z",
  biceps:
    "M70 120 L50 120 L50 160 L70 160 Z M290 120 L310 120 L310 160 L290 160 Z",
  triceps:
    "M50 120 L30 120 L30 160 L50 160 Z M310 120 L330 120 L330 160 L310 160 Z",
  quads:
    "M110 240 L160 240 L150 350 L120 350 Z M200 240 L250 240 L240 350 L210 350 Z",
};

export default function MuscleHeatmap() {
  const [muscleHeat, setMuscleHeat] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState<string>("");
  const [userLevel, setUserLevel] = useState<string>("Beginner");

  useEffect(() => {
    calculateRecovery();
  }, []);

  async function calculateRecovery() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch Profile for Level (Keep your Smart Coach logic)
    const { data: profile } = await supabase
      .from("profiles")
      .select("experience_level")
      .eq("id", user.id)
      .single();

    const currentLevel = profile?.experience_level || "Beginner";
    setUserLevel(currentLevel);

    // 2. Fetch Logs WITH TIMESTAMP (Crucial for decay)
    const { data: logs } = await supabase
      .from("workout_logs")
      .select(
        `
        created_at,
        exercises ( muscles ( slug ) )
      `
      )
      .order("created_at", { ascending: false }); // Newest first
    // .eq("workouts.user_id", user.id); // Add this if you set up the join correctly, or rely on RLS

    // 3. 🧠 THE NEW LOGIC: Calculate Decay (48 Hour Rule)
    const now = new Date().getTime();
    const heatMap: Record<string, number> = {};
    const processedMuscles = new Set(); // Track which muscles we already found (only newest matters)

    logs?.forEach((log: any) => {
      const muscleSlug = log.exercises?.muscles?.slug;
      if (!muscleSlug || processedMuscles.has(muscleSlug)) return;

      const logTime = new Date(log.created_at).getTime();
      const hoursDiff = (now - logTime) / (1000 * 60 * 60);

      // Formula: 1.0 intensity at 0h, 0.0 intensity at 48h
      if (hoursDiff < 48) {
        heatMap[muscleSlug] = 1 - hoursDiff / 48;
        processedMuscles.add(muscleSlug); // We found the most recent workout for this muscle
      }
    });

    setMuscleHeat(heatMap);
    generateRecommendation(heatMap, currentLevel);
  }

  // 4. SMART COACH (Updated to use Heat instead of Volume)
  function generateRecommendation(heat: Record<string, number>, level: string) {
    // Find the "Coldest" muscle (Lowest intensity)
    const muscles = ["chest", "lats", "biceps", "triceps", "quads"];
    let coldestMuscle = "";
    let minHeat = Infinity;

    for (const m of muscles) {
      const h = heat[m] || 0;
      if (h < minHeat) {
        minHeat = h;
        coldestMuscle = m;
      }
    }

    // Give advice based on what is recovered (Cold)
    if (level === "Beginner") {
      switch (coldestMuscle) {
        case "chest":
          setRecommendation("Chest is recovered. Ready for Push Ups?");
          break;
        case "lats":
          setRecommendation("Back is fresh. Go for Pull Ups.");
          break;
        case "quads":
          setRecommendation("Legs are rested. Squat day?");
          break;
        default:
          setRecommendation("You are consistent! Keep it up.");
      }
    } else {
      switch (coldestMuscle) {
        case "chest":
          setRecommendation("Chest is prime. Hit Incline Bench today.");
          break;
        case "lats":
          setRecommendation("Lats are cold. heavy Rows will fix that.");
          break;
        case "biceps":
          setRecommendation("Arms are fresh. Isolation time.");
          break;
        case "triceps":
          setRecommendation("Triceps recovered. Heavy Dips?");
          break;
        case "quads":
          setRecommendation("Quads represent. Front Squat time.");
          break;
        default:
          setRecommendation("Full recovery achieved. Go heavy.");
      }
    }
  }

  // 5. COLOR LOGIC (Heat based)
  const getColor = (slug: string) => {
    const intensity = muscleHeat[slug] || 0;

    // Interpolate between Grey -> Yellow -> Red
    // Simple version:
    if (intensity > 0.6) return "#ef4444"; // HOT (Red) - Recently trained
    if (intensity > 0.2) return "#facc15"; // WARM (Yellow) - Recovering
    return "#374151"; // COLD (Dark Grey) - Fully Recovered
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MUSCLE RECOVERY 🔋</Text>

      <Svg height="250" width="200" viewBox="0 0 360 400">
        {/* Draw the Body */}
        {Object.entries(BODY_PATHS).map(([slug, pathData]) => (
          <Path
            key={slug}
            d={pathData}
            fill={getColor(slug)}
            stroke="black"
            strokeWidth="2"
            opacity={0.9}
          />
        ))}
        {/* Head (Decorative) */}
        <Path
          d="M180 30 A 30 30 0 1 1 180 90 A 30 30 0 1 1 180 30 Z"
          fill="#555"
        />
      </Svg>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
          <Text style={styles.legendText}>Sore (0-24h)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#facc15" }]} />
          <Text style={styles.legendText}>Recovering</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#374151" }]} />
          <Text style={styles.legendText}>Ready</Text>
        </View>
      </View>

      {/* Coach Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>
          {userLevel === "Beginner" ? "🌱 Smart Coach" : "⚡ Pro Coach"}:
        </Text>
        <Text style={styles.tipText}>{recommendation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 10,
    backgroundColor: "transparent",
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
    color: "#A1A1AA",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  legendContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 10,
    marginBottom: 15,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#888", fontSize: 10, fontWeight: "bold" },

  tipContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#bef264",
  },
  tipTitle: {
    fontWeight: "bold",
    color: "#bef264",
    marginBottom: 5,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tipText: {
    fontSize: 14,
    textAlign: "center",
    color: "#e5e7eb",
    fontStyle: "italic",
  },
});
