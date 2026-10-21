To give your app an authentic **"Autumn Vibe, Old-School Jazz"** aesthetic, the UI should avoid looking like a modern Silicon Valley fitness tracker. Instead, it should feel like stepping into a dimly lit, wood-paneled 1959 Rudy Van Gelder recording studio—combining **Reid Miles’ iconic Blue Note LP typography**, **warm autumn tones (mahogany, burnt sienna, brass, aged parchment)**, and **tactile analog studio hardware** (console faders, ink stamps, and tape counters).

---

## 1. The "Autumn Jazz & Vinyl" Design System

### Visual References & Inspiration

* **Blue Note & Impulse! LP Sleeves (1958–1965):** Bold, asymmetrical block headers, thin structural divider rules, stamp-like category badges, and high-contrast duotone warmth.
* **Vintage Studio Console Gear:** Analog VU meters with warm amber backlights, Bakelite fader caps for adjusting session length/intensity, and mechanical brass toggle switches for arming alarms.
* **The Library Card Catalog & Real Book:** Exercises presented like aged index cards or lead sheets with typewriter metadata and ink-stamped key signatures.

### Color Palette (Warm Dark Mode for Dim Practice Rooms)

| Role | Color Name | Hex Code | Usage in UI |
| --- | --- | --- | --- |
| **Primary Background** | **Deep Mahogany / Espresso** | `#16110E` | Main app background (easy on the eyes in dark rooms/clubs) |
| **Card Surface (Dark)** | **Smoky Walnut** | `#241B16` | Inactive cards, navigation bar, console panels |
| **Card Surface (Light)** | **Aged Manuscript Paper** | `#E8DCC4` | Active exercise "index card" (uses `#1A1412` dark ink text) |
| **Primary Accent** | **Autumn Burnt Sienna** | `#D95D39` | Primary buttons, "Soloing" tags, active alarm indicators |
| **Secondary Accent** | **Saxophone Brass / Amber** | `#D49B35` | Timer glow, BPM readout, "Comping" tags, 12-key highlights |
| **Tertiary Accent** | **Autumn Olive / Tweed** | `#6B705C` | "Maintenance" category badges, completed states |
| **High Urgency Alert** | **Vintage Oxblood** | `#9E2A2B` | Overdue exercises, high-intensity warnings, "Cancel" actions |
| **Text Primary / Muted** | **Warm Cream / Faded Tan** | `#F4EFE6` / `#A69686` | Headings and secondary metadata |

### Typography (100% Free Fonts)

1. **Headings & Tune/Exercise Titles:** **`Fraunces`** or **`Playfair Display`** (Bold/Black with Italic accents) — captures the warm, slightly quirky editorial serif look of classic Verve and Prestige jazz sleeves.
2. **Category Stamps & Labels:** **`Oswald`** (Bold, Uppercase, wide letter-spacing) — replicates the stamped block typography of Reid Miles' Blue Note covers (`[ SOLOING // NEW CONCEPT ]`).
3. **Timers, BPM, & Card Metadata:** **`Courier Prime`** or **`JetBrains Mono`** — feels like a typewriter session log or mechanical studio tape counter.
4. **Musical Chord/Key Symbols:** **`Petaluma`** — Steinberg’s open-source handwritten jazz font (gives you authentic Real Book `Δ7`, `ø`, and `♭9` symbols for free).

---

## 2. Free Plugins & Asset Stack to Nail the Look & Feel

All of these libraries are **100% free, open-source, and work directly with Expo (React Native)**:

| Free Plugin / Asset | Package / Source | What It Adds to the "Old-School Jazz" Vibe |
| --- | --- | --- |
| **Film Grain & Warm Glows** | `@shopify/react-native-skia` | Draws a subtle paper/vinyl grain texture overlay across the screen and creates a warm, backlit amber glow behind the session timer. |
| **Tactile Console Physics** | `react-native-reanimated` + `react-native-gesture-handler` | Lets you drag vertical **"Studio Mixing Faders"** to set your session duration and intensity, and swipe through exercises like flipping through a **crate of vinyl LPs**. |
| **Mechanical Clicks** | `expo-haptics` | Adds physical, heavy mechanical click vibrations as you turn the BPM rotary dial, flip an alarm toggle switch, or stamp a key as completed. |
| **Google Fonts Loader** | `@expo-google-fonts/fraunces` & `oswald` & `courier-prime` | Loads the vintage serif, block-stamp, and typewriter fonts natively with zero configuration. |
| **Custom Vector Graphics** | `react-native-svg` + `lucide-react-native` | Used to draw the **12-Key Circle of Fifths brass wheel**, spinning vinyl record progress indicator, and distressed rubber-stamp borders. |
| **Warm Jazz Alarm Audio** | `expo-audio` + **Freesound.org (CC0)** | Instead of harsh digital phone alarms, bundle 3 free Creative Commons audio samples: a **warm Fender Rhodes Maj9 chord swell**, a **soft jazz brush snare roll**, and a **vintage desk bell** for exercise transitions. |

