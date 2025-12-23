import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
} from "react-native";
import { supabase } from "./lib/supabase";
import { Calendar } from "react-native-calendars"; // 🗓️ The new library

const THEME = {
  bg: "#121212",
  card: "#1E1E1E",
  primary: "#bef264",
  text: "#FFFFFF",
  textDim: "#A1A1AA",
  danger: "#EF4444",
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [workoutCount, setWorkoutCount] = useState(0);
  const [joinDate, setJoinDate] = useState("");
  const [markedDates, setMarkedDates] = useState<any>({}); // 🗓️ Holds our colored days

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUsername(user.email?.split("@")[0] || "User");

      const { data: profile } = await supabase
        .from("profiles")
        .select("experience_level, created_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        setLevel(profile.experience_level || "Beginner");
        setJoinDate(new Date(profile.created_at).toLocaleDateString());
      }

      // 🗓️ FIX: Changed 'created_at' to 'started_at'
      const {
        data: workouts,
        count,
        error,
      } = await supabase
        .from("workouts")
        .select("started_at", { count: "exact" }) // <--- MATCHES YOUR DB NOW
        .eq("user_id", user.id);

      if (error) console.log("Workout Fetch Error:", error.message); // Debugging help

      setWorkoutCount(count || 0);

      // 🗓️ FIX: Use 'started_at' for the calendar logic too
      const dates: any = {};
      workouts?.forEach((w) => {
        const dateStr = w.started_at.split("T")[0]; // <--- CHANGED HERE TOO
        dates[dateStr] = {
          selected: true,
          selectedColor: THEME.primary,
          marked: true,
          dotColor: "black",
        };
      });
      setMarkedDates(dates);
    } catch (error) {
      Alert.alert("Error", "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLevel() {
    const newLevel = level === "Beginner" ? "Intermediate" : "Beginner";
    setLevel(newLevel);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ experience_level: newLevel })
        .eq("id", user.id);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error", error.message);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.joinDate}>Member since {joinDate}</Text>
        </View>

        {/* STATS GRID */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{workoutCount}</Text>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {level === "Beginner" ? "🌱" : "⚡"}
            </Text>
            <Text style={styles.statLabel}>STATUS</Text>
          </View>
        </View>

        {/* 🗓️ CALENDAR SECTION */}
        <Text style={styles.sectionTitle}>CONSISTENCY</Text>
        <View style={styles.calendarContainer}>
          <Calendar
            // Pass our marked dates
            markedDates={markedDates}
            // Theme Customization to match Dark Mode
            theme={{
              backgroundColor: THEME.card,
              calendarBackground: THEME.card,
              textSectionTitleColor: "#b6c1cd",
              selectedDayBackgroundColor: THEME.primary,
              selectedDayTextColor: "black",
              todayTextColor: THEME.primary,
              dayTextColor: "white",
              textDisabledColor: "#444",
              arrowColor: THEME.primary,
              monthTextColor: "white",
              indicatorColor: THEME.primary,
              textDayFontWeight: "300",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "300",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14,
            }}
            style={{ borderRadius: 10, borderWidth: 1, borderColor: "#333" }}
          />
        </View>

        {/* SETTINGS SECTION */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Smart Coach Mode</Text>
            <Text style={styles.settingSub}>
              {level === "Beginner"
                ? "Focus: Compound Basics"
                : "Focus: Isolation & Hypertrophy"}
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: THEME.primary }}
            thumbColor={level === "Intermediate" ? "#fff" : "#f4f3f4"}
            onValueChange={toggleLevel}
            value={level === "Intermediate"}
          />
        </View>

        {/* FOOTER */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // Header
  header: { alignItems: "center", marginBottom: 30 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  avatarText: { fontSize: 32, color: "white", fontWeight: "bold" },
  username: { color: "white", fontSize: 24, fontWeight: "bold" },
  joinDate: { color: THEME.textDim, marginTop: 5 },

  // Stats
  statsRow: { flexDirection: "row", gap: 15, marginBottom: 30 },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  statNumber: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 5,
  },
  statLabel: {
    color: THEME.textDim,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "bold",
  },

  // Calendar
  calendarContainer: { marginBottom: 30 },

  // Settings
  sectionTitle: {
    color: THEME.textDim,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 15,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#333",
  },
  settingLabel: { color: "white", fontSize: 16, fontWeight: "bold" },
  settingSub: { color: THEME.textDim, fontSize: 12, marginTop: 4 },

  // Buttons
  signOutBtn: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  signOutText: { color: THEME.danger, fontWeight: "bold" },
});
