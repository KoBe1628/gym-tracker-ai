import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { supabase } from "./lib/supabase";

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
  const [muscleVolumes, setMuscleVolumes] = useState<Record<string, number>>(
    {}
  );
  const [recommendation, setRecommendation] = useState<string>("");
  const [userLevel, setUserLevel] = useState<string>("Beginner"); // Default to Beginner

  useEffect(() => {
    calculateData();
  }, []);

  async function calculateData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. NEW: Fetch User Profile to get their Experience Level
    const { data: profile } = await supabase
      .from("profiles")
      .select("experience_level")
      .eq("id", user.id)
      .single();

    const currentLevel = profile?.experience_level || "Beginner";
    setUserLevel(currentLevel);

    // 2. Fetch Logs (Same as before)
    const { data: logs } = await supabase
      .from("workout_logs")
      .select(
        `
        weight_kg, reps,
        exercises ( muscles ( slug ) ),
        workouts!inner ( user_id )
      `
      )
      .eq("workouts.user_id", user.id);

    const volumes: Record<string, number> = {};

    logs?.forEach((log: any) => {
      const muscleSlug = log.exercises?.muscles?.slug;
      if (muscleSlug) {
        const currentVolume = (log.weight_kg || 0) * (log.reps || 0);
        volumes[muscleSlug] = (volumes[muscleSlug] || 0) + currentVolume;
      }
    });

    setMuscleVolumes(volumes);
    // 3. Pass the User Level to the generator
    generateRecommendation(volumes, currentLevel);
  }

  // NEW: Refined Algorithm based on Experience
  function generateRecommendation(
    volumes: Record<string, number>,
    level: string
  ) {
    const muscles = ["chest", "lats", "biceps", "triceps", "quads"];
    let weakestMuscle = "";
    let minVol = Infinity;

    // Find weakest muscle
    for (const m of muscles) {
      const vol = volumes[m] || 0;
      if (vol < minVol) {
        minVol = vol;
        weakestMuscle = m;
      }
    }

    // SMART LOGIC: Different advice for Beginners vs Advanced
    if (level === "Beginner") {
      // Beginners need COMPOUND movements (Big basics)
      switch (weakestMuscle) {
        case "chest":
          setRecommendation("Builder Tip: Focus on Push Ups to build a base.");
          break;
        case "lats":
          setRecommendation(
            "Builder Tip: Assisted Pull Ups are your best friend."
          );
          break;
        case "quads":
          setRecommendation(
            "Builder Tip: Bodyweight Squats explicitly targeting depth."
          );
          break;
        default:
          setRecommendation(
            "Keep showing up! Consistency is key for new gains."
          );
      }
    } else {
      // Intermediates/Advanced get specific ISOLATION advice
      switch (weakestMuscle) {
        case "chest":
          setRecommendation(
            "Pro Tip: Try Incline Dumbbell Press for upper chest."
          );
          break;
        case "lats":
          setRecommendation(
            "Pro Tip: Heavy Barbell Rows will thicken that back."
          );
          break;
        case "biceps":
          setRecommendation("Pro Tip: Preacher Curls for peak contraction.");
          break;
        case "triceps":
          setRecommendation("Pro Tip: Skullcrushers to isolate the long head.");
          break;
        case "quads":
          setRecommendation("Pro Tip: Front Squats to emphasize the quads.");
          break;
        default:
          setRecommendation("Balanced physique. Time to increase the weight!");
      }
    }
  }

  const getColor = (slug: string) => {
    const vol = muscleVolumes[slug] || 0;
    if (vol > 1000) return "#ef4444"; // Tailwind Red-500
    if (vol > 500) return "#f97316"; // Tailwind Orange-500
    if (vol > 0) return "#22c55e"; // Tailwind Green-500
    return "#e5e7eb"; // Tailwind Gray-200
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Body Battery 🔋</Text>

      <Svg height="250" width="200" viewBox="0 0 360 400">
        {Object.entries(BODY_PATHS).map(([slug, pathData]) => (
          <Path
            key={slug}
            d={pathData}
            fill={getColor(slug)}
            stroke="black"
            strokeWidth="2"
          />
        ))}
        <Path
          d="M180 30 A 30 30 0 1 1 180 90 A 30 30 0 1 1 180 30 Z"
          fill="#ccc"
        />
      </Svg>

      <View style={styles.legendContainer}>
        <Text style={{ color: "#22c55e" }}>● Active</Text>
        <Text style={{ color: "#f97316" }}>● Building</Text>
        <Text style={{ color: "#ef4444" }}>● Intense</Text>
      </View>

      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>
          {userLevel === "Beginner" ? "🌱 Starter Coach" : "⚡ Pro Coach"}:
        </Text>
        <Text style={styles.tipText}>{recommendation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // CHANGED: Background transparent, removed shadow (cleaner look)
  container: {
    alignItems: "center",
    marginVertical: 10,
    backgroundColor: "transparent", // <--- This blends it!
    padding: 10,
  },
  // CHANGED: Title color to white
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 15,
    color: "white", // <--- Visible on dark bg
  },
  legendContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 10,
    marginBottom: 15,
  },
  // CHANGED: Tip container to be dark grey with a colored border
  tipContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "#1E1E1E", // Dark grey card
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#bef264", // Matches your Lime Green theme
  },
  tipTitle: {
    fontWeight: "bold",
    color: "#bef264",
    marginBottom: 5,
    fontSize: 14,
    textTransform: "uppercase",
  },
  tipText: {
    fontSize: 16,
    textAlign: "center",
    color: "#e5e7eb",
    fontStyle: "italic",
  },
});
