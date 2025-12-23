import { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { supabase } from "./src/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons"; // Icons for the tab bar

// SCREENS
import Auth from "./src/Auth";
import ExerciseList from "./src/ExerciseList";
import Profile from "./src/Profile";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentTab, setCurrentTab] = useState<"home" | "profile">("home"); // Simple state navigation

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // 1. IF NOT LOGGED IN -> Show Auth
  if (!session || !session.user) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#121212",
        }}
      >
        <Auth />
      </View>
    );
  }

  // 2. IF LOGGED IN -> Show App with Tabs
  return (
    <View style={styles.container}>
      {/* MAIN CONTENT AREA */}
      <View style={styles.content}>
        {currentTab === "home" ? <ExerciseList /> : <Profile />}
      </View>

      {/* CUSTOM BOTTOM TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("home")}
        >
          <Ionicons
            name={currentTab === "home" ? "barbell" : "barbell-outline"}
            size={28}
            color={currentTab === "home" ? "#bef264" : "#666"}
          />
          <Text
            style={{
              color: currentTab === "home" ? "#bef264" : "#666",
              fontSize: 10,
              fontWeight: "bold",
            }}
          >
            WORKOUT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("profile")}
        >
          <Ionicons
            name={currentTab === "profile" ? "person" : "person-outline"}
            size={28}
            color={currentTab === "profile" ? "#bef264" : "#666"}
          />
          <Text
            style={{
              color: currentTab === "profile" ? "#bef264" : "#666",
              fontSize: 10,
              fontWeight: "bold",
            }}
          >
            PROFILE
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  content: { flex: 1 }, // Takes up all space above the tab bar

  // Floating Tab Bar Style
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingBottom: 30, // Extra padding for iPhone Home Indicator
    paddingTop: 15,
    justifyContent: "space-around",
  },
  tabItem: {
    alignItems: "center",
    gap: 4,
  },
});
