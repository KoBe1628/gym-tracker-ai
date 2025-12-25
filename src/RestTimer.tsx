import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { feedback } from "./lib/haptics";

const THEME = {
  primary: "#bef264",
  card: "#1E1E1E",
};

export default function RestTimer({
  initialSeconds = 90,
  onClose,
  onAddScroll, // Optional: to add time
}: {
  initialSeconds?: number;
  onClose: () => void;
  onAddScroll?: () => void;
}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      feedback.success(); // 📳 PHONE SHAKES "DA-DING"
    }

    return () => clearInterval(interval);
  }, [isActive, seconds]);

  // Formatting (e.g. 90 -> 1:30)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const addTime = () => setSeconds((s) => s + 30);
  const subtractTime = () => setSeconds((s) => Math.max(0, s - 30));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Controls Left */}
        <TouchableOpacity onPress={subtractTime} style={styles.smallBtn}>
          <Text style={styles.btnText}>-30s</Text>
        </TouchableOpacity>

        {/* Main Timer Display */}
        <View style={styles.timerDisplay}>
          <Text style={styles.label}>REST</Text>
          <Text
            style={[styles.timeText, seconds === 0 && { color: THEME.primary }]}
          >
            {seconds === 0 ? "GO!" : formatTime(seconds)}
          </Text>
        </View>

        {/* Controls Right */}
        <TouchableOpacity onPress={addTime} style={styles.smallBtn}>
          <Text style={styles.btnText}>+30s</Text>
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
  },
  timerDisplay: { alignItems: "center", width: 80 },
  label: { color: "#666", fontSize: 10, fontWeight: "bold", letterSpacing: 1 },
  timeText: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },

  smallBtn: { padding: 10, backgroundColor: "#333", borderRadius: 8 },
  btnText: { color: "white", fontSize: 12, fontWeight: "bold" },

  closeBtn: {
    backgroundColor: "#444",
    width: 25,
    height: 25,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: -10,
    right: -10,
    borderWidth: 2,
    borderColor: "#121212",
  },
});
