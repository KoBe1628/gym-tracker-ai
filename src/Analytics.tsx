import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

function determineLevel(e1RM: number): AnalyticsRow["level"] {
  if (e1RM < 60) return "Novice";
  if (e1RM <= 100) return "Intermediate";
  return "Advanced";
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setData([]);
          return;
        }

        const { data: logs, error } = await supabase
          .from("workout_logs")
          .select(
            `
              id,
              weight_kg,
              reps,
              exercises!inner(name),
              workouts!inner(user_id)
            `,
          )
          .eq("workouts.user_id", user.id);

        if (error) {
          console.error("Failed to fetch strength standards", error);
          setData([]);
          return;
        }

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
            level: determineLevel(item.e1RM),
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
        <View style={styles.content}>
          <Text style={styles.title}>Strength Standards</Text>
          <Text style={styles.subtitle}>
            Mock strength targets based on estimated one-rep max.
          </Text>

          <View style={styles.list}>
            {data.map((item) => {
              const badgeStyle = LEVEL_STYLES[item.level];

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
                        {item.level.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
