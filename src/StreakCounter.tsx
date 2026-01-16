import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "./lib/supabase";

export default function StreakCounter() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStreak();
  }, []);

  async function calculateStreak() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get all workout dates, newest first
    const { data } = await supabase
      .from("workouts")
      .select("started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (!data || data.length === 0) {
      setStreak(0);
      setLoading(false);
      return;
    }

    // 2. Convert to unique "Week Strings" (e.g., "2024-W05")
    const uniqueWeeks = new Set<string>();
    data.forEach((w) => {
      const date = new Date(w.started_at);
      const year = date.getFullYear();
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor(
        (date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000)
      );
      const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
      uniqueWeeks.add(`${year}-W${weekNum}`);
    });

    const sortedWeeks = Array.from(uniqueWeeks).sort().reverse(); // Newest weeks first

    // 3. Count Consecutive Weeks
    let currentStreak = 0;

    // Get current week string
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    );
    const currentWeekNum = Math.ceil((now.getDay() + 1 + days) / 7);
    const currentWeekStr = `${now.getFullYear()}-W${currentWeekNum}`;

    // Helper to get previous week string
    const getPrevWeek = (weekStr: string) => {
      const [y, w] = weekStr.split("-W").map(Number);
      if (w === 1) return `${y - 1}-W${52}`; // Rough fallback, works for simple logic
      return `${y}-W${w - 1}`;
    };

    // Logic: Does the user have a log for THIS week or LAST week?
    // If they haven't lifted this week yet, but lifted last week, streak is still alive.
    const hasThisWeek = sortedWeeks.includes(currentWeekStr);
    const lastWeekStr = getPrevWeek(currentWeekStr);
    const hasLastWeek = sortedWeeks.includes(lastWeekStr);

    if (!hasThisWeek && !hasLastWeek) {
      setStreak(0); // Streak broken
      setLoading(false);
      return;
    }

    // Start counting
    let checkWeek = hasThisWeek ? currentWeekStr : lastWeekStr;

    while (sortedWeeks.includes(checkWeek)) {
      currentStreak++;
      checkWeek = getPrevWeek(checkWeek);
    }

    setStreak(currentStreak);
    setLoading(false);
  }

  if (loading) return null;
  if (streak === 0) return null; // Don't show anything if no streak

  // 🔥 Blue Flame for massive streaks (>10 weeks)
  const isGodMode = streak >= 10;
  const flameColor = isGodMode ? "#60a5fa" : "#ef4444"; // Blue vs Red

  return (
    <View style={styles.container}>
      <Ionicons name="flame" size={18} color={flameColor} />
      <Text style={[styles.text, { color: flameColor }]}>
        {streak} <Text style={{ fontSize: 10, color: "#888" }}>WKS</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    gap: 4,
  },
  text: {
    fontWeight: "900",
    fontSize: 14,
    fontVariant: ["tabular-nums"], // Keeps numbers monospaced so they don't jitter
  },
});
