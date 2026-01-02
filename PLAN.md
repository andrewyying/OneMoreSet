# PLAN.md — Workout Timer (Expo + React Native) for TestFlight

## 0) Goal
Build a simple, reliable workout interval timer mobile app using **Expo (React Native)**, first shipped to **TestFlight**. Core features:
- User can **create/edit workout schedules** made of steps (exercise/rest/etc.)
- Each step has **duration (seconds)**, optional **repeats**, and optional **interval behavior**
- Run the workout with a **seconds countdown**, clear UI, and responsive layout
- Persist schedules locally (no backend)

Non-goals (v1): accounts, cloud sync, social, analytics.

---

## 1) Product Requirements (v1)
### Must-have
1. **Schedule Builder**
   - Create schedule with a name
   - Add steps with:
     - `label` (e.g., “Push-ups”, “Rest”)
     - `type` (exercise | rest | other)
     - `durationSec` (integer, >=1)
     - `color` (optional)
   - Reorder steps (drag or up/down buttons)
   - Duplicate step
   - Delete step
   - Save schedule
2. **Workout Player**
   - Select a schedule and start
   - Countdown per step, update every second
   - Controls: **Start / Pause / Resume / Next / Previous / Restart**
   - Display:
     - current step label + remaining time
     - total remaining time (optional but easy)
     - progress bar for current step
     - upcoming step preview (next label + duration)
   - At step transitions: **haptic + sound** (basic)
3. **Responsive Design**
   - Good on small phones and large phones
   - Layout scales cleanly; key controls accessible
4. **Local Persistence**
   - Save schedules locally (AsyncStorage or SQLite)
   - Data survives app restart

---

## 2) UX / Screens
### Screen A — Schedule List
- List of schedules (name, step count, total duration)
- CTA: “New Schedule”
- Tap schedule: open Schedule Editor
- Long press / menu: duplicate / delete

### Screen B — Schedule Editor
- Header: schedule name (editable)
- Step list:
  - Row shows label, type badge, duration
  - Controls: reorder (prefer drag), duplicate, delete
- Add Step:
  - label input
  - type selector (segmented)
  - duration picker (number input + +/-)
  - optional color
- Save button (top-right)
- Validate: schedule must have >=1 step; each duration >=1

### Screen C — Player
- Big timer (MM:SS)
- Current label + type
- Step progress indicator
- Controls row: Prev | Play/Pause | Next
- Secondary: Restart, Quit
- Small panel: Next step preview + total remaining

Navigation: use `@react-navigation/native` (stack).

---

## 3) Data Model
Store everything locally as JSON.

```ts
type StepType = "exercise" | "rest" | "other";

type Step = {
  id: string;
  label: string;
  type: StepType;
  durationSec: number;
  color?: string; // hex
};

type Schedule = {
  id: string;
  name: string;
  steps: Step[];
  createdAt: number;
  updatedAt: number;
};

Derived fields (computed, not stored):

```ts
totalDurationSec = steps.reduce(...)
```


## 4) State Management

Keep it simple:

- Use **React Context** + reducer for schedules OR use Zustand.
- For v1, Context is enough.

Modules:

- `ScheduleStore`:
    - `schedules: Schedule[]`
    - CRUD actions: create/update/delete/duplicate
    - persistence layer: load on app start, save on changes

Player state should NOT be in global store; keep it inside Player screen:

- `status: "idle" | "running" | "paused" | "finished"`
- `scheduleId`
- `currentStepIndex`
- `remainingSec`
- `startedAt` (optional)
- `history` (optional)

## 5) Timer Engine (critical)

### Requirements

- Countdown must be stable (avoid drift as much as possible)
- Works when app is foregrounded; background behavior best-effort

### Approach

Use a “tick” loop (setInterval at 250ms or 500ms) but compute remaining time from real timestamps to reduce drift.

Pseudo:

1. When starting a step:
    - `stepStartMs = Date.now()`
    - `stepDurationMs = durationSec * 1000`
2. On each tick:
    - `elapsed = Date.now() - stepStartMs`
    - `remainingMs = max(0, stepDurationMs - elapsed)`
    - `remainingSec = ceil(remainingMs / 1000)`
3. When `remainingMs === 0`:
    - transition to next step
    - trigger haptic/sound once per transition

Edge cases:

- Pause: store `pausedRemainingMs`, clear interval
- Resume: set `stepStartMs = Date.now() - (stepDurationMs - pausedRemainingMs)`
- Next/Prev: reset to new step’s full duration

Important: keep transition logic idempotent to avoid double-advance when tick fires twice around 0.

---

## 6) Tech Stack

- Expo (latest stable)
- TypeScript
- React Navigation (native stack)
- AsyncStorage for persistence
- expo-haptics + expo-av for cues
- expo-splash-screen optional polish

UI:

- Use React Native core components + `StyleSheet`
- Consider `react-native-safe-area-context`
- Optional: `react-native-gesture-handler` + `react-native-draggable-flatlist` for drag reorder (only if stable)

---

## 7) File/Folder Structure

```
/app (if using expo-router) OR /src (if classic)
  /src
    /components
      TimerDisplay.tsx
      PrimaryButton.tsx
      StepRow.tsx
      DurationInput.tsx
    /screens
      ScheduleListScreen.tsx
      ScheduleEditorScreen.tsx
      PlayerScreen.tsx
    /store
      schedules.ts (context + reducer)
      storage.ts (AsyncStorage helpers)
    /lib
      time.ts (format MM:SS, clamp, etc.)
      ids.ts (uuid)
    /types
      models.ts
