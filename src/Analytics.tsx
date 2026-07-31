import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import { supabase } from "./lib/supabase";

type AnalyticsRow = {
  id: string;
  name: string;
  e1RM: number;
  level: "Novice" | "Intermediate" | "Advanced";
};

const LEVEL_STYLES = {
  Novice: { backgroundColor: "#166534", color: "#bbf7d0" },
  Intermediate: { backgroundColor: "#92400e", color: "#fde68a" },
  Advanced: { backgroundColor: "#7f1d1d", color: "#fecaca" },
} as const;

type WorkoutLogRow = {
  id: string;
  created_at: string;
  weight_kg: number | string | null;
  reps: number | string | null;
  exercises?:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
};

type TrendPoint = {
  value: number;
  label: string;
};

function determineLevel(
  e1RM: number,
  userWeight: number | null,
): AnalyticsRow["level"] {
  if (!userWeight) {
    if (e1RM < 60) return "Novice";
    if (e1RM <= 100) return "Intermediate";
    return "Advanced";
  }

  const ratio = e1RM / userWeight;

  if (ratio < 1.0) return "Novice";
  if (ratio < 1.5) return "Intermediate";
  return "Advanced";
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userWeight, setUserWeight] = useState<number | null>(null);
  const [rawLogs, setRawLogs] = useState<WorkoutLogRow[]>([]);
  const { width } = useWindowDimensions();

  const trendSeries = useMemo(() => {
    const getExerciseName = (log: WorkoutLogRow) => {
      if (Array.isArray(log.exercises)) {
        return log.exercises[0]?.name?.trim() || "Unknown Exercise";
      }

      return log.exercises?.name?.trim() || "Unknown Exercise";
    };

    if (rawLogs.length === 0) {
      return {
        topExerciseName: "",
        chartData: [] as TrendPoint[],
      };
    }

    const exerciseCounts = new Map<string, number>();

    rawLogs.forEach((log) => {
      const exerciseName = getExerciseName(log);
      exerciseCounts.set(
        exerciseName,
        (exerciseCounts.get(exerciseName) ?? 0) + 1,
      );
    });

    let topExerciseName = "";
    let topExerciseCount = 0;

    exerciseCounts.forEach((count, exerciseName) => {
      if (count > topExerciseCount) {
        topExerciseName = exerciseName;
        topExerciseCount = count;
      }
    });

    const chartData = rawLogs
      .filter((log) => getExerciseName(log) === topExerciseName)
      .slice()
      .sort(
        (left, right) =>
          new Date(left.created_at).getTime() -
          new Date(right.created_at).getTime(),
      )
      .map((log) => {
        const weight = Number(log.weight_kg) || 0;
        const reps = Number(log.reps) || 0;
        const e1RM = Math.round(weight * (1 + reps / 30));
        const date = new Date(log.created_at);
        const label = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
          date.getDate(),
        ).padStart(2, "0")}`;

        return {
          value: e1RM,
          label,
        };
      });

    return {
      topExerciseName,
      chartData,
    };
  }, [rawLogs]);

  const chartWidth = Math.max(width - 40, 260);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setData([]);
          setUserWeight(null);
          return;
        }

        const [
          { data: logs, error: logsError },
          { data: profile, error: profileError },
        ] = await Promise.all([
          supabase
            .from("workout_logs")
            .select(
              `
              id,
              created_at,
              weight_kg,
              reps,
              exercises!inner(name),
              workouts!inner(user_id)
            `,
            )
            .eq("workouts.user_id", user.id),
          supabase
            .from("profiles")
            .select("bodyweight")
            .eq("id", user.id)
            .single(),
        ]);

        if (profileError) {
          console.error("Failed to fetch user bodyweight", profileError);
          setUserWeight(null);
        } else {
          const parsedWeight = Number(profile?.bodyweight);
          setUserWeight(
            Number.isFinite(parsedWeight) && parsedWeight > 0
              ? parsedWeight
              : null,
          );
        }

        if (logsError) {
          console.error("Failed to fetch strength standards", logsError);
          setRawLogs([]);
          setData([]);
          return;
        }

        setRawLogs((logs || []) as unknown as WorkoutLogRow[]);

        const groupedByExercise = new Map<
          string,
          { id: string; name: string; e1RM: number }
        >();

        (logs || []).forEach((log: any) => {
          const name = log.exercises?.name || "Unknown Exercise";
          const weight = Number(log.weight_kg) || 0;
          const reps = Number(log.reps) || 0;
          const e1RM = weight * (1 + reps / 30);
          const existing = groupedByExercise.get(name);

          if (!existing || e1RM > existing.e1RM) {
            groupedByExercise.set(name, {
              id: String(log.id),
              name,
              e1RM,
            });
          }
        });

        const processed = Array.from(groupedByExercise.values())
          .map((item) => ({
            ...item,
            e1RM: Math.round(item.e1RM),
            level: determineLevel(item.e1RM, userWeight),
          }))
          .sort((a, b) => b.e1RM - a.e1RM);

        setData(processed);
      } catch (error) {
        console.error("Unexpected analytics fetch error", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (!isLoading && data.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={56} color="#666" />
          <Text style={styles.emptyText}>
            No workout data yet. Log a workout to see your strength standards!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#a3e635" size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Strength Standards</Text>
          <Text style={styles.subtitle}>
            Strength targets based on estimated one-rep max.
          </Text>

          {trendSeries.chartData.length > 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                1RM Trend: {trendSeries.topExerciseName}
              </Text>
              <LineChart
                data={trendSeries.chartData}
                width={chartWidth}
                color="#a3e635"
                thickness={3}
                hideRules
                hideDataPoints
                yAxisTextStyle={{ color: "gray" }}
                xAxisLabelTextStyle={{ color: "gray", fontSize: 10 }}
                areaChart
                startFillColor="rgba(163, 230, 53, 0.22)"
                endFillColor="rgba(163, 230, 53, 0.02)"
                startOpacity={0.35}
                endOpacity={0.02}
                curved
                isAnimated
                noOfSections={4}
                spacing={Math.max(
                  (chartWidth - 48) /
                    Math.max(trendSeries.chartData.length - 1, 1),
                  36,
                )}
                initialSpacing={20}
                endSpacing={20}
              />
            </View>
          ) : null}

          <View style={styles.list}>
            {data.map((item) => {
              const level = determineLevel(item.e1RM, userWeight);
              const badgeStyle = LEVEL_STYLES[level];

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.liftName}>{item.name}</Text>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.e1rm}>{item.e1RM} kg</Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: badgeStyle.backgroundColor },
                      ]}
                    >
                      <Text
                        style={[styles.badgeText, { color: badgeStyle.color }]}
                      >
                        {level.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 18,
  },
  chartCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    overflow: "hidden",
  },
  chartTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  list: {
    marginTop: 4,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  liftName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  cardRight: {
    alignItems: "flex-end",
  },
  e1rm: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#121212",
  },
  emptyText: {
    color: "#888",
    marginTop: 12,
    textAlign: "center",
  },
});
