import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "./lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import MuscleHeatmap from "./MuscleHeatmap";
import RoutineList from "./RoutineList";
import ProgressChart from "./ProgressChart";
import RestTimer from "./RestTimer";
import { feedback } from "./lib/haptics";
import PlateCalculator from "./PlateCalculator";
import ConfettiCannon from "react-native-confetti-cannon";

type Exercise = {
  id: number;
  name: string;
  muscles: { name: string };
};

// 🎨 THEME CONFIGURATION
const THEME = {
  bg: "#121212",
  card: "#1E1E1E",
  primary: "#bef264", // Lime Green
  text: "#FFFFFF",
  textDim: "#A1A1AA",
  danger: "#EF4444",
};

const AVAILABLE_TAGS = ["Warm Up", "Failure", "Drop Set"];

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );

  // 📝 Inputs
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // ⚙️ Logic State
  const [activeRoutineId, setActiveRoutineId] = useState<number | null>(null);
  const [activeRoutineName, setActiveRoutineName] = useState<string>("");
  const [originalExercises, setOriginalExercises] = useState<Exercise[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  // 🗂️ New Tab State
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");

  //Helper to Toggle
  const toggleTag = (t: string) => {
    if (tags.includes(t)) {
      setTags(tags.filter((tag) => tag !== t)); // Remove
    } else {
      setTags([...tags, t]); // Add
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  async function fetchExercises() {
    const { data } = await supabase
      .from("exercises")
      .select(`id, name, muscles ( name )`);
    setExercises(data as any);
    setOriginalExercises(data as any);
  }

  async function startWorkout() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("workouts")
      .insert([{ user_id: user.id, name: "Late Night Pump" }])
      .select();

    if (error) Alert.alert("Error", error.message);
    if (data) {
      setWorkoutId(data[0].id);
    }
  }

  async function finishWorkout() {
    if (!workoutId) return;

    Alert.alert("Finish Workout?", "Are you done crushing it?", [
      { text: "Keep Pumping", style: "cancel" },
      {
        text: "Finish",
        onPress: async () => {
          const { error } = await supabase
            .from("workouts")
            .update({ ended_at: new Date().toISOString() })
            .eq("id", workoutId);

          if (!error) {
            Alert.alert("WORKOUT COMPLETE! 🎉", "Great job today. Rest up.");
            setWorkoutId(null);
            setExercises(originalExercises);
            setActiveRoutineId(null);
          } else {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  }

  async function startRoutine(routineId: number) {
    const { data: routineData } = await supabase
      .from("routine_exercises")
      .select("exercise_id")
      .eq("routine_id", routineId);

    if (routineData && routineData.length > 0) {
      const ids = routineData.map((r) => r.exercise_id);
      const filtered = originalExercises.filter((e) => ids.includes(e.id));
      setExercises(filtered);
    } else {
      Alert.alert("Empty Routine", "This routine has no exercises yet!");
      return;
    }
    startWorkout();
  }

  function openLogModal(exercise: Exercise) {
    if (!workoutId) {
      Alert.alert("❄️ Cold Muscles?", "Start a workout first to warm up.");
      return;
    }
    setSelectedExercise(exercise);
    setWeight("");
    setReps("");
    setNote("");
    setActiveTab("log"); // Reset to Log tab
    setModalVisible(true);
  }

  async function logSet() {
    if (!weight || !reps) return Alert.alert("Error", "Enter weight and reps");

    const { error } = await supabase.from("workout_logs").insert([
      {
        workout_id: workoutId,
        exercise_id: selectedExercise?.id,
        weight_kg: parseFloat(weight),
        reps: parseInt(reps),
        note: note.trim(),
        tags: tags,
      },
    ]);

    if (!error) {
      setNote("");
      setTags([]);

      // Check for Confetti Trigger
      if (parseFloat(weight) >= 100 || parseFloat(reps) >= 12) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      feedback.light();
      setModalVisible(false);
      setShowTimer(true);
    } else {
      Alert.alert("Error", error.message);
    }
  }

  async function addToRoutine(exercise: Exercise) {
    if (!activeRoutineId) return;
    const { error } = await supabase
      .from("routine_exercises")
      .insert([{ routine_id: activeRoutineId, exercise_id: exercise.id }]);
    if (!error) Alert.alert("Added!", `${exercise.name} added to routine.`);
  }

  // 🧮 1RM Calculation Helper
  const getOneRepMax = () => {
    const w = parseFloat(weight);
    const r = parseFloat(reps);
    if (!w || !r || r === 0) return 0;
    if (r === 1) return w;
    return Math.round(w / (1.0278 - 0.0278 * r));
  };
  const estimatedMax = getOneRepMax();

  // 🔍 Filter Logic
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscles?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- MAIN LIST --- */}
      <FlatList
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* 1. Heatmap */}
            <MuscleHeatmap />

            {/* 2. Search */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={{ marginRight: 10 }}
              />
              <TextInput
                placeholder="Find an exercise..."
                placeholderTextColor="#666"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* 3. Routines */}
            <RoutineList
              onSelectRoutine={(id) => startRoutine(id)}
              onEnterEditMode={(id, name) => {
                setActiveRoutineId(id);
                setActiveRoutineName(name);
                Alert.alert(
                  "Editing " + name,
                  "Tap bookmark to add exercises."
                );
              }}
            />

            {/* 4. Action Bar / Edit Mode Banner */}
            {activeRoutineId ? (
              <View style={styles.editBanner}>
                <View>
                  <Text style={styles.editBannerText}>EDITING ROUTINE:</Text>
                  <Text style={styles.editBannerName}>{activeRoutineName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.exitButton}
                  onPress={() => {
                    setActiveRoutineId(null);
                    setActiveRoutineName("");
                    Alert.alert("Saved", "Routine updated.");
                  }}
                >
                  <Ionicons name="close-circle" size={30} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Text style={styles.headerTitle}>
                  {workoutId ? "🔥 CRUSH IT" : "EXERCISE LIST"}
                </Text>

                {workoutId ? (
                  <TouchableOpacity
                    style={[
                      styles.startButton,
                      { backgroundColor: THEME.danger },
                    ]}
                    onPress={finishWorkout}
                  >
                    <Text style={[styles.startButtonText, { color: "white" }]}>
                      FINISH
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={startWorkout}
                  >
                    <Text style={styles.startButtonText}>START WORKOUT</Text>
                  </TouchableOpacity>
                )}

                {exercises.length < originalExercises.length && (
                  <TouchableOpacity
                    onPress={() => setExercises(originalExercises)}
                  >
                    <Text style={{ color: "#666", fontSize: 12 }}>
                      Show All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        }
        data={filteredExercises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isEditingRoutine = activeRoutineId !== null;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                isEditingRoutine ? addToRoutine(item) : openLogModal(item)
              }
            >
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.muscles?.name.toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isEditingRoutine
                      ? "#3b82f6"
                      : workoutId
                      ? THEME.primary
                      : "#333",
                  },
                ]}
              >
                <Ionicons
                  name={isEditingRoutine ? "bookmark" : "add"}
                  size={24}
                  color={
                    isEditingRoutine ? "white" : workoutId ? "black" : "#555"
                  }
                />
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 50 }}
      />

      {/* --- TABBED MODAL --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalView}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "log" && styles.activeTab]}
                onPress={() => setActiveTab("log")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "log" && styles.activeTabText,
                  ]}
                >
                  LOG SET
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "history" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("history")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "history" && styles.activeTabText,
                  ]}
                >
                  HISTORY
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT */}
            {activeTab === "log" ? (
              <View style={styles.tabContent}>
                {/* Inputs */}
                <View style={styles.inputRow}>
                  <TextInput
                    placeholder="KG"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    returnKeyType="done"
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                  />
                  <TextInput
                    placeholder="Reps"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    returnKeyType="done"
                    style={styles.input}
                    value={reps}
                    onChangeText={setReps}
                  />
                </View>

                {/* Stats & Tools */}
                {weight && reps ? (
                  <View style={styles.oneRepContainer}>
                    <Text style={styles.oneRepLabel}>ESTIMATED 1 REP MAX</Text>
                    <Text style={styles.oneRepValue}>{estimatedMax}kg</Text>
                  </View>
                ) : null}

                {weight ? (
                  <PlateCalculator weight={parseFloat(weight)} />
                ) : null}

                {/* TAGS SELECTOR */}
                <View style={styles.tagRow}>
                  {AVAILABLE_TAGS.map((t) => {
                    const isActive = tags.includes(t);
                    let color = "#333"; // Default
                    if (isActive) {
                      if (t === "Warm Up") color = "#eab308"; // Yellow
                      if (t === "Failure") color = "#ef4444"; // Red
                      if (t === "Drop Set") color = "#3b82f6"; // Blue
                    }

                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => toggleTag(t)}
                        style={[
                          styles.tagPill,
                          {
                            backgroundColor: isActive ? color : "transparent",
                            borderColor: isActive ? color : "#444",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            { color: isActive ? "black" : "#888" },
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Note Input */}
                <View style={styles.noteContainer}>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="Notes (e.g. Shoulder pain, Seat 4)"
                    placeholderTextColor="#555"
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    maxLength={50}
                  />
                </View>

                {/* Log Button */}
                <TouchableOpacity style={styles.saveButton} onPress={logSet}>
                  <Text style={styles.saveButtonText}>LOG SET</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // History Tab
              <View
                style={[
                  styles.tabContent,
                  { justifyContent: "flex-start", paddingTop: 10 },
                ]}
              >
                {selectedExercise && (
                  <ProgressChart exerciseId={selectedExercise.id} />
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- UTILITIES --- */}
      {showTimer && (
        <RestTimer initialSeconds={90} onClose={() => setShowTimer(false)} />
      )}
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
    paddingTop: 50,
  },

  // Header & Search
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: { flex: 1, color: "white", height: "100%" },

  // Buttons
  startButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  startButtonText: { color: "black", fontWeight: "bold", fontSize: 12 },

  // Routine Edit Banner
  editBanner: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#60a5fa",
  },
  editBannerText: {
    color: "#dbeafe",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  editBannerName: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  exitButton: { padding: 5 },

  // List Cards
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "bold" },
  cardSubtitle: {
    color: THEME.textDim,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal Structure
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalView: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "white" },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#27272a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: THEME.primary },
  tabText: {
    color: "#A1A1AA",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  activeTabText: { color: "black" },
  tabContent: { flex: 1 },

  // Modal Inputs & Tools
  inputRow: { flexDirection: "row", gap: 15, marginBottom: 20 },
  input: {
    backgroundColor: "#111",
    color: "white",
    flex: 1,
    padding: 15,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#333",
  },

  oneRepContainer: {
    alignItems: "center",
    marginTop: 0,
    marginBottom: 15,
    backgroundColor: "#333",
    alignSelf: "center",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  oneRepLabel: {
    color: "#bef264",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 2,
  },
  oneRepValue: { color: "white", fontSize: 18, fontWeight: "900" },

  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    width: "100%",
    borderWidth: 1,
    borderColor: "#333",
    height: 50,
  },
  noteInput: { flex: 1, color: "white", height: "100%" },

  saveButton: {
    backgroundColor: THEME.primary,
    width: "100%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "black",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },

  // Tags
  tagRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
    justifyContent: "center",
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: "bold" },
});