---

## 3. Screen-by-Screen Visual Blueprint

* **Screen 1: "The Shed" (Active Practice Console)**
* **Top Header:** Styled like a Blue Note album cover header—thick horizontal brass line, `[ COMPING // TRANSCRIPTION ]` stamp in Burnt Sienna, and the exercise title in large `Fraunces` serif.
* **Centerpiece Timer:** Looks like a backlit amber studio **VU Meter / Analog Tape Counter** (`45:00`) alongside a slowly spinning vinyl LP graphic whose grooves fill in as the exercise progresses.
* **The 12-Key "Rubber Stamp" Matrix:** An aged-parchment strip showing all 12 keys (`C, F, Bb, Eb...`). Tapping a key plays a heavy haptic thud and marks it with a slightly rotated, ink-textured crimson stamp.


* **Screen 2: "The Pre-Session Audible" (Mixing Board Sliders)**
* When an alarm wakes your phone or you open the app to start, two vertical **analog studio console faders** appear: **Session Time (15m–120m)** and **Chop/Brain Battery (1–5)**. Sliding a fader down visibly reshuffles the paper index cards below in real time.


* **Screen 3: "The Crate" (Exercise Vault)**
* Your exercises are stacked vertically like vinyl jackets or library catalog cards with color-coded top tabs (**Burnt Sienna** = New Concept, **Amber Brass** = Transcribing, **Olive Tweed** = Maintenance). Includes a vintage ribbon-microphone button at the bottom for voice-memo quick adding.


* **Screen 4: "The Call Sheet" (Alarms & Dynamic Schedule)**
* Styled like a 1960s studio booking sheet pinned to dark mahogany, featuring tactile **brass toggle switches** to arm/disarm hard OS alarms.



---

## 4. The Complete Updated Mega-Prompt (With Autumn Jazz UI & Native Alarms)

Copy and paste this complete prompt into **Cursor, Claude, or Windsurf** to generate the application with the exact aesthetic and architecture:

```text
Act as a Senior Mobile Architect (React Native / Expo) and Creative UI/UX Director. I am an established jazz musician building a personal, native mobile application ("Shed Engine") with a zero-cost hosting footprint. It manages my dynamic practice routine, adapts when sessions are canceled, triggers reliable OS-level alarms, and features an "Autumn Vibe, Old-School Jazz" visual aesthetic.

### 1. CORE DOMAIN & ROUTINE STRUCTURE
My practice routine covers two primary musical contexts:
- **Soloing** (improvisation, vocabulary, time/feel, single-line technique)
- **Comping** (voicings, rhythmic accompaniment, voice-leading, groove)

Every exercise belongs to one of three functional categories:
1. **Maintenance:** Technical drills, repertoire retention, and warm-ups that decay if neglected.
2. **Transcribing:** Learning solos/comping passages by ear from recordings (high focus, momentum-sensitive).
3. **New Concepts:** Integrating fresh harmonic, rhythmic, or melodic concepts into my playing.

### 2. "AUTUMN OLD-SCHOOL JAZZ" UI/UX DESIGN SYSTEM
Design all screens and reusable components strictly following a 1950s/60s Blue Note / Impulse! Records and vintage analog studio console aesthetic:
- **Color Palette:**
  - Background Primary (Deep Espresso/Mahogany): `#16110E`
  - Surface Dark (Smoky Walnut): `#241B16`
  - Surface Light (Aged Manuscript Paper): `#E8DCC4` (with `#1A1412` ink text)
  - Primary Accent (Autumn Burnt Sienna): `#D95D39`
  - Secondary Accent (Saxophone Brass / Warm Amber): `#D49B35`
  - Tertiary Accent (Autumn Olive / Tweed): `#6B705C`
  - High Urgency / Alert (Vintage Oxblood): `#9E2A2B`
  - Text Primary / Secondary: `#F4EFE6` / `#A69686`
