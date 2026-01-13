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
  ScrollView,
  Switch,
} from "react-native";
import { supabase } from "./lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import MuscleHeatmap from "./MuscleHeatmap";
import RoutineList from "./RoutineList";
import ProgressChart from "./ProgressChart";
import RestTimer from "./RestTimer";
import WeeklyTarget from "./WeeklyTarget";
import WorkoutSummary from "./WorkoutSummary";
import Sparkline from "./Sparkline"; // 📈 NEW IMPORT
import { feedback } from "./lib/haptics";
import PlateCalculator from "./PlateCalculator";
import ConfettiCannon from "react-native-confetti-cannon";

type Exercise = {
  id: number;
  name: string;
  is_bodyweight: boolean;
  muscles: {
    id: number;
    name: string;
  };
};

type Muscle = {
  id: number;
  name: string;
};

// 🎨 THEME
const THEME = {
  bg: "#121212",
  card: "#1E1E1E",
  primary: "#bef264",
  text: "#FFFFFF",
  textDim: "#A1A1AA",
  danger: "#EF4444",
};

// 🏷️ TAG OPTIONS
const AVAILABLE_TAGS = ["Warm Up", "Failure", "Drop Set"];

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [musclesList, setMusclesList] = useState<Muscle[]>([]);
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

  // 🧪 Creator Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscleId, setNewMuscleId] = useState<number | null>(null);
  const [isBodyweight, setIsBodyweight] = useState(false);

  // 🏆 PR & Recovery Logic
  const [currentPR, setCurrentPR] = useState(0);
  const [recoveryMap, setRecoveryMap] = useState<Record<number, string>>({});
  const [trendData, setTrendData] = useState<number[]>([]); // 📈 TREND STATE

  // ⚙️ Logic State
  const [activeRoutineId, setActiveRoutineId] = useState<number | null>(null);
  const [activeRoutineName, setActiveRoutineName] = useState<string>("");
  const [originalExercises, setOriginalExercises] = useState<Exercise[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // 🗂️ Tab State
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");

  useEffect(() => {
    fetchData();
    fetchRecoveryStatus();
  }, []);

  async function fetchData() {
    const { data: exData } = await supabase
      .from("exercises")
      .select(`id, name, is_bodyweight, muscles ( id, name )`)
      .order("name");

    setExercises(exData as any);
    setOriginalExercises(exData as any);

    const { data: mData } = await supabase.from("muscles").select("id, name");
    setMusclesList(mData || []);
  }

  // 🔋 SMART COACH
  async function fetchRecoveryStatus() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const { data: logs } = await supabase
      .from("workout_logs")
      .select(
        `created_at, exercises!inner(muscles(id)), workouts!inner(user_id)`
      )
      .eq("workouts.user_id", user.id)
      .gte("created_at", twoDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (logs) {
      const map: Record<number, string> = {};
      logs.forEach((log: any) => {
        const mId = log.exercises?.muscles?.id;
        if (mId && !map[mId]) map[mId] = log.created_at;
      });
      setRecoveryMap(map);
    }
  }

  const getRecoveryBadge = (muscleId: number | undefined) => {
    if (!muscleId || !recoveryMap[muscleId]) return null;
    const lastHit = new Date(recoveryMap[muscleId]);
    const now = new Date();
    const diffHours = (now.getTime() - lastHit.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return (
        <View
          style={[
            styles.recoveryBadge,
            { backgroundColor: "#7f1d1d", borderColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="battery-dead"
            size={10}
            color="#ef4444"
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.recoveryText, { color: "#ef4444" }]}>
            RECOVERING
          </Text>
        </View>
      );
    } else if (diffHours < 48) {
      return (
        <View
          style={[
            styles.recoveryBadge,
            { backgroundColor: "#422006", borderColor: "#eab308" },
          ]}
        >
          <Ionicons
            name="battery-half"
            size={10}
            color="#eab308"
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.recoveryText, { color: "#eab308" }]}>
            REBUILDING
          </Text>
        </View>
      );
    }
    return null;
  };

  async function fetchPersonalRecord(exerciseId: number) {
    const { data } = await supabase
      .from("workout_logs")
      .select("weight_kg")
      .eq("exercise_id", exerciseId)
      .order("weight_kg", { ascending: false })
      .limit(1)
      .single();

    if (data) setCurrentPR(data.weight_kg);
    else setCurrentPR(0);
  }

  // 📈 FETCH TREND DATA
  async function fetchTrendData(exerciseId: number) {
    const { data } = await supabase
      .from("workout_logs")
      .select("weight_kg, reps, created_at")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: false }) // Newest first
      .limit(10);

    if (data && data.length > 0) {
      const oneRMs = data.map((log: any) => {
        const w = log.weight_kg || 0;
        const r = log.reps || 0;
        if (r === 0) return 0;
        return w * (1 + r / 30); // Epley Formula
      });
      setTrendData(oneRMs.reverse()); // Oldest -> Newest
    } else {
      setTrendData([]);
    }
  }

  async function createExercise() {
    if (!newName || !newMuscleId)
      return Alert.alert(
        "Missing Info",
        "Please add a name and pick a muscle."
      );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("exercises").insert([
      {
        name: newName,
        target_muscle_id: newMuscleId,
        is_bodyweight: isBodyweight,
        created_by: user.id,
      },
    ]);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Exercise created!");
      setCreateModalVisible(false);
      setNewName("");
      setIsBodyweight(false);
      setNewMuscleId(null);
      fetchData();
    }
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
    if (data) setWorkoutId(data[0].id);
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

          if (!error) setShowSummary(true);
          else Alert.alert("Error", error.message);
        },
      },
    ]);
  }

  function closeSummary() {
    setShowSummary(false);
    setWorkoutId(null);
    setExercises(originalExercises);
    setActiveRoutineId(null);
    setNote("");
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
    setTags([]);
    setActiveTab("log");

    setCurrentPR(0);
    fetchPersonalRecord(exercise.id);

    // 📈 Initialize Trend
    setTrendData([]);
    fetchTrendData(exercise.id);

    setModalVisible(true);
  }

  async function logSet() {
    if ((!weight && !selectedExercise?.is_bodyweight) || !reps)
      return Alert.alert("Error", "Enter data");
    const inputWeight = weight ? parseFloat(weight) : 0;
    const isNewRecord = currentPR > 0 && inputWeight > currentPR;

    const { error } = await supabase.from("workout_logs").insert([
      {
        workout_id: workoutId,
        exercise_id: selectedExercise?.id,
        weight_kg: inputWeight,
        reps: parseInt(reps),
        note: note.trim(),
        tags: tags,
      },
    ]);

    if (!error) {
      setNote("");
      setTags([]);
      if (isNewRecord) {
        setShowConfetti(true);
        Alert.alert(
          "🏆 NEW RECORD!",
          `You just crushed your old PR of ${currentPR}kg!`
        );
        setCurrentPR(inputWeight);
      } else if (inputWeight >= 100 || parseInt(reps) >= 12) {
        setShowConfetti(true);
      }
      if (showConfetti || isNewRecord)
        setTimeout(() => setShowConfetti(false), 5000);
      feedback.light();
      setModalVisible(false);
      setShowTimer(true);
      fetchRecoveryStatus();
      fetchTrendData(selectedExercise!.id); // Update trend immediately
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

  const getOneRepMax = () => {
    const w = parseFloat(weight) || 0;
    const r = parseFloat(reps) || 0;
    if (r === 0) return 0;
    if (r === 1) return w;
    return Math.round(w / (1.0278 - 0.0278 * r));
  };
  const estimatedMax = getOneRepMax();

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
            <WeeklyTarget />
            <MuscleHeatmap />

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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 8,
                  }}
                >
                  <Text style={styles.cardSubtitle}>
                    {item.muscles?.name.toUpperCase()}
                    {item.is_bodyweight ? " • BODYWEIGHT" : ""}
                  </Text>
                  {getRecoveryBadge(item.muscles?.id)}
                </View>
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
        ListFooterComponent={
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons
              name="flask-outline"
              size={20}
              color="black"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.createButtonText}>CREATE CUSTOM EXERCISE</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ paddingBottom: 50 }}
      />

      {/* --- 🧪 CREATE EXERCISE MODAL --- */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.creatorModalView}>
            <Text style={styles.modalTitle}>THE LAB 🧪</Text>
            <Text style={{ color: "#888", marginBottom: 20 }}>
              Create a custom exercise for your library.
            </Text>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>NAME:</Text>
              <TextInput
                placeholder="Ex: Super Press"
                placeholderTextColor="#555"
                style={styles.creatorInput}
                value={newName}
                onChangeText={setNewName}
              />

              <View style={styles.switchRow}>
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Is Bodyweight?
                </Text>
                <Switch
                  value={isBodyweight}
                  onValueChange={setIsBodyweight}
                  trackColor={{ false: "#333", true: THEME.primary }}
                  thumbColor={"white"}
                />
              </View>

              <Text style={styles.label}>PRIMARY MUSCLE:</Text>
              <ScrollView
                horizontal
                style={{ maxHeight: 50, marginBottom: 30 }}
                contentContainerStyle={{ gap: 8 }}
                showsHorizontalScrollIndicator={false}
              >
                {musclesList.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.chip,
                      newMuscleId === m.id && styles.activeChip,
                    ]}
                    onPress={() => setNewMuscleId(m.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        newMuscleId === m.id && { color: "black" },
                      ]}
                    >
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={createExercise}
              >
                <Text style={styles.saveButtonText}>CREATE EXERCISE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={{ marginTop: 10, padding: 15, alignItems: "center" }}
              >
                <Text style={{ color: "#666", fontWeight: "bold" }}>
                  CANCEL
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- LOGGING MODAL --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalView}>
            {/* 🔄 MODIFIED HEADER WITH SPARKLINE */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
                {trendData.length > 1 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Sparkline data={trendData} />
                    <Text
                      style={{
                        color: "#bef264",
                        fontSize: 10,
                        fontWeight: "bold",
                        marginLeft: 8,
                      }}
                    >
                      TREND
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                    Let's build some data.
                  </Text>
                )}
              </View>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

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

            {activeTab === "log" ? (
              <ScrollView
                style={styles.tabContent}
                contentContainerStyle={{ paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputRow}>
                  <TextInput
                    placeholder={
                      selectedExercise?.is_bodyweight ? "Added Wgt (+kg)" : "KG"
                    }
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

                <View style={styles.statsRow}>
                  {weight && reps ? (
                    <View style={styles.statChip}>
                      <Text style={styles.statLabel}>EST. 1RM</Text>
                      <Text style={styles.statValue}>{estimatedMax}kg</Text>
                    </View>
                  ) : null}

                  {currentPR > 0 && (
                    <View style={[styles.statChip, { borderColor: "#EAB308" }]}>
                      <Text style={[styles.statLabel, { color: "#EAB308" }]}>
                        CURRENT PR
                      </Text>
                      <Text style={styles.statValue}>{currentPR}kg</Text>
                    </View>
                  )}
                </View>

                {!selectedExercise?.is_bodyweight && weight ? (
                  <PlateCalculator weight={parseFloat(weight)} />
                ) : null}

                {selectedExercise?.is_bodyweight && (
                  <Text
                    style={{
                      color: "#666",
                      textAlign: "center",
                      fontSize: 12,
                      marginBottom: 15,
                      fontStyle: "italic",
                    }}
                  >
                    (Bodyweight exercise: Plates hidden)
                  </Text>
                )}

                <View style={styles.tagRow}>
                  {AVAILABLE_TAGS.map((t) => {
                    const isActive = tags.includes(t);
                    let color = "#333";
                    if (isActive) {
                      if (t === "Warm Up") color = "#eab308";
                      if (t === "Failure") color = "#ef4444";
                      if (t === "Drop Set") color = "#3b82f6";
                    }
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => {
                          if (tags.includes(t))
                            setTags(tags.filter((tag) => tag !== t));
                          else setTags([...tags, t]);
                        }}
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

                <TouchableOpacity style={styles.saveButton} onPress={logSet}>
                  <Text style={styles.saveButtonText}>LOG SET</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.tabContent}
                contentContainerStyle={{ paddingBottom: 50, paddingTop: 10 }}
              >
                {selectedExercise && (
                  <ProgressChart exerciseId={selectedExercise.id} />
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {showTimer && (
        <RestTimer initialSeconds={90} onClose={() => setShowTimer(false)} />
      )}

      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          colors={["#FFD700", "#FFA500", "#FFFFFF", "#bef264"]}
        />
      )}

      <WorkoutSummary
        visible={showSummary}
        workoutId={workoutId}
        onClose={closeSummary}
      />
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

  // --- RECOVERY BADGES ---
  recoveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  recoveryText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // --- MODAL LAYOUT ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  creatorModalView: {
    backgroundColor: "#18181b",
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 30,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  creatorInput: {
    backgroundColor: "#27272a",
    color: "white",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 20,
    width: "100%",
  },
  label: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
    alignSelf: "flex-start",
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
  createButton: {
    flexDirection: "row",
    backgroundColor: THEME.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  createButtonText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },

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
  cardSubtitle: { color: THEME.textDim, fontSize: 12, letterSpacing: 1 },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Logger Modal
  modalView: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 0,
    height: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "white" },

  // Chips & Switches
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#444",
  },
  activeChip: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  chipText: { color: "#ccc", fontSize: 12, fontWeight: "bold" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#27272a",
    padding: 15,
    borderRadius: 10,
  },

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

  // Inputs
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

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  statChip: {
    alignItems: "center",
    backgroundColor: "#333",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
    minWidth: 100,
  },
  statLabel: {
    color: "#bef264",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: { color: "white", fontSize: 16, fontWeight: "900" },

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
    marginBottom: 20,
  },
  saveButtonText: {
    color: "black",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
});
