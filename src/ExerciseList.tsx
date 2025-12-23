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

type Exercise = {
  id: number;
  name: string;
  muscles: { name: string };
};

// 🎨 THEME CONFIGURATION
const THEME = {
  bg: "#121212", // Very dark grey (almost black)
  card: "#1E1E1E", // Slightly lighter for cards
  primary: "#bef264", // Lime Green (Trendy gym color)
  text: "#FFFFFF",
  textDim: "#A1A1AA",
  danger: "#EF4444",
};

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [activeRoutineId, setActiveRoutineId] = useState<number | null>(null);
  const [activeRoutineName, setActiveRoutineName] = useState<string>("");
  const [originalExercises, setOriginalExercises] = useState<Exercise[]>([]); // Backup of the full list

  useEffect(() => {
    fetchExercises();
  }, []);

  async function fetchExercises() {
    const { data } = await supabase
      .from("exercises")
      .select(`id, name, muscles ( name )`);
    setExercises(data as any);
    setOriginalExercises(data as any); // <--- SAVE BACKUP
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
          // 1. Mark timestamp in DB
          const { error } = await supabase
            .from("workouts")
            .update({ ended_at: new Date().toISOString() })
            .eq("id", workoutId);

          if (!error) {
            // 2. Calculate Stats (Optional: You could query this from logs)
            // For MVP, just giving a high-five is enough.
            Alert.alert("WORKOUT COMPLETE! 🎉", "Great job today. Rest up.");

            // 3. Reset Local State
            setWorkoutId(null);
            setExercises(originalExercises); // Reset any routine filters
            setActiveRoutineId(null);
          } else {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  }

  async function startRoutine(routineId: number) {
    // 1. Fetch the exercises inside this routine
    const { data: routineData } = await supabase
      .from("routine_exercises")
      .select("exercise_id")
      .eq("routine_id", routineId);

    // 2. Filter the main list to show ONLY these exercises
    if (routineData && routineData.length > 0) {
      const ids = routineData.map((r) => r.exercise_id);
      const filtered = originalExercises.filter((e) => ids.includes(e.id));
      setExercises(filtered);
    } else {
      Alert.alert(
        "Empty Routine",
        "This routine has no exercises yet! Hold it to add some."
      );
      return;
    }

    // 3. Start the Workout Session (Just like the button does)
    startWorkout();
  }

  function openLogModal(exercise: Exercise) {
    if (!workoutId) {
      Alert.alert(
        "❄️ Cold Muscles?",
        "Start a workout first to warm up the logger."
      );
      return;
    }
    setSelectedExercise(exercise);
    setModalVisible(true);
  }

  async function logSet() {
    if (!weight || !reps)
      return Alert.alert("Error", "Please enter weight and reps");

    const { error } = await supabase.from("workout_logs").insert([
      {
        workout_id: workoutId,
        exercise_id: selectedExercise?.id,
        weight_kg: parseFloat(weight),
        reps: parseInt(reps),
      },
    ]);

    if (error) Alert.alert("Error", error.message);
    else {
      setModalVisible(false);
      setWeight("");
      setReps("");
      // Optional: Refresh heatmap here if you want instant updates
    }
  }

  async function addToRoutine(exercise: Exercise) {
    if (!activeRoutineId) return;

    const { error } = await supabase.from("routine_exercises").insert([
      {
        routine_id: activeRoutineId,
        exercise_id: exercise.id,
      },
    ]);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Added!", `${exercise.name} is now in ${activeRoutineName}`);
    }
  }

  // 🎨 RENDER INDIVIDUAL CARD
  const renderCard = ({ item }: { item: Exercise }) => {
    // Check if we are currently in "Routine Editing" mode
    const isEditingRoutine = activeRoutineId !== null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        // Logic: If editing, add to routine. If not, open the logger.
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

        {/* Button Visuals */}
        <View
          style={[
            styles.iconContainer,
            {
              // If editing -> Blue. If workout active -> Green. Else -> Dark Grey.
              backgroundColor: isEditingRoutine
                ? "#3b82f6" // Blue for "Saving"
                : workoutId
                ? THEME.primary
                : "#333",
            },
          ]}
        >
          <Ionicons
            // If editing -> Bookmark icon. If logging -> Plus icon.
            name={isEditingRoutine ? "bookmark" : "add"}
            size={24}
            // If editing -> White icon. If active -> Black icon.
            color={isEditingRoutine ? "white" : workoutId ? "black" : "#555"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER & HEATMAP */}
      <FlatList
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* 1. Visuals */}
            <MuscleHeatmap />

            {/* 2. The Routine Selector */}
            <RoutineList
              // onSelectRoutine={(id) => console.log("Selected", id)}
              onSelectRoutine={(id) => startRoutine(id)}
              onEnterEditMode={(id, name) => {
                setActiveRoutineId(id);
                setActiveRoutineName(name);
                Alert.alert(
                  "Editing " + name,
                  "Tap the Bookmark icon on any exercise to add it."
                );
              }}
            />

            {/* 3. CONDITIONAL HEADER: Edit Mode vs. Normal Mode */}
            {activeRoutineId ? (
              // 🟦 BLUE BANNER (Edit Mode)
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
              // 🟩 STANDARD ROW (Normal Mode)
              <View style={styles.actionRow}>
                <Text style={styles.headerTitle}>
                  {workoutId ? "🔥 CRUSH IT" : "EXERCISE LIST"}
                </Text>

                {/* IF WORKOUT IS ACTIVE -> SHOW FINISH BUTTON */}
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
                  /* ELSE -> SHOW START BUTTON */
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={startWorkout}
                  >
                    <Text style={styles.startButtonText}>START WORKOUT</Text>
                  </TouchableOpacity>
                )}

                {/* NEW: If list is filtered, show "Show All" */}
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
        data={exercises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={{ paddingBottom: 50 }}
      />

      {/* DARK MODAL */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        {/* 1. We wrap the overlay in KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>

            {/* THE CHART */}
            {selectedExercise && (
              <ProgressChart exerciseId={selectedExercise.id} />
            )}

            <View style={styles.inputRow}>
              <TextInput
                placeholder="KG"
                placeholderTextColor="#666"
                keyboardType="numeric"
                returnKeyType="done" // Adds a "Done" button to keyboard
                style={styles.input}
                onChangeText={setWeight}
                value={weight}
              />
              <TextInput
                placeholder="Reps"
                placeholderTextColor="#666"
                keyboardType="numeric"
                returnKeyType="done"
                style={styles.input}
                onChangeText={setReps}
                value={reps}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={logSet}>
              <Text style={styles.saveButtonText}>LOG SET</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 15 }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#666" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Header
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
  startButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  startButtonText: { color: "black", fontWeight: "bold", fontSize: 12 },

  // Cards
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "85%",
    backgroundColor: "#222",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  inputRow: { flexDirection: "row", gap: 15, marginBottom: 20 },
  input: {
    backgroundColor: "#111",
    color: "white",
    width: 100,
    padding: 15,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#333",
  },
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

  // Edit Banner & Exit Button
  // ... inside styles
  editBanner: {
    backgroundColor: "#3b82f6", // Tailwind Blue-500
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
    color: "#dbeafe", // Light blue text
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
  exitButton: {
    padding: 5,
  },
});
