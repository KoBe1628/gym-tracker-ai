import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-gifted-charts"; // Or your custom SVG if you stuck with that
import { supabase } from "./lib/supabase";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg"; // Custom SVG imports

// 🎨 THEME
const THEME = {
  bg: "#121212",
  card: "#1E1E1E",
  primary: "#bef264",
  text: "#FFFFFF",
  textDim: "#A1A1AA",
  danger: "#EF4444",
};

export default function ProgressChart({ exerciseId }: { exerciseId: number }) {
  const [rawLogs, setRawLogs] = useState<any[]>([]); // 📝 Store full DB rows here
  const [chartData, setChartData] = useState<any[]>([]); // 📈 Store formatted points here
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [exerciseId]);

  async function fetchHistory() {
    // 1. Fetch RAW data (Include 'note', 'reps', 'created_at', 'tags')
    const { data: logs, error } = await supabase
      .from("workout_logs")
      .select("id, created_at, weight_kg, reps, note, tags")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: true }); // Oldest first for the Chart

    if (error || !logs || logs.length === 0) {
      setLoading(false);
      return;
    }

    // 2. Save RAW logs for the List (We reverse them so newest is at the top of the list)
    setRawLogs([...logs].reverse());

    // 3. Format data for the Chart (Keep your existing logic here)
    // We Map: { value: 100, label: '12/22' }
    const formatted = logs.map((log) => {
      const date = new Date(log.created_at);
      return {
        value: log.weight_kg,
        label: `${date.getDate()}`, // Just the day number
        dataPointText: `${log.weight_kg}`,
      };
    });
    setChartData(formatted);
    setLoading(false);
  }

  // Helper for Custom Chart (If you are using the SVG version)
  const renderCustomChart = () => {
    if (chartData.length < 2)
      return (
        <Text style={{ color: "#666", marginTop: 20 }}>
          Log more sets to see progress.
        </Text>
      );

    const height = 150;
    const width = 280;
    const maxVal = Math.max(...chartData.map((d) => d.value)) * 1.1;
    const points = chartData
      .map((d, i) => {
        const x = (i / (chartData.length - 1)) * width;
        const y = height - (d.value / maxVal) * height;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <View style={{ height, width, marginTop: 20 }}>
        <Svg height={height} width={width + 20}>
          {/* The Line */}
          <Polyline
            points={points}
            fill="none"
            stroke={THEME.primary}
            strokeWidth="3"
          />
          {/* The Dots & Labels */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * width;
            const y = height - (d.value / maxVal) * height;
            return (
              <React.Fragment key={i}>
                <Circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={THEME.bg}
                  stroke={THEME.primary}
                  strokeWidth="2"
                />
                <SvgText
                  x={x}
                  y={y - 10}
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {d.value}
                </SvgText>
                <SvgText
                  x={x}
                  y={height + 15}
                  fill="#666"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: 10,
        }}
      >
        <Text style={styles.title}>STRENGTH CURVE 📈</Text>
        {/* Simple "Undo" placeholder - logic is in parent or add callback here */}
        <Text style={{ color: THEME.danger, fontSize: 10, fontWeight: "bold" }}>
          UNDO LAST
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={THEME.primary} />
      ) : (
        renderCustomChart()
      )}

      {/* 📝 RECENT HISTORY LIST */}
      <View style={{ marginTop: 30, width: "100%" }}>
        <Text
          style={{
            color: "#A1A1AA",
            fontSize: 10,
            fontWeight: "bold",
            marginBottom: 10,
            letterSpacing: 1,
          }}
        >
          FULL HISTORY
        </Text>

        {/* 🔄 CHANGED: Removed .slice(0, 3) so it shows EVERYTHING */}
        {rawLogs.map((log: any, index: number) => (
          <View key={index} style={styles.logRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 12 }}
              >
                {new Date(log.created_at).toLocaleDateString()}
              </Text>

              {/* TAG BADGES */}
              {log.tags && log.tags.length > 0 && (
                <View style={{ flexDirection: "row", gap: 5, marginTop: 4 }}>
                  {log.tags.map((t: string) => {
                    let color = "#444";
                    if (t === "Warm Up") color = "#eab308";
                    if (t === "Failure") color = "#ef4444";
                    if (t === "Drop Set") color = "#3b82f6";

                    return (
                      <View
                        key={t}
                        style={{
                          backgroundColor: color,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 8,
                            color: "black",
                            fontWeight: "bold",
                          }}
                        >
                          {t.toUpperCase()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Note */}
              {log.note ? (
                <Text style={styles.noteText}>"{log.note}"</Text>
              ) : null}
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "white", fontWeight: "bold" }}>
                {log.weight_kg}{" "}
                <Text style={{ fontSize: 10, color: "#666" }}>kg</Text>
              </Text>
              <Text style={{ color: "#666", fontSize: 10 }}>
                {log.reps} reps
              </Text>
            </View>
          </View>
        ))}

        {rawLogs.length === 0 && (
          <Text style={{ color: "#444", fontStyle: "italic", marginTop: 10 }}>
            No history yet.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", width: "100%", marginBottom: 20 },
  title: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 12,
  },
  noteText: {
    color: THEME.primary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
    opacity: 0.9,
  },
});
