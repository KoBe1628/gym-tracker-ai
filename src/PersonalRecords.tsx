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

    if (!user) return; // Safety check

    // 1. FIX: Added 'workouts!inner(user_id)' to the select string
    const { data: logs, error } = await supabase
      .from("workout_logs")
      .select(
        `
        weight_kg, 
        created_at,
        exercises ( id, name, muscles ( name ) ),
        workouts!inner ( user_id )
      `
      )
      .eq("workouts.user_id", user.id) // Now this filter works because of the line above
      .order("weight_kg", { ascending: false });

    if (error) {
      console.error("Error fetching PRs:", error);
      setLoading(false);
      return;
    }

    if (!logs || logs.length === 0) {
      setLoading(false);
      return;
    }

    // 2. Process: Keep only the FIRST occurrence of each exercise (The Max)
    const uniqueMap = new Set();
    const prList: PR[] = [];

    logs.forEach((log: any) => {
      const exName = log.exercises?.name;
      if (!exName) return;

      // Since we ordered by Weight DESC, the first time we see an exercise,
      // it MUST be the heaviest lift.
      if (!uniqueMap.has(exName)) {
        uniqueMap.add(exName);
        prList.push({
          exerciseName: exName,
          weight: log.weight_kg,
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
              <View style={styles.card}>
                <View>
                  <Text style={styles.exName}>{item.exerciseName}</Text>
                  <Text style={styles.date}>
                    {item.muscle.toUpperCase()} • {item.date}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.weight}>
                    {item.weight} <Text style={{ fontSize: 12 }}>KG</Text>
                  </Text>
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

  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  exName: { color: "white", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  date: { color: THEME.textDim, fontSize: 12, fontWeight: "bold" },

  badge: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  weight: { color: THEME.primary, fontSize: 18, fontWeight: "900" },
  emptyText: { color: "#666", textAlign: "center", marginTop: 50 },
});
