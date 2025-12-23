import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { supabase } from "./lib/supabase";
import { Ionicons } from "@expo/vector-icons";

const THEME = {
  card: "#1E1E1E",
  primary: "#bef264",
  textDim: "#A1A1AA",
};

export default function RoutineList({
  onSelectRoutine,
  onEnterEditMode, // <--- NEW PROP
}: {
  onSelectRoutine?: (routineId: number) => void;
  onEnterEditMode: (routineId: number, routineName: string) => void;
}) {
  const [routines, setRoutines] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(
    null
  );

  useEffect(() => {
    fetchRoutines();
  }, []);

  async function fetchRoutines() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRoutines(data);
    }
  }

  async function createRoutine() {
    if (!newRoutineName.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("routines")
      .insert([{ user_id: user.id, name: newRoutineName }]);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setNewRoutineName("");
      setModalVisible(false);
      fetchRoutines(); // Refresh list
    }
  }

  async function deleteRoutine(id: number) {
    const { error } = await supabase.from("routines").delete().eq("id", id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Remove it from the local list instantly (UI Optimism)
      setRoutines((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // 🎨 Render the "Add New" Card
  const renderAddButton = () => (
    <TouchableOpacity
      style={[styles.card, styles.addCard]}
      onPress={() => setModalVisible(true)}
    >
      <Ionicons name="add" size={24} color={THEME.primary} />
      <Text style={styles.addText}>New Routine</Text>
    </TouchableOpacity>
  );

  // 🎨 Render a Routine Card
  const renderRoutine = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        selectedRoutineId === item.id && { borderColor: THEME.primary },
      ]}
      // 1. SHORT TAP -> Start the Routine (Play)
      onPress={() => onSelectRoutine && onSelectRoutine(item.id)}
      // 2. LONG PRESS -> Edit the Routine (Build)
      onLongPress={() => {
        Alert.alert(item.name, "What do you want to do?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Edit Content",
            onPress: () => {
              setSelectedRoutineId(item.id);
              onEnterEditMode(item.id, item.name);
            },
          },
          {
            text: "Delete",
            style: "destructive", // Shows as Red on iOS
            onPress: () => deleteRoutine(item.id),
          },
        ]);
      }}
      delayLongPress={500} // Hold for half a second
    >
      <View style={styles.iconBox}>
        <Ionicons name="list" size={20} color="black" />
      </View>
      <Text style={styles.cardTitle}>{item.name}</Text>
      {/* Visual Hint */}
      <Text style={styles.cardSubtitle}>Tap to Start{"\n"}Hold to Edit</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>MY PLANS</Text>
      </View>

      <FlatList
        horizontal
        data={routines}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRoutine}
        ListFooterComponent={renderAddButton} // The "Add" button is the last item in the list
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 20 }}
      />

      {/* CREATE ROUTINE MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>New Routine Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Leg Day"
              placeholderTextColor="#666"
              value={newRoutineName}
              onChangeText={setNewRoutineName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: "#888", marginRight: 20 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createRoutine}>
                <Text style={{ color: THEME.primary, fontWeight: "bold" }}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 25 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  // Cards
  card: {
    width: 140,
    height: 100,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#333",
  },
  addCard: {
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderColor: "#444",
    backgroundColor: "transparent",
  },
  addText: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
  },

  // Content inside card
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { color: "white", fontWeight: "bold", fontSize: 14 },
  cardSubtitle: { color: THEME.textDim, fontSize: 10 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "80%",
    backgroundColor: "#222",
    padding: 25,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#111",
    color: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
});
