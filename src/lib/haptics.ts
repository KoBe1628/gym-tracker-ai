import * as Haptics from "expo-haptics";

export const feedback = {
  // Light "Click" (For buttons like "Log Set")
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium "Thud" (For navigation or toggles)
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy "Bump" (For finishing a workout)
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Success "Da-Ding!" Pattern (For Badges/Timer)
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Error "Buzz-Buzz" (For delete/errors)
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
