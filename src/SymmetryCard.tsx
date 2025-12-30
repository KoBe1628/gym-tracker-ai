import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import { supabase } from "./lib/supabase";

// 🧠 LOGIC: Map 'slugs' to Push/Pull
// We use the slugs from your database screenshot (chest, lats, quads, etc.)
const MUSCLE_GROUPS: any = {
  push: [
    "chest",
    "shoulders",
    "triceps",
    "push",
    "quads",
    "calves",
    "abs",
    "anterior deltoid",
    "medial deltoid",
  ],
  pull: [
    "lats",
    "biceps",
    "pull",
    "hamstrings",
    "glutes",
    "traps",
    "lower_back",
    "posterior deltoid",
  ],
};

export default function SymmetryCard() {
  const [loading, setLoading] = useState(true);
  const [pushScore, setPushScore] = useState(50);
  const [pullScore, setPullScore] = useState(50);
  const [message, setMessage] = useState("Analyzing...");
  const [totalSets, setTotalSets] = useState(0);

  useEffect(() => {
    calculateSymmetry();
  }, []);

  async function calculateSymmetry() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch History WITH PROPER JOINS
    // ⚠️ FIX: We added 'workouts!inner(user_id)' to the select.
    // We also fetch 'group_name' and 'slug' from muscles to make our life easier.
    const { data: logs, error } = await supabase
      .from("workout_logs")
      .select(
        `
        reps, weight_kg,
        exercises!inner ( 
            muscles ( name, slug, group_name ) 
        ),
        workouts!inner ( user_id )
      `
      )
      .eq("workouts.user_id", user.id);

    if (error) {
      console.log("Symmetry Error:", error.message);
    }

    if (!logs || logs.length === 0) {
      setMessage("Start logging to see your stats.");
      setLoading(false);
      return;
    }

    // 2. Calculate Totals
    let pushVol = 0;
    let pullVol = 0;
    let validLogs = 0;

    logs.forEach((log: any) => {
      const muscleData = log.exercises?.muscles;
      if (!muscleData) return;

      const slug = muscleData.slug?.toLowerCase().trim();
      const group = muscleData.group_name; // 'Push', 'Pull', 'Legs'

      const volume = (log.weight_kg || 0) * (log.reps || 0);

      // STRATEGY 1: Trust your database 'group_name' if it says Push/Pull explicitly
      if (group === "Push") {
        pushVol += volume;
        validLogs++;
        return;
      }
      if (group === "Pull") {
        pullVol += volume;
        validLogs++;
        return;
      }

      // STRATEGY 2: Fallback to Slugs (For 'Legs' or unlabeled muscles)
      // Usually Quads/Calves = Push mechanism (Extension)
      // Hamstrings/Glutes = Pull mechanism (Flexion/Hinge)
      if (MUSCLE_GROUPS.push.includes(slug)) {
        pushVol += volume;
        validLogs++;
      } else if (MUSCLE_GROUPS.pull.includes(slug)) {
        pullVol += volume;
        validLogs++;
      }
    });

    // 3. Update State
    setTotalSets(validLogs);

    const total = pushVol + pullVol;
    if (total === 0) {
      setMessage("Not enough classified data yet.");
      setLoading(false);
      return;
    }

    const pushPct = Math.round((pushVol / total) * 100);
    const pullPct = 100 - pushPct;

    setPushScore(pushPct);
    setPullScore(pullPct);

    // 4. Generate AI Feedback
    if (pushPct > 55) {
      setMessage("⚠️ Push Dominant. Add more Rows/Deadlifts.");
    } else if (pullPct > 55) {
      setMessage("⚠️ Pull Dominant. Don't forget to Press!");
    } else {
      setMessage("⚖️ Perfectly Balanced. Great structure.");
    }

    setLoading(false);
  }

  if (loading) return <ActivityIndicator size="small" color="#bef264" />;

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={styles.title}>PHYSIQUE SYMMETRY ⚖️</Text>
        <Text style={{ color: "#666", fontSize: 10 }}>
          {totalSets > 0 ? `${totalSets} Sets` : ""}
        </Text>
      </View>

      {/* The Bar */}
      <View style={styles.barContainer}>
        {/* Push Side */}
        <View
          style={[
            styles.barSegment,
            {
              flex: pushScore,
              backgroundColor: "#EF4444",
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
            },
          ]}
        >
          <Text style={styles.barLabel}>{pushScore}% PUSH</Text>
        </View>

        {/* Separator Line */}
        <View style={{ width: 2, backgroundColor: "#121212" }} />

        {/* Pull Side */}
        <View
          style={[
            styles.barSegment,
            {
              flex: pullScore,
              backgroundColor: "#3B82F6",
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
            },
          ]}
        >
          <Text style={styles.barLabel}>{pullScore}% PULL</Text>
        </View>
      </View>

      {/* The AI Advice */}
      <View style={styles.feedbackBox}>
        <Text style={styles.feedbackText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 30, width: "100%" },
  title: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: 1,
  },

  barContainer: {
    flexDirection: "row",
    height: 35,
    width: "100%",
    marginBottom: 10,
  },
  barSegment: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  barLabel: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
  },

  feedbackBox: {
    backgroundColor: "#27272a",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#bef264",
  },
  feedbackText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontStyle: "italic",
  },
});
