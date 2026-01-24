import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 1. Configure how notifications behave when the app is FOREGROUNDED
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Request Permissions
export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission not granted!");
    return false;
  }
  return true;
}

// 3. Schedule the "Time's Up" Alert
export async function scheduleRestNotification(seconds: number) {
  // Cancel any existing timers first to be safe
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚡ Time's Up!",
      body: "Get back under the bar. Let's crush this set.",
      sound: true,
    },
    trigger: {
      seconds: seconds, // Schedule for X seconds from now
    },
  });
}

// 4. Cancel if user closes timer early
export async function cancelRestNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
