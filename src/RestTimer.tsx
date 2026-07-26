import React, { useEffect, useState, useRef } from "react";
import {
  AppState,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import {
  scheduleRestNotification,
  cancelRestNotification,
} from "./lib/notifications";

export default function RestTimer({
  initialSeconds = 90,
  onClose,
}: {
  initialSeconds: number;
  onClose: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  // Ref to prevent double-firing the finish logic
  const hasFinished = useRef(false);
  const endTimeRef = useRef<number | null>(null);

  async function startTimer() {
    endTimeRef.current = Date.now() + initialSeconds * 1000;

    try {
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === "granted") {
        await scheduleRestNotification(initialSeconds);
      }
    } catch (e) {
      console.log("Notification setup failed (Expected in Expo Go):", e);
    }
  }

  // 1. Setup & Teardown
  useEffect(() => {
    void startTimer();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isActive) return;

      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        const next = prev - 1;

        if (next === 0) {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        } else if (next <= 3) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      cancelRestNotification(); // Clean up if user closes early
    };
  }, [isActive]); // Re-run if pause/play changes

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        !isActive ||
        nextAppState !== "active" ||
        endTimeRef.current === null
      ) {
        return;
      }

      const remainingMs = endTimeRef.current - Date.now();

      if (remainingMs <= 0) {
        endTimeRef.current = null;
        setTimeLeft(0);
        return;
      }

      setTimeLeft(Math.ceil(remainingMs / 1000));
    });

    return () => {
      subscription.remove();
    };
  }, [isActive]);

  // 2. Watcher: This fixes the "Cannot update component" error 🛡️
  useEffect(() => {
    if (timeLeft === 0 && !hasFinished.current) {
      hasFinished.current = true; // Mark as done so we don't loop
      finishTimer();
    }
  }, [timeLeft]);

  function finishTimer() {
    onClose(); // Safe to call here!
  }

  function addTime(seconds: number) {
    setTimeLeft((prev) => {
      const newTime = prev + seconds;
      endTimeRef.current = Date.now() + newTime * 1000;
      scheduleRestNotification(newTime);
      return newTime;
    });
  }

  function subtractTime(seconds: number) {
    setTimeLeft((prev) => {
      const newTime = Math.max(0, prev - seconds);
      endTimeRef.current = newTime > 0 ? Date.now() + newTime * 1000 : null;
      scheduleRestNotification(newTime);
      return newTime;
    });
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label}>REST TIMER</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="black" />
          </TouchableOpacity>
        </View>

        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => subtractTime(10)}
          >
            <Text style={styles.controlText}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: "#333" }]}
            onPress={() => setIsActive(!isActive)}
          >
            <Ionicons
              name={isActive ? "pause" : "play"}
              size={20}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => addTime(10)}
          >
            <Text style={styles.controlText}>+10s</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  content: {
    backgroundColor: "#18181b",
    width: "100%",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    color: "#bef264",
    fontWeight: "bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  closeBtn: {
    backgroundColor: "#bef264",
    borderRadius: 15,
    padding: 2,
  },
  timerText: {
    color: "white",
    fontSize: 48,
    fontWeight: "900",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    marginBottom: 15,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
  },
  controlBtn: {
    backgroundColor: "#27272a",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  controlText: {
    color: "white",
    fontWeight: "bold",
  },
});
