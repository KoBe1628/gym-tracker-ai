import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { supabase } from "./lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";

export default function WorkoutSummary({
  visible,
  workoutId,
  onClose,
  themeColor = "#bef264", // 🆕 Add Prop with default
}: {
  visible: boolean;
  workoutId: number | null;
  onClose: () => void;
  themeColor?: string; // 🆕 Type definition
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    duration: "0m",
    volume: 0,
    sets: 0,
    exercises: 0,
  });

  // Confetti trigger
  const [shootConfetti, setShootConfetti] = useState(false);

  useEffect(() => {
    if (visible && workoutId) {
      fetchStats();
      setShootConfetti(true);
    }
  }, [visible, workoutId]);

  async function fetchStats() {
    setLoading(true);

    // 1. Get Workout Details (Start Time)
    const { data: workout } = await supabase
      .from("workouts")
      .select("started_at, ended_at")
      .eq("id", workoutId)
      .single();

    // 2. Get Logs (Volume & Sets)
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("weight_kg, reps, exercise_id")
      .eq("workout_id", workoutId);

    if (workout && logs) {
      // 🕒 A. Calculate Duration (With Sanity Check)
      const start = new Date(workout.started_at).getTime();
      const end = new Date(workout.ended_at || new Date()).getTime();
      const diffMs = end - start;

      let displayTime = "0m";

      // 🚨 SANITY CHECK: If > 12 hours, assume user forgot to finish.
      if (diffMs > 1000 * 60 * 60 * 12) {
        displayTime = "Not Recorded";
      } else {
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) displayTime = `${hours}h ${minutes}m`;
        else displayTime = `${minutes}m`;
      }

      // B. Calculate Volume & Sets
      let vol = 0;
      const uniqueExercises = new Set();

      logs.forEach((l: any) => {
        vol += (l.weight_kg || 0) * (l.reps || 0);
        uniqueExercises.add(l.exercise_id);
      });

      setStats({
        duration: displayTime,
        volume: vol,
        sets: logs.length,
        exercises: uniqueExercises.size,
      });
    }
    setLoading(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 1. Header */}
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={60} color="#bef264" />
            <Text style={styles.title}>WORKOUT COMPLETE</Text>
            <Text style={styles.subtitle}>
              Great job! Here is your receipt.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#bef264" style={{ margin: 40 }} />
          ) : (
            <View style={styles.content}>
              {/* 2. The Grid */}
              <View style={styles.grid}>
                <View style={styles.statBox}>
                  <Text style={styles.label}>DURATION</Text>
                  <Text
                    style={[
                      styles.value,
                      { fontSize: stats.duration.length > 5 ? 14 : 20 },
                    ]}
                  >
                    {stats.duration}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.label}>SETS</Text>
                  <Text style={styles.value}>{stats.sets}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.label}>VOLUME</Text>
                  <Text style={styles.value}>
                    {(stats.volume / 1000).toFixed(1)}k{" "}
                    <Text style={{ fontSize: 12, color: "#666" }}>kg</Text>
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.label}>EXERCISES</Text>
                  <Text style={styles.value}>{stats.exercises}</Text>
                </View>
              </View>

              {/* 3. Decorative Receipt Line */}
              <View style={styles.dashedLine} />
              <Text style={styles.footerText}>KEEP SHOWING UP.</Text>
            </View>
          )}

          {/* 4. Action Button */}
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>DONE</Text>
          </TouchableOpacity>
        </View>

        {/* Confetti Explosion on Load */}
        {shootConfetti && (
          <ConfettiCannon
            count={200}
            origin={{ x: -10, y: 0 }}
            fadeOut={true}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#18181b",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  header: { alignItems: "center", marginBottom: 30 },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 15,
    letterSpacing: 1,
  },
  subtitle: { color: "#888", marginTop: 5 },

  content: { width: "100%", alignItems: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    gap: 15,
  },
  statBox: {
    width: "47%",
    backgroundColor: "#27272a",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  label: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    letterSpacing: 1,
  },
  value: { color: "white", fontSize: 20, fontWeight: "bold" },

  dashedLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#333",
    marginVertical: 25,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#444",
  },
  footerText: {
    color: "#bef264",
    fontWeight: "bold",
    letterSpacing: 2,
    fontSize: 10,
  },

  button: {
    marginTop: 30,
    backgroundColor: "#bef264",
    width: "100%",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: { color: "black", fontWeight: "900", fontSize: 16 },
});
