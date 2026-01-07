# 🏋️‍♂️ AI-Powered Workout Tracker

A smart fitness companion built with **React Native** and **Supabase** that tracks progress, visualizes muscle engagement, and analyzes strength trends.

![App Demo]

https://github.com/user-attachments/assets/ed34540c-bf24-4428-89e6-64ab5b0062e5

## 🚀 Key Features

- **Smart Logging & Tabbed UI:** A clean, modal-based interface separating "Log Inputs" from "History Charts," featuring auto-scroll support and keyboard handling.
- **Physique Symmetry Analysis:** An intelligent "Push vs. Pull" ratio visualizer that analyzes training history to detect muscle imbalances and prevent injury.
- **Contextual Tagging System:** Users can tag sets as `[Failure]`, `[Drop Set]`, or `[Warm Up]` to track fatigue and intensity alongside raw volume.
- **Gamified Progress:**
  - **Weekly Volume Vault:** A dynamic progress bar tracking total tonnage lifted per week.
  - **PR Detector:** Intelligent alerts and confetti celebrations when a user breaks a personal record.
  - **"Level Complete" Summaries:** A receipt-style popup summarizing duration, volume, and muscles worked after every session.
- **Muscle Heatmap:** Dynamic SVG visualization that highlights worked muscle groups based on recent activity.
- **Interactive Plate Calculator:** Visual tool that automatically calculates and displays which plates to load on the bar.
- **Time Machine History:** Interactive Consistency Calendar allowing users to tap past dates and view detailed summaries of previous workouts.
- **Routine Builder:** CRUD functionality for creating and editing custom workout splits.

## 🛠 Tech Stack

- **Frontend:** React Native (Expo), TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Database Security:** Row Level Security (RLS) policies ensuring complete user data privacy.
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
