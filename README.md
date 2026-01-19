# 🏋️‍♂️ AI-Powered Workout Tracker

A smart fitness companion built with **React Native** and **Supabase** that tracks progress, visualizes muscle engagement, and analyzes strength trends with RPG-style gamification.

![App Demo]

https://github.com/user-attachments/assets/ed34540c-bf24-4428-89e6-64ab5b0062e5

## 🚀 Key Features

### 🧠 Smart Coaching & Analytics

- **Recovery Intelligence:** Visual "Battery" indicators on every exercise card showing if a muscle is `[Recovering]` or `[Fresh]` based on your last 48h of training.
- **Strength Trendlines:** Dynamic "Sparkline" graphs inside the logging modal that visualize your estimated 1RM momentum over the last 10 sessions.
- **Ghost Inputs:** The app remembers your last set's weight and reps, pre-filling the inputs to reduce logging time to seconds.
- **Smart Analytics:** Logic that automatically excludes sets tagged as `[Warm Up]` from your strength stats to ensure data accuracy.
- **Physique Symmetry Analysis:** An intelligent "Push vs. Pull" ratio visualizer to detect muscle imbalances.

### 🎮 Gamification (RPG System)

- **Iron Ranks:** A lifetime volume tracker that levels you up from "Rust Recruit" 🥉 to "Titanium God" 💎 based on total tonnage lifted.
- **Consistency Flame:** A "Weekly Streak" counter (🔥) that encourages habit building without punishing rest days.
- **The Hall of Fame:** A dedicated trophy room displaying your all-time PRs for every exercise in a "Gold Card" format.
- **Weekly Volume Vault:** A dynamic progress bar tracking total tonnage lifted per week.

### 🛠️ Utilities & Customization

- **"The Lab" (Custom Exercises):** Users can create custom movements, assign target muscles, and toggle "Bodyweight" logic (which hides the plate calculator).
- **Home Gym Inventory:** Fully customizable Plate Calculator settings—users can define their bar weight and toggle available plates (e.g., for home gyms with limited weights).
- **Muscle Heatmap:** Dynamic SVG visualization that highlights worked muscle groups based on recent activity.
- **Routine Builder:** CRUD functionality for creating and editing custom workout splits.

## 🛠 Tech Stack

- **Frontend:** React Native (Expo), TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Database Security:** Row Level Security (RLS) policies ensuring complete user data privacy.
- **State/Storage:** `@react-native-async-storage/async-storage` (Local Preferences).
- **Visualization:** `react-native-svg` (Custom implementation), `react-native-calendars`.
- **UX/UI:** Haptic Feedback, Animated Confetti, Custom SVG Components.

## 🏗️ How to Run

1.  Clone the repo:
    ```bash
    git clone [https://github.com/KoBe1628/gym-tracker-ai.git](https://github.com/KoBe1628/gym-tracker-ai.git)
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the app:
    ```bash
    npx expo start
    ```
