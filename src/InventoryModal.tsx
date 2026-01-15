import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Standard available plate types to toggle
const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25];

interface InventoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (barWeight: number, plates: number[]) => void;
}

export default function InventoryModal({
  visible,
  onClose,
  onSave,
}: InventoryModalProps) {
  const [barWeight, setBarWeight] = useState("20");
  const [selectedPlates, setSelectedPlates] = useState<number[]>(ALL_PLATES);

  useEffect(() => {
    if (visible) loadSettings();
  }, [visible]);

  const loadSettings = async () => {
    try {
      const storedBar = await AsyncStorage.getItem("barWeight");
      const storedPlates = await AsyncStorage.getItem("availablePlates");

      if (storedBar) setBarWeight(storedBar);
      if (storedPlates) setSelectedPlates(JSON.parse(storedPlates));
    } catch (e) {
      console.error("Failed to load inventory");
    }
  };

  const togglePlate = (plate: number) => {
    if (selectedPlates.includes(plate)) {
      setSelectedPlates(selectedPlates.filter((p) => p !== plate));
    } else {
      setSelectedPlates([...selectedPlates, plate].sort((a, b) => b - a));
    }
  };

  const handleSave = async () => {
    const weight = parseFloat(barWeight) || 20;
    // Ensure plates are sorted descending for the math logic later
    const sortedPlates = selectedPlates.sort((a, b) => b - a);

    await AsyncStorage.setItem("barWeight", weight.toString());
    await AsyncStorage.setItem("availablePlates", JSON.stringify(sortedPlates));

    onSave(weight, sortedPlates);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>GYM INVENTORY ⚙️</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {/* 1. Barbell Weight */}
            <Text style={styles.label}>BARBELL WEIGHT (KG)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={barWeight}
              onChangeText={setBarWeight}
              placeholder="20"
              placeholderTextColor="#555"
            />

            {/* 2. Plate Toggles */}
            <Text style={styles.label}>AVAILABLE PLATES</Text>
            <View style={styles.grid}>
              {ALL_PLATES.map((plate) => {
                const isActive = selectedPlates.includes(plate);
                return (
                  <TouchableOpacity
                    key={plate}
                    style={[
                      styles.plateBtn,
                      isActive ? styles.plateActive : styles.plateInactive,
                    ]}
                    onPress={() => togglePlate(plate)}
                  >
                    <Text
                      style={[
                        styles.plateText,
                        isActive ? styles.textActive : styles.textInactive,
                      ]}
                    >
                      {plate}kg
                    </Text>
                    {isActive && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="black"
                        style={{ position: "absolute", top: -5, right: -5 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>SAVE SETTINGS</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalView: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
    letterSpacing: 1,
  },
  label: {
    color: "#bef264",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#27272a",
    color: "white",
    fontSize: 18,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
  },
  plateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: "28%",
    alignItems: "center",
    justifyContent: "center",
  },
  plateActive: {
    backgroundColor: "#bef264",
    borderColor: "#bef264",
  },
  plateInactive: {
    backgroundColor: "transparent",
    borderColor: "#444",
  },
  plateText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  textActive: { color: "black" },
  textInactive: { color: "#666" },
  saveBtn: {
    backgroundColor: "#bef264",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: {
    color: "black",
    fontWeight: "900",
    fontSize: 16,
  },
});
