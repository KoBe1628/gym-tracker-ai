import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "./lib/supabase";

type PR = {
  exerciseName: string;
  weight: number;
  reps: number; // 🆕 Added Reps
  date: string;
  muscle: string;
};

const THEME = {
  bg: "#121212",
  card: "#1E1E1E",
  primary: "#bef264",
  textDim: "#A1A1AA",
};

export default function PersonalRecords({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [records, setRecords] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) fetchPRs();
  }, [visible]);

  async function fetchPRs() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: logs, error } = await supabase
      .from("workout_logs")
      .select(
        `
        weight_kg, 
        reps,
        created_at,
        exercises ( id, name, muscles ( name ) ),
        workouts!inner ( user_id )
      `
      )
      .eq("workouts.user_id", user.id)
      .order("weight_kg", { ascending: false }); // Biggest weight first

    if (error) {
      console.error("Error fetching PRs:", error);
      setLoading(false);
      return;
    }

    if (!logs || logs.length === 0) {
      setLoading(false);
      return;
    }

    // Process: Keep only the FIRST occurrence (The Max)
    const uniqueMap = new Set();
    const prList: PR[] = [];

    logs.forEach((log: any) => {
      const exName = log.exercises?.name;
      if (!exName) return;

      if (!uniqueMap.has(exName)) {
        uniqueMap.add(exName);
        prList.push({
          exerciseName: exName,
          weight: log.weight_kg,
          reps: log.reps, // 🆕 Capture Reps
          date: new Date(log.created_at).toLocaleDateString(),
          muscle: log.exercises?.muscles?.name || "Other",
        });
      }
    });

    setRecords(prList);
    setLoading(false);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>HALL OF FAME 🏆</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={THEME.primary}
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.exerciseName}
            contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
            renderItem={({ item }) => (
              <View style={styles.trophyCard}>
                {/* 1. Gold Icon */}
                <View style={styles.iconCircle}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                </View>

                {/* 2. Info */}
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.exName}>{item.exerciseName}</Text>
                  <Text style={styles.date}>
                    {item.muscle.toUpperCase()} • {item.date}
                  </Text>
                </View>

                {/* 3. The Numbers */}
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.weight}>{item.weight}kg</Text>
                  <Text style={styles.reps}>x {item.reps} reps</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No records yet. Go lift something heavy!
              </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginTop: 10,
  },
  title: { color: "white", fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  closeBtn: { backgroundColor: THEME.primary, borderRadius: 20, padding: 5 },

  // 🏆 NEW CARD STYLES
  trophyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27272a",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.1)", // Gold tint
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  exName: { color: "white", fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  date: {
    color: THEME.textDim,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  weight: { color: THEME.primary, fontSize: 20, fontWeight: "900" },
  reps: { color: "#888", fontSize: 12, fontWeight: "bold" },

  emptyText: { color: "#666", textAlign: "center", marginTop: 50 },
});
