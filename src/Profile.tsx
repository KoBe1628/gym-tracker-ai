import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  TextInput,
} from "react-native";
import { supabase } from "./lib/supabase";
import { Calendar } from "react-native-calendars"; // 🗓️ The new library
import BadgeGrid from "./BadgeGrid";
import { feedback } from "./lib/haptics";
import PersonalRecords from "./PersonalRecords";
import { Ionicons } from "@expo/vector-icons";
import SymmetryCard from "./SymmetryCard";
import WorkoutSummary from "./WorkoutSummary";
import IronRank from "./IronRank";

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
  const [bodyweight, setBodyweight] = useState("");
  const [markedDates, setMarkedDates] = useState<any>({}); // 🗓️ Holds our colored days
  const [badgeStats, setBadgeStats] = useState({
    count: 0,
    maxWeight: 0,
    hasWeekendWorkout: false,
  });
  const [showPRs, setShowPRs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(
    null,
  );
  // We need a map to quickly find the workout ID when a date is tapped
  const [workoutMap, setWorkoutMap] = useState<Record<string, number>>({});

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
        .select("experience_level, created_at, bodyweight")
        .eq("id", user.id)
        .single();

      if (profile) {
        setLevel(profile.experience_level || "Beginner");
        setJoinDate(new Date(profile.created_at).toLocaleDateString());
        setBodyweight(
          profile.bodyweight !== null && profile.bodyweight !== undefined
            ? String(profile.bodyweight)
            : "",
        );
      }

      // 1. Fetch Workouts (Existing code)
      const {
        data: workouts,
        count,
        error,
      } = await supabase
        .from("workouts")
        .select("id, started_at", { count: "exact" })
        .eq("user_id", user.id);

      setWorkoutCount(count || 0);

      // 2. 🗓️ Calendar Logic (Existing code)
      const dates: any = {};
      const idMap: Record<string, number> = {}; // <--- New Map
      let hasWeekend = false; // 🆕 Track for badge

      workouts?.forEach((w) => {
        const dateStr = w.started_at.split("T")[0];

        // Map Date -> ID
        idMap[dateStr] = w.id;

        dates[dateStr] = {
          selected: true,
          selectedColor: THEME.primary,
          marked: true,
          dotColor: "black",
        };

        // Check if it was a Saturday (6) or Sunday (0)
        const day = new Date(w.started_at).getDay();
        if (day === 0 || day === 6) hasWeekend = true;
      });
      setMarkedDates(dates);
      setWorkoutMap(idMap);

      // 3. 🏋️‍♂️ New: Fetch Max Weight for Badges
      // We look for the heaviest lift in the logs
      const { data: maxLog } = await supabase
        .from("workout_logs")
        .select("weight_kg")
        .eq("workouts.user_id", user.id) // Inner join trick
        .select("weight_kg, workouts!inner(user_id)") // Filter by user
        .order("weight_kg", { ascending: false })
        .limit(1)
        .single();

      const maxWeight = maxLog ? maxLog.weight_kg : 0;

      // 4. Set Stats for the Badge Component
      setBadgeStats({
        count: count || 0,
        maxWeight: maxWeight,
        hasWeekendWorkout: hasWeekend,
      });
    } catch (error) {
      Alert.alert("Error", "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLevel() {
    feedback.medium(); // 📳 THUD
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

  async function saveBodyweight() {
    const parsedBodyweight = Number(bodyweight);

    if (
      !bodyweight.trim() ||
      Number.isNaN(parsedBodyweight) ||
      parsedBodyweight <= 0
    ) {
      Alert.alert("Invalid weight", "Enter a valid bodyweight in kg.");
      return;
    }

    feedback.medium();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ bodyweight: parsedBodyweight })
      .eq("id", user.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Saved", "Your bodyweight was updated.");
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

        <SymmetryCard />

        <TouchableOpacity
          style={styles.prButton}
          onPress={() => setShowPRs(true)}
        >
          <Ionicons
            name="trophy-outline"
            size={20}
            color="black"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.prButtonText}>VIEW PERSONAL RECORDS</Text>
        </TouchableOpacity>

        <BadgeGrid stats={badgeStats} />

        {/* 🛡️ NEW RPG RANK CARD */}
        <IronRank />

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
            onDayPress={(day: any) => {
              const wId = workoutMap[day.dateString];
              if (wId) {
                feedback.light(); // Haptic tick
                setSelectedWorkoutId(wId);
                setShowHistory(true);
              } else {
                // Optional: Feedback for empty days
                // Alert.alert("Rest Day", "No workout recorded on this date.")
              }
            }}
            style={{ borderRadius: 10, borderWidth: 1, borderColor: "#333" }}
          />
        </View>

        <PersonalRecords visible={showPRs} onClose={() => setShowPRs(false)} />

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

        <View style={styles.bodyweightCard}>
          <Text style={styles.settingLabel}>Bodyweight</Text>
          <Text style={styles.settingSub}>
            Used for strength standard calculations.
          </Text>
          <View style={styles.bodyweightRow}>
            <TextInput
              style={styles.bodyweightInput}
              value={bodyweight}
              onChangeText={setBodyweight}
              placeholder="Enter kg"
              placeholderTextColor="#666"
              keyboardType="numeric"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveBodyweight}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <WorkoutSummary
          visible={showHistory}
          workoutId={selectedWorkoutId}
          onClose={() => setShowHistory(false)}
        />
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
  bodyweightCard: {
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  bodyweightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  bodyweightInput: {
    flex: 1,
    backgroundColor: "#111",
    color: "white",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "black",
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Buttons
  signOutBtn: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  signOutText: { color: THEME.danger, fontWeight: "bold" },
  prButton: {
    flexDirection: "row",
    backgroundColor: THEME.primary, // Lime Green
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  prButtonText: {
    color: "black",
    fontWeight: "900",
    letterSpacing: 1,
  },
});