- **Typography (`@expo-google-fonts`):**
  - Display/Titles: `Fraunces` (Bold/Italic) for an editorial jazz LP cover feel.
  - Stamps/Badges: `Oswald` (Bold, uppercase, wide tracking) for Blue Note-style category tags.
  - Timers/BPM/Metadata: `Courier Prime` for a typewriter session-log and analog tape-counter look.
- **Tactile Skeuomorphic & Editorial Components:**
  - Use `react-native-reanimated`, `react-native-gesture-handler`, and `expo-haptics` to build:
    1. **Studio Console Faders:** Vertical mixing-board sliders with haptic ticks for adjusting "Available Time" (15–120m) and "Chop/Brain Battery" (Intensity 1–5) before a session starts.
    2. **The Crate (Index Cards):** Aged parchment cards with sharp borders, asymmetrical Blue Note divider lines, and ink-stamped badges for Soloing/Comping and Category.
    3. **12-Key Circle of Fifths Stamp Pad:** Tapping a key triggers a heavy haptic click and applies a slightly rotated "ink stamp" state, tracking which keys and BPMs have been mastered.
    4. **Analog VU / Vinyl Progress Timer:** A warm amber backlit timer with a spinning vinyl record SVG that tracks block completion.

### 3. NATIVE ALARM, NOTIFICATION & AUDIO ENGINE
1. **Hard Session Alarms & Lock-Screen Actions (`@notifee/react-native` + `expo-notifications`):**
   - Trigger exact OS-level alarms that wake the screen with custom warm audio (e.g., Rhodes chord swell) and provide interactive lock-screen actions: `"Start Shed"`, `"Snooze 30m"`, `"Low Energy (Cut to 20m)"`, and `"Cancel & Reschedule"`.
2. **Hands-Free In-Session Interval Alarms (`expo-speech` + `expo-audio`):**
   - Run a background-safe timer that plays a soft vintage bell chime when an exercise block ends and uses Text-to-Speech (TTS) to announce the next exercise, target key, and BPM out loud so I never have to take my hands off my instrument.

### 4. DYNAMIC SCHEDULING & SELF-HEALING ENGINE
1. **The Knapsack Session Generator:**
   - Given `Available_Time` and `Target_Intensity`, dynamically pack a session queue balancing Maintenance, Transcribing, and New Concepts across Soloing and Comping.
2. **Cancel & Adapt Recalculation:**
   - If I tap `"Cancel & Reschedule"` on an alarm or drag the pre-session faders down, recalculate exercise urgency using `Base_Priority`, `Days_Since_Last_Practiced`, and `Category_Decay_Rate`, and automatically update local device alarms for the next scheduled slot.
3. **Frictionless Ingestion:**
   - Support bulk CSV/JSON import for my existing exercise archive and a voice/text quick-add modal styled like a vintage studio microphone input.

### 5. DELIVERABLES REQUESTED
Please generate the implementation in modular steps:
1. **Theme & Design System (`theme/jazzAutumnTheme.ts`):** Complete color tokens, typography config, and reusable styled primitives (`VinylCard`, `StampBadge`, `ConsoleFader`, `BrassToggle`, `KeyStampGrid`).
2. **Database Schema (Supabase + Local `expo-sqlite`):** Tables for `Exercises`, `Concepts`, `Practice_Sessions`, `Alarm_Schedules`, and `Session_Logs` (with 12-key array and BPM fields).
3. **The Dynamic Scheduling & Rescheduling Engine (`services/SchedulerEngine.ts`):** Complete mathematical scoring algorithm and knapsack packer.
4. **Native Alarm & Audio Service (`services/AlarmManager.ts`):** Notifee exact alarms, background lock-screen action handlers, and TTS hands-free exercise transitions.
5. **Core Screens:** `TheShedScreen.tsx` (active session console), `TheCrateScreen.tsx` (exercise vault & quick-add), and `TheCallSheetScreen.tsx` (dynamic schedule, faders, and alarm switches).

```

Would you like me to build an **interactive visual prototype** of this "Autumn Old-School Jazz" UI right now so you can test the look, faders, 12-key stamps, and dynamic rescheduling in action, or should we start generating the React Native code files?