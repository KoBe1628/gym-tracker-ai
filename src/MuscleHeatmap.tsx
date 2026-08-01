import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Body, { type ExtendedBodyPart } from "react-native-body-highlighter";
import { supabase } from "./lib/supabase";

const RECOVERY_BODY_PARTS = [
  "chest",
  "upper-back",
  "biceps",
  "triceps",
  "quadriceps",
] as const;

function mapMuscleNameToBodySlug(muscleName: string | null | undefined) {
  const normalized = (muscleName || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "");

  switch (normalized) {
    case "chest":
    case "pec":
    case "pecs":
      return "chest";
    case "lat":
    case "lats":
    case "back":
    case "upperback":
    case "lowerback":
    case "traps":
    case "trapezius":
      return "upper-back";
    case "biceps":
    case "bicep":
      return "biceps";
    case "triceps":
    case "tricep":
      return "triceps";
    case "quad":
    case "quads":
    case "quadricep":
    case "quadriceps":
      return "quadriceps";
    case "deltoid":
    case "deltoids":
    case "shoulder":
    case "shoulders":
      return "deltoids";
    case "abs":
    case "abdominals":
      return "abs";
    case "glute":
    case "glutes":
    case "gluteal":
      return "gluteal";
    case "hamstring":
    case "hamstrings":
      return "hamstring";
    default:
      return null;
  }
}

function getRecoveryColor(intensity: number) {
  if (intensity > 0.5) return "#ef4444";
  if (intensity > 0) return "#facc15";
  return "#bfdbfe";
}

export default function MuscleHeatmap() {
  const [muscleHeat, setMuscleHeat] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState<string>("");
  const [userLevel, setUserLevel] = useState<string>("Beginner");

  const recoveryData = useMemo<ExtendedBodyPart[]>(() => {
    return RECOVERY_BODY_PARTS.map((slug) => ({
      slug,
      color: getRecoveryColor(muscleHeat[slug] || 0),
    }));
  }, [muscleHeat]);

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
        exercises ( muscles ( slug, name ) )
      `,
      )
      .order("created_at", { ascending: false }); // Newest first
    // .eq("workouts.user_id", user.id); // Add this if you set up the join correctly, or rely on RLS

    // 3. 🧠 THE NEW LOGIC: Calculate Decay (48 Hour Rule)
    const now = new Date().getTime();
    const heatMap: Record<string, number> = {};
    const processedMuscles = new Set(); // Track which muscles we already found (only newest matters)

    logs?.forEach((log: any) => {
      const muscleSlug = mapMuscleNameToBodySlug(
        log.exercises?.muscles?.slug || log.exercises?.muscles?.name,
      );
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
    const muscles = ["chest", "upper-back", "biceps", "triceps", "quadriceps"];
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
        case "upper-back":
          setRecommendation("Back is fresh. Go for Pull Ups.");
          break;
        case "quadriceps":
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
        case "upper-back":
          setRecommendation("Lats are cold. heavy Rows will fix that.");
          break;
        case "biceps":
          setRecommendation("Arms are fresh. Isolation time.");
          break;
        case "triceps":
          setRecommendation("Triceps recovered. Heavy Dips?");
          break;
        case "quadriceps":
          setRecommendation("Quads represent. Front Squat time.");
          break;
        default:
          setRecommendation("Full recovery achieved. Go heavy.");
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MUSCLE RECOVERY 🔋</Text>

      <View style={styles.bodyContainer}>
        <Body scale={1.2} side="front" gender="male" data={recoveryData} />
      </View>

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
          <View style={[styles.dot, { backgroundColor: "#bfdbfe" }]} />
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

  bodyContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
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
