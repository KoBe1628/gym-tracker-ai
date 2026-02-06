# Project: Gym Tracker AI

**Repo:** [https://github.com/KoBe1628/gym-tracker-ai]
**Tech Stack:** React Native (Expo), Supabase, TypeScript, AI-Assisted Workflow

---

## Why I Built This

I have been an athlete for years, and existing gym apps always felt clunky or disconnected from the actual training experience. They were either simple spreadsheets (boring) or overly complex tools that took too long to log a set.

**I built Gym Tracker AI to solve my own problems:**

1.  **Frictionless Logging:** I hated typing the same weights every week. I built **"Ghost Inputs"** (which pre-fills data from the last session) to make logging take seconds, not minutes.
2.  **Data Integrity:** Most apps ruin your stats if you log a light warm-up set. I built **Smart Analytics** that automatically exclude sets tagged as `[Warm Up]` from 1RM calculations, so the data actually reflects real strength.
3.  **Retention via Gamification:** Consistency is the hardest part of gym life. To fix this, I gamified the entire experience with an **"Iron Rank" RPG system** (leveling up from _Rust Recruit_ to _Titanium God_) and a **Consistency Flame** to encourage showing up.

I didn't just want a database of numbers; I wanted an app that felt like a "Pro" coach in my pocket—complete with haptic feedback, recovery intelligence, and a personalized "Theme Studio."

---

## Secret Hacks: Teaching Others to Master AI Coding Tools

Building this app wasn't just about writing code; it was about **orchestrating AI**. Here are the "Secret Hacks" I use to move fast and build high-quality products with tools like ChatGPT/Cursor/Claude:

### 1. The "Context-First" Protocol

AI is only as good as its context. Most people just paste an error. I teach a "Context Sandwich" method:

- **Top Bun:** The goal ("I want to add a Rest Timer that notifies me in the background").
- **Meat:** The current relevant file content (e.g., `RestTimer.tsx`).
- **Bottom Bun:** The constraints ("Use `expo-notifications`, handle the Expo Go limitations gracefully").
- _Result:_ The AI writes production-ready code on the first try, rather than guessing.

### 2. "Vibe-Check" Iterations

AI is great at logic, but bad at "feel." I use a specific workflow for UI/UX:

- **Step 1:** Ask for the functional component (Logic).
- **Step 2:** Ask for the "Polish" separately ("Add Haptic feedback on button press," "Add a Confetti explosion on PRs," "Make the Start button full-width for better Fitts's Law ergonomics").
- **Hack:** Explicitly asking the AI to "act like a Product Designer" unlocks suggestions you wouldn't get from a standard "Senior Dev" persona.

### 3. The "Janitor" Mindset for Maintenance

As a project grows, AI context windows get cluttered. I practice (and teach) aggressive **Documentation Driven Development**:

- Every time I finish a major feature, I ask the AI to **update the README** or a `architecture.md` file.
- When starting a new feature, I feed that updated documentation back into the chat. This acts as "long-term memory" for the AI, preventing it from hallucinating old code structures.

### 4. Error-Driven Learning

Instead of fearing errors, I use them as instant documentation. When a crash occurs (like a `setState` update during a render), I don't just ask for the fix—I ask **"Why is this an anti-pattern in React?"** This turns every bug into a micro-lesson, allowing me to understand the _why_ behind the _what_, which is crucial when explaining the code to others.