App.tsx

```

Pick ONE routing approach:

- **Option A (simpler):** React Navigation stack in `App.tsx`
- **Option B:** expo-router (nice, but adds conventions). For v1, Option A is fine.

## 8) Persistence Plan

Use AsyncStorage with one key:

- `@workout_timer/schedules`

On app launch:

- load schedules
- if none exist, create a default sample schedule (e.g., “Demo: 30s on / 10s rest x 8” as explicit steps)

Saving strategy:

- Save whenever schedules array changes (debounce 300ms)
- Ensure `updatedAt` is set on update

---

## 9) Validation Rules

- Schedule name: non-empty (fallback “Untitled”)
- At least 1 step
- Step label: non-empty (fallback “Step 1”, etc.)
- durationSec: integer >= 1, cap at e.g. 3600 for sanity
- Prevent invalid JSON shape on load: sanitize or reset to empty

---

## 10) Responsive Design Rules

- Use `SafeAreaView`
- Use `useWindowDimensions()` for scaling:
    - Timer font size scales with width (clamp)
- Avoid fixed pixel heights for major sections
- Buttons should remain reachable on smaller devices:
    - prefer stacked layout if height is tight

---

## 11) Testing Checklist (manual)

Schedule Builder:

- create schedule
- add/edit/reorder/duplicate/delete step
- persist after relaunch
    
Player:
    
- start/pause/resume
- next/prev
- restart
- finish schedule
- ensure no double-advance at 0
- rotate device (layout stable, state preserved)

---

## 12) Build & Deploy to TestFlight (high level)

- Use EAS build + EAS submit
- Configure iOS bundle identifier
- Ensure Apple Developer account + App Store Connect app created
- Build with `eas build -p ios`
- Submit with `eas submit -p ios`
- TestFlight internal testing setup

(Implementation details should live in a separate `DEPLOY.md` if needed.)

---

## 13) Cursor Instructions (how to use this file)

When implementing:

1. Start by scaffolding Expo TS project
2. Implement Schedule store + persistence
3. Implement ScheduleListScreen
4. Implement ScheduleEditorScreen
5. Implement PlayerScreen + timer engine
6. Add haptics/sound
7. Polish responsive layout
8. Prepare EAS config and TestFlight build

Coding constraints:

- Keep logic pure and testable (timer engine functions in `/lib`)
- Avoid over-engineering (no backend, no complex state libs unless needed)

---

## 14) Definition of Done (v1)

- User can build schedules and run them with stable countdown
- Works on iPhone via TestFlight
- Data persists locally
- UI looks acceptable across common screen sizes
- No crashes in basic flows

