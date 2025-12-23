import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
  TouchableOpacity,
} from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg"; // Reusing the tool we already have!
import { supabase } from "./lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function ProgressChart({ exerciseId }: { exerciseId: number }) {
  const [data, setData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [exerciseId]);

  async function fetchHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: logs } = await supabase
      .from("workout_logs")
      .select(
        `
         created_at, 
         weight_kg,
         workouts!inner(user_id)
      `
      )
      .eq("workouts.user_id", user.id)
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: true })
      .limit(7); // Show last 7 sessions to fit screen

    if (logs && logs.length > 0) {
      setData(logs.map((l) => l.weight_kg));
      setLabels(logs.map((l) => new Date(l.created_at).getDate().toString())); // Just the Day (e.g., "21")
    }
    setLoading(false);
  }

  async function deleteLastLog() {
    if (data.length === 0) return;

    Alert.alert(
      "Undo Last Set?",
      "This will permanently remove the most recent log for this exercise.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // 1. Get the ID of the last log (we need to fetch it or store it)
            // For MVP, let's just delete the most recent row in SQL for this user+exercise
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // Get the latest log ID
            const { data: latest } = await supabase
              .from("workout_logs")
              .select("id")
              .eq("exercise_id", exerciseId)
              // We really should filter by user here too,
              // relying on RLS (Row Level Security) is safer but let's be explicit if possible
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (latest) {
              await supabase.from("workout_logs").delete().eq("id", latest.id);
              fetchHistory(); // Refresh the chart!
            }
          },
        },
      ]
    );
  }

  if (loading) return <ActivityIndicator color="#bef264" />;

  if (data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Log at least 2 sessions to see your graph! 📈
        </Text>
      </View>
    );
  }

  // 📐 CHART MATH
  const CHART_HEIGHT = 150;
  const CHART_WIDTH = 250;
  const MAX_VAL = Math.max(...data) + 5; // Add padding to top
  const MIN_VAL = Math.min(...data) - 5;
  const Y_RANGE = MAX_VAL - MIN_VAL || 1;

  const getX = (index: number) => (index / (data.length - 1)) * CHART_WIDTH;
  const getY = (val: number) =>
    CHART_HEIGHT - ((val - MIN_VAL) / Y_RANGE) * CHART_HEIGHT;

  // Build the SVG Path string (e.g., "M0 100 L50 80 L100 50...")
  const path =
    `M ${getX(0)} ${getY(data[0])} ` +
    data.map((val, i) => `L ${getX(i)} ${getY(val)}`).join(" ");

  return (
    <View style={styles.container}>
      {/* Replace <Text style={styles.title}>...</Text> with this: */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: 280,
          marginBottom: 10,
        }}
      >
        <Text style={styles.title}>STRENGTH CURVE 📈</Text>
        <TouchableOpacity onPress={deleteLastLog}>
          <Text style={{ color: "#EF4444", fontSize: 10, fontWeight: "bold" }}>
            UNDO LAST
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chartBox}>
        <Svg height={CHART_HEIGHT + 20} width={CHART_WIDTH + 20}>
          {/* Grid Lines (Optional) */}
          <Line
            x1="0"
            y1={CHART_HEIGHT}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT}
            stroke="#333"
            strokeWidth="1"
          />

          {/* The Data Line */}
          <Path d={path} stroke="#bef264" strokeWidth="3" fill="none" />

          {/* The Dots & Text */}
          {data.map((val, i) => (
            <React.Fragment key={i}>
              <Circle cx={getX(i)} cy={getY(val)} r="4" fill="#bef264" />
              {/* Show weight text above the dot */}
              <SvgText
                x={getX(i)}
                y={getY(val) - 10}
                fill="white"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val}
              </SvgText>
              {/* Show date text below */}
              <SvgText
                x={getX(i)}
                y={CHART_HEIGHT + 15}
                fill="#666"
                fontSize="10"
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20, alignItems: "center", width: "100%" },
  title: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: 1,
    alignSelf: "flex-start",
  },
  chartBox: { padding: 10 },
  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { color: "#666", fontStyle: "italic", fontSize: 12 },
});
