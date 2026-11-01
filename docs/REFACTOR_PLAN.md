# Shed Engine — Practice Flow & UI Refactor Plan

Written against commit `43c3e4c` (2026-11-01). Every `file:line` below refers to that commit. If a line number no longer matches, search for the quoted code instead of guessing.

This plan is written for an implementing model. It is deliberately explicit. Follow it phase by phase, in order. Do not skip ahead, do not merge phases, do not improvise new features. Where the plan says "decision", it is already decided.

---

## 0. Rules for the implementer

### 0.1 Workflow

1. One phase at a time. A phase is done only when its **Accept** list passes.
2. After every phase run both commands; both must exit 0 with **no new** output (baseline today: 0 type errors, 0 lint findings):
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```
3. Then run the manual checks listed under **Accept** on the web build (`npx expo start --web`) and, when available, on a phone dev build.
4. Commit at the end of each phase with the message given in that phase. Do not commit mid-phase.

### 0.2 Hard rules (apply to every phase)

1. **No new dependencies.** Do not use `expo-router`, `react-native-reanimated`, or gesture-handler gestures. Phase 0 removes them. Reordering uses up/down buttons, not drag.
2. **Never add new SQL strings to `src/db/repository.ts`.** On web the "database" is a localStorage adapter that dispatches on SQL substrings (`repository.ts:232-520`); SQL it does not recognise silently does nothing. New exercise writes must follow: `getExerciseById` → modify object → `upsertLocalExerciseFromCloud(obj)` → `onCloudPushExercise(obj)`. New documents are stored as JSON in `app_settings` exactly like user sync state (`repository.ts:1218-1282`).
3. **Nothing reachable from `refreshData`, the realtime `onDataUpdated` callback, or `pullAllFromCloud` may call any `save*` or `push*` function.** This is the sync loop that commit `b54e069` fixed.
4. **No colour emoji in UI strings.** Allowed glyphs: `▶ ❚❚ ✓ ✕ ← → ↑ ↓ ♩ • ▾ ▴ −  +`.
5. **Every new `Pressable`** gets `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` (`{selected}`, `{checked}`, or `{disabled}`), and `minHeight: 40` (44 for the single primary action on a screen).
6. **Theme tokens only.** Colours and fonts come from `useTheme()`. No hex literals and no font-family string literals outside `src/theme/tokens.ts`.
7. **Keep the look.** Cream `CreamBlock` cards with the hard ink offset shadow, zero border radius everywhere, Oswald uppercase "stamp" labels with letter-spacing, Fraunces titles, Courier Prime mono metadata, square beat dots, the rotated `StampBadge`, the `KeyStampGrid`, and one `StudioFader` pair on the plan builder. Do not introduce rounded corners, gradients, blur, or system-font text.
8. **One render tree per screen.** Desktop and mobile differ only by layout wrappers (`isDesktop` from `useResponsiveLayout`), never by duplicated JSX. The current screens each contain two full copies; the new ones must not.
9. **Vocabulary** (section 2.5) is mandatory in UI strings, prop names, and file names.

---

## 1. Diagnosis (why practice feels unnatural)

Condensed from four audits (flow, data, UI, services). Each item is verified in code.

**The plan is not a thing.** The practice queue is React state in `App.tsx:74`. It is regenerated from scratch on every fader tick (`App.tsx:144-166`, fired on every drag move by `StudioFader.tsx:123-125`), reset to block 1, and never restored after relaunch. `UserSyncState.activeQueueIds` is never written and `activeQueueIndex` is never read back (write-only).

**No editing.** No remove, reorder, add, or per-block minutes exist anywhere. "PRACTICE NOW" in the library (`App.tsx:189-206`) always injects at position 0 and jumps tabs. "MAKE ACTIVE" in the library never reaches today's plan because reconcile only removes (`SchedulerEngine.ts:113`).

**"Start" does nothing.** `onStartSession` (`App.tsx:279-283`) sets index 0 and switches tabs. There is no session start time, no end, no summary. The last block just reads "✓ LOGGED".

**The practice screen forgets everything on tab switch.** `renderActiveScreen` (`App.tsx:237-287`) unmounts `TheShedScreen`, losing the countdown, metronome, and "already logged" set. The countdown is a 1-second `setInterval` with no wall-clock correction.

**Logging is wrong.** "Mark as finished" and timer-zero both log the exercise's nominal `durationMinutes` (`repository.ts:950`), never elapsed time. `skippedCount` is never incremented by any in-app action (only by an Android notification action). Session BPM gains are shown in history but never offered back to the exercise.

**Hidden scheduler inputs break plans.** The editor hard-codes `intensity: 3, basePriority: 5` on every save (`TheCrateScreen.tsx:175-176, 192-193`), so editing a title resets scheduler weights, and the ENERGY fader at 1 or 2 silently yields an empty plan for every user-created exercise. Presets persist stale minutes due to a closure bug (`TheCallSheetScreen.tsx:249-250` → `App.tsx:149`).

**Clutter.** Thirteen same-weight controls inside the timer well; five buttons per library card; the current song shown in three places at once; "PRIORITY 93%" scheduler internals on cards; 22 distinct glyphs/emoji; theme toggle and cloud credentials in navigation and library headers; history only on desktop.

**Dead weight.** `expo-router` is configured but unused (`AGENTS.md` describes a routing structure that does not exist); eleven native modules are never imported; `src/db/schema.ts` and `src/db/client.ts` are dead and stale.

---

## 2. Target experience

### 2.1 Tabs (in this order; "Today" is the default)

| Tab | Purpose | Replaces |
|---|---|---|
| **TODAY** | Build today's plan, run it, review it. One screen, three states. | Training Room + the planner half of Session Plan |
| **LIBRARY** | All exercises: create, edit, activate, add to today. | Practice Vault |
| **PROGRESS** | History, current song, reminder, settings (theme, sync). | the history half of Session Plan + scattered settings |

The theme toggle leaves the nav bar.

### 2.2 TODAY — three states of one persisted session plan

**BUILDING** (no session started)

1. Header: `TODAY` (Fraunces) + date stamp on the right (`SAT • NOV 01`, mono).
2. **Suggest panel** (`CreamBlock`). Collapsed by default when a plan exists, expanded when the plan is empty. Collapsed row: `SUGGESTION • 45 MIN • ENERGY 3 • ALL FOCUS` with an `ADJUST ▾` stamp link. Expanded: presets row (`QUICK 20 / REGULAR 45 / LONG 90`), the two `StudioFader`s (TIME, ENERGY), a FOCUS segmented control (ALL / SOLOING / COMPING), and, only when the plan has been customised, a `REBUILD PLAN` button with the hint `Replaces your edits`.
   - Rule: while the plan is **not customised**, changing any input regenerates the suggestion live (debounced 300 ms). Once the user removes, reorders, adds, or changes minutes, the plan is **customised** and inputs no longer regenerate; only `REBUILD PLAN` does.
3. **Plan card** (`CreamBlock`): `SectionHeader` `TODAY'S PLAN` with meta `4 EXERCISES • 45 MIN`. Rows: index, title, two badges (context, category) plus `THIS WEEK` badge when homework, a `Stepper` for minutes (`− 15m +`, step 5, min 5, max 60), `↑` `↓` move buttons, `✕` remove. Footer: `+ ADD FROM LIBRARY` (opens the picker modal). Empty state: `No exercises in today's plan.` + `SUGGEST A PLAN` + `ADD FROM LIBRARY`.
4. Primary CTA: `▶ START SESSION` (`lg`, `primary`), disabled when the plan is empty.

**RUNNING**

1. **Session bar** (compact `CreamBlock`): `BLOCK 2 OF 4 • 23 MIN LEFT` left; `END SESSION` (`tertiary sm`) right.
2. **Block card** (`CreamBlock`): badge row (context, category, `THIS WEEK` if homework, `WITH SONG: Stella (Bb)` if the exercise is bound to the current song); title; description (2 lines + `MORE ▾`); the timer: progress bar, `MM:SS` digits, small `15 MIN` label; control row: one primary button cycling `▶ START` → `❚❚ PAUSE` → `▶ RESUME` (`md`), then `✓ DONE` (`secondary sm`), `SKIP →` (`tertiary sm`), `+5 MIN` (`tertiary sm`, only while the timer is running).
3. **Metronome strip**: `Stepper` for BPM (±5, shows `♩ 120`), `StampToggle` `METRONOME`, four beat dots. A `SOUND ▾` disclosure reveals the voice segmented control, the `BEATS 2 & 4 ONLY` toggle, and the `AUTO-START NEXT BLOCK` toggle.
4. `KeyStampGrid` when the exercise is key-based (unchanged component).
5. **Plan list** (same `PlanRow` component as BUILDING, in `running` mode): status stamp per row (`▶ NOW`, `✓ DONE`, `SKIPPED`, or the index), tap a pending row to make it current (pauses the current block), pending rows keep minutes/move/remove, done or skipped rows show `AGAIN`. Footer `+ ADD FROM LIBRARY` stays.

Removed from the practice screen: the horizontal pill strip, PREV/NEXT, `PRIORITY x%`, the current-song banner and the duplicate "PRACTICE WITH SONG" callout, the graduate button, the homework expiry prompt, inline voice/feel pills.

**COMPLETE** (summary)

1. Header: `SESSION DONE` + date. Totals line: `38 MIN PRACTICED • 3 DONE • 1 SKIPPED`.
2. One row per block: title, practiced minutes, `♩ 132` and `+12` delta when the session tempo differs from the exercise's saved tempo. Decision buttons appear only when relevant and turn into a disabled `✓ SAVED` stamp once tapped:
   - `SAVE ♩132 AS TEMPO` (session bpm ≠ exercise.currentBpm) → `setExerciseBaseBpm`.
   - `KEEP AS MAINTENANCE` (category ≠ MAINTENANCE) → `graduateExerciseToMaintenance`.
   - `THIS WEEK: KEEP` / `SAVE FOR LATER` (homework expired) → `resolveHomeworkDecision`.
3. `FINISH` (`lg primary`) → clears the plan, creates a fresh suggestion, returns to BUILDING.

**Day boundary** (checked when the session store mounts): a `running` plan started on a previous local date shows a `Callout` at the top of TODAY: `Yesterday's session is still open` with `RESUME` and `END & REVIEW`. A `building` plan that is not customised and was created on a previous date is regenerated silently. A `complete` plan is replaced by a fresh suggestion.

**Desktop** (`isDesktop`): two columns. Left: suggest panel + CTA (BUILDING) or session bar + block card + metronome + keys (RUNNING) or summary totals (COMPLETE). Right: the plan list (BUILDING/RUNNING) or the per-block decision rows (COMPLETE).

### 2.3 LIBRARY

Top to bottom: `SectionHeader` `LIBRARY`; row with `+ NEW EXERCISE` (`primary sm`) and `ADD MULTIPLE` (`tertiary sm`); search input; `SegmentedStamp` `ALL (13) / ACTIVE (4) / SAVED (9) / THIS WEEK (1)`; `SegmentedStamp` `FOCUS: ALL / SOLOING / COMPING`; cards.

Card: badge row (context, category, `THIS WEEK` when homework, `SAVED` outline badge when not active); title; description; one mono meta line `15 MIN • ♩120 • 3/12 KEYS` (keys part only when key-based); action row: `ADD TO TODAY` (`primary sm`; reads `✓ IN TODAY'S PLAN` and is disabled when already in the plan), `EDIT` (`tertiary sm`), `•••` (`tertiary sm`, opens an action sheet: `START NOW`, `MAKE ACTIVE` / `SAVE FOR LATER`, `ADD TO THIS WEEK` / `REMOVE FROM THIS WEEK`, `DELETE`).

Editor: title, description, FOCUS (Soloing/Comping), TYPE (New concept / Transcribing / Maintenance), MINUTES + BPM steppers, EFFORT 1–5 segmented, IMPORTANCE Low/Normal/High segmented (maps to basePriority 3/5/8; existing values 1–10 map to the nearest), `TRACK 12 KEYS` toggle, `ACTIVE` toggle, `THIS WEEK` toggle. Editing preloads existing values; nothing is clobbered.

Removed from the library: tenure stamps (`ACTIVE • 5D`), `Energy 3/5 • Priority 5/10` line, the header count sentence, the sync status pill and cloud modal (moved to PROGRESS), homework expiry banners on cards (handled in the session summary; the editor's THIS WEEK toggle still allows removal).

Desktop: the header block becomes a 270 px left rail; the cards render in a two-column grid. Same JSX functions, different wrappers.

### 2.4 PROGRESS

1. **Current song** card: `CURRENT SONG` stamp, `Stella by Starlight (Bb)` title, `DAY 6 OF 14` meta (turns `secondary` and reads `TIME TO CHANGE` when overdue), `CHANGE SONG` button → the change-song modal (moved out of `App.tsx` unchanged in function).
2. **History** card (rendered on all platforms): three `StatTile`s (`PRACTICED` total time, `LAST 7 DAYS`, `BEST TEMPO GAIN`), `SegmentedStamp` `RECENT / TEMPO`, then the existing recent-log rows (grouped under a date `SectionHeader` per calendar day) or the existing per-exercise tempo rows. No emoji; song shown as a plain outline badge.
3. **Reminder** row: `StampToggle` `MORNING REMINDER` + hour `Stepper` (5–12, shows `8:00`). On → schedule; off → cancel. Persisted per device in `app_settings`.
4. **Settings** card: `StampToggle` `WARM PAPER` (theme), a sync status line `SYNC • CLOUD` / `SYNC • DEVICE ONLY`, and `CONNECT…` opening the cloud credentials modal (moved from the library, with labels `SUPABASE URL` / `ANON KEY`).

Desktop: left column = song + reminder + settings; right column = history.

### 2.5 Vocabulary (mandatory)

| Concept | Word to use | Never |
|---|---|---|
| Areas | `TODAY`, `LIBRARY`, `PROGRESS` | Shed, Training Room, Crate, Vault, Call Sheet, Session Plan |
| An item | exercise | drill, block (only inside code for a plan row), tune, item |
| The active tune | song (`Current song`, `Change song`, `With song`) | standard, rotate |
| Membership | **Active** / **Saved** (`Make active`, `Save for later`) | rotation, vault, archive |
| Homework | **This week** (badge `THIS WEEK`) | HW, homework |
| Graduate | `Keep as maintenance` | graduate, move to maintenance |
| Completion | `Done` (action), `Logged` (state) | finished, log block |
| Filter | `Focus: All / Soloing / Comping` | target focus, musical context, context |
| Scheduler inputs | `Time`, `Energy` (session), `Effort`, `Importance` (exercise) | intensity, priority %, urgency |

Code identifiers may keep domain names (`inRotation`, `isHomework`, `graduateExerciseToMaintenance`) to avoid churn in the data layer; user-visible strings and new files use the vocabulary above.

---

## 3. Phases

### Phase 0 — Hygiene and standalone bug fixes

Goal: remove dead weight and fix bugs that survive the redesign. No behaviour redesign in this phase.

**Steps**

0.1 Delete `src/db/schema.ts` and `src/db/client.ts`. First confirm nothing imports them:
```bash
grep -rn "db/schema\|db/client" src App.tsx index.ts
```
Expected: no matches.

0.2 Move `Untitled-1.md` to `docs/DESIGN_BRIEF.md` (it is the visual brief; keep it). Leave `.Jules/` alone.

0.3 Remove unused dependencies and plugins:
```bash
npm uninstall @shopify/react-native-skia react-native-svg lucide-react-native react-native-reanimated react-native-worklets expo-speech expo-notifications expo-router expo-linking react-native-screens expo-audio
```
Then in `app.json` remove from `plugins`: `"expo-router"`, `"expo-audio"`, and the whole `["expo-notifications", {...}]` entry. Keep `react-native-audio-api` (used in Phase 6). Keep `react-native-gesture-handler` and `react-native-safe-area-context` (used by `App.tsx`). Run `npx expo install --fix` then `npx expo-doctor`; resolve anything it reports.

0.4 Rewrite the **Navigation & Routing** section of `AGENTS.md` to describe reality. Replace it with exactly:
```
## Navigation

- This app does NOT use Expo Router. Navigation is a hand-rolled tab switch in `App.tsx` (`activeTab` state) rendering one of three screens from `src/screens/`.
- Do not add `expo-router`, `app/` or `src/app/` directories, or `react-navigation`.
- Screens are plain components; shared state lives in React context providers under `src/session/` and `src/theme/`.
```

0.5 Fix the editor clobbering scheduler weights. In `src/screens/TheCrateScreen.tsx` `handleSaveExercise` (lines 168-183), when `editingExerciseId` is set, replace `intensity: 3, basePriority: 5` with the existing exercise's values:
```ts
const existing = exercises.find((e) => e.id === editingExerciseId);
// ...
intensity: existing?.intensity ?? 3,
basePriority: existing?.basePriority ?? 5,
```

0.6 Add an optional `practicedMinutes` parameter to `updateExerciseProgress` in `src/db/repository.ts` (line 925):
```ts
export function updateExerciseProgress(
  id: string,
  bpm: number,
  keys: PitchKey[],
  markPracticedNow: boolean,
  practicedMinutes?: number
): void
```
and in the `logPracticeSession(...)` call (line 948-952) pass `practicedMinutes ?? exercise.durationMinutes` instead of `exercise.durationMinutes`. No caller changes yet.

0.7 Delete the invisible desktop "SESSION TELEMETRY" box in `App.tsx` (lines 576-618, `sidebarTelemetryBox` and its three lines; its text is ink on the canvas background, contrast 1.03:1). Remove the now-unused styles `sidebarTelemetryBox`, `sidebarTelemetryLine`.

0.8 Fix `presetHeader` having no colour (`App.tsx:1089-1093`): at its three usages (lines 785, 820, 852) add `color: colors.inkBlack` to the inline style.

0.9 Delete the `Array.prototype.toReversed` polyfill from `index.ts` (lines 1-10) and from `metro.config.js` (Node 20+ everywhere).

**Accept**
- `grep -rn "expo-router\|reanimated\|lucide\|react-native-svg\|skia" src App.tsx app.json package.json` → no matches.
- `npx expo-doctor` passes. `tsc` and lint clean.
- Web build starts; all three tabs render; editing an exercise's title in the library keeps its Effort/Importance (check via the card meta line `Energy x/5 • Priority y/10` before and after).

Commit: `chore: remove dead deps and modules, fix editor clobber and shell contrast`

---

### Phase 1 — Tokens and design primitives

Goal: a small set of reusable stamp-style primitives so the new screens contain no ad-hoc pills, toggles, badges, inputs, or modal shells. Build them here; the screens in Phases 3–5 use them.

**1.1 `src/theme/tokens.ts`**

a. Add to both `colors` and `warmColors`:
```ts
olive: '#6B705C',        // warm: '#7E8468'
onAccent: '#181512',     // same in both modes: dark ink text on sienna/brass fills
onDark: '#F4EFE6',       // same in both modes: cream text on oxblood/ink fills
scrim: 'rgba(0,0,0,0.72)',
```
b. Improve muted-text contrast: default `inkMuted` → `#5E5146`; warm `inkMuted` → `#A89888`.
c. Delete the unused aliases after confirming each has zero usages with `grep -rn "colors\.<name>" src App.tsx`: `bgPrimary, bgSurface, bgCard, bgCardDark, accentPrimary, accentSecondary, accentTertiary, accentAlert, textSecondary, textMuted, border, borderLight, soloing, comping, maintenance, transcribing, newConcept, stamped, stampedFaded, amberGlow, amberGlowStrong`. Keep `textDark, textPrimary, shadowHard, disabled` (used). Mirror the deletions in `warmColors`. `ThemeContext.tsx` types `colors` as `typeof colors | typeof warmColors`, so both objects must keep identical key sets; no other type change is needed.
d. Add text presets (no `color` inside them) to the `typography` object; keep the existing `fontDisplay/fontHeading/fontStamp/fontMono/fontMonoBold` keys untouched:
```ts
title:      { fontFamily: fontFamilies.display, fontSize: 20, letterSpacing: -0.3 },
heading:    { fontFamily: fontFamilies.heading, fontSize: 15 },
stamp:      { fontFamily: fontFamilies.stamp, fontSize: 11, letterSpacing: 1.2 },
stampSmall: { fontFamily: fontFamilies.stamp, fontSize: 10, letterSpacing: 1 },
mono:       { fontFamily: fontFamilies.mono, fontSize: 12 },
monoBold:   { fontFamily: fontFamilies.monoBold, fontSize: 12 },
digits:     { fontFamily: fontFamilies.monoBold, fontSize: 32, letterSpacing: 1.5 },
```
Delete the twelve old presets (`displayLarge` … `label`, lines 137-215) after confirming zero usages. Add `spacing.card = 14` and `borderWidths.hairline = 1.5`.

**1.2 Fix `StampButton`** (`src/components/StampButton.tsx`)
- Text colour: `primary` and `tertiary`-on-brass fills use `colors.onAccent`; `secondary` uses `colors.onDark`; `tertiary` (recessed fill) uses `colors.inkBlack`. Disabled stays as is.
- `alert` variant becomes an outline: background `colors.cardSurface`, border `colors.secondary`, text `colors.secondary`.
- Minimum heights: `sm` 36, `md` 44, `lg` 52 (`minHeight` on the pressable).

**1.3 New primitives** (one file each in `src/components/`). All use `useTheme()`, zero radius, `1.5` ink borders, haptics `Light` on press.

| File | Props | Visual |
|---|---|---|
| `SegmentedStamp.tsx` | `options: {id: T; label: string; count?: number}[]`, `value: T`, `onChange(id)`, `tone?: 'primary'\|'brass'\|'olive'` (default primary), `size?: 'sm'\|'md'` (36/44), `fill?: boolean` (flex 1 each) | Adjacent stamps share borders (`marginLeft: -1.5` after the first). Selected = tone fill + `onAccent` text; unselected = `cardSurface` + ink text. `accessibilityState={{selected}}`. Label = `label` + (`count` ? ` (${count})` : ``). |
| `StampToggle.tsx` | `label: string`, `checked: boolean`, `onChange(next)`, `hint?: string`, `tone?` | 16×16 ink-bordered box with `✓` when checked, then the fixed label in `stamp` style; optional hint in `mono` muted under it. Whole row pressable, `minHeight: 40`, `accessibilityRole="checkbox"`, `accessibilityState={{checked}}`. The label never changes with state. |
| `Stepper.tsx` | `value: number`, `onChange(next)`, `step: number`, `min: number`, `max: number`, `format?: (v) => string`, `size?: 'sm'\|'md'` | `[−] value [+]`; buttons 36×36 (sm) or 44×44 (md); value in `monoBold`; disabled state at bounds; labels `Decrease`/`Increase` + the stepper's `accessibilityLabel`. |
| `StampBadge.tsx` (extend) | existing `label`, `type?`; add `tone?: 'primary'\|'secondary'\|'brass'\|'olive'\|'neutral'`, `filled?: boolean` | `type` keeps mapping to tones (SOLOING/NEW_CONCEPT→primary, COMPING/TRANSCRIBING→brass, MAINTENANCE→olive). `filled` uses tone fill + `onAccent`/`onDark` text (secondary uses onDark). Keep the ±2° rotation. |
| `SectionHeader.tsx` | `title: string`, `meta?: string`, `right?: ReactNode`, `size?: 'label'\|'title'`, `rule?: boolean` (default true) | `label` = `stamp` style; `title` = `title` style. Meta in `mono` muted on the right, then `right`. 1.5 ink rule under. |
| `Callout.tsx` | `tone: 'song'\|'week'\|'warn'\|'neutral'`, `title: string`, `body?: string`, `actions?: ReactNode` | Bordered box on `recessedSurface`; border and title colour by tone (song→brass, week→primary, warn→secondary, neutral→ink); body `mono` 12 ink; actions row with gap 8. |
| `StampModal.tsx` | `visible`, `title`, `subtitle?`, `onClose`, `actions: ReactNode`, `children`, `maxWidth?` (560 default on desktop) | Scrim = `colors.scrim`. Cream box, border 3, padding 16, title in `title` style, subtitle `mono` muted. Actions right-aligned. Android back closes. |
| `StampInput.tsx` | `label?`, `value`, `onChangeText`, `placeholder?`, `multiline?`, `numeric?`, `secure?` | Label in `stamp` 11 above; `TextInput` `mono` 13, border 1.5, padding 8, bg `cardSurface`, colour `textDark`; `accessibilityLabel = label ?? placeholder`. |
| `StatTile.tsx` | `label`, `value`, `sub?`, `tone?: 'ink'\|'primary'\|'brass'` | Bordered tile on `recessedSurface`; label `stampSmall` muted; value `monoBold` 20 in tone; sub `mono` 10 muted. |
| `NavItem.tsx` | `code: string` (`01`), `title: string`, `subtitle?: string`, `active: boolean`, `onPress`, `compact?: boolean` | Active = `primary` fill + `onAccent` text, else `recessedSurface` + ink. `compact` (mobile dock) shows title only, `stamp` 11, `minHeight: 44`. Full (sidebar) shows code + title + subtitle, `minHeight: 50`. |
| `ActionSheet.tsx` | `visible`, `title`, `onClose`, `actions: {label: string; variant?: StampButtonVariant; onPress: () => void}[]` | A `StampModal` whose body is a vertical stack of full-width `StampButton`s (size `md`) plus a `CANCEL` tertiary. Each action closes the sheet after `onPress`. |

**1.4 `KeyStampGrid`**: import `CIRCLE_OF_FIFTHS` from `src/types/models.ts` (already exported) and delete the local copy (`KeyStampGrid.tsx:6-9`) and the copy in `App.tsx:51-54`. Add `mode?: 'multi' | 'single'` (default `multi`); in `single` mode `masteredKeys` holds at most one key and tapping replaces it. Replace the `fontWeight: 'bold'` check mark (line 137) with `typography.fontMonoBold`.

**1.5 Smoke test the primitives** by replacing the library's two filter rows (mobile `TheCrateScreen.tsx:1243-1313` and desktop `556-627`) with `SegmentedStamp`, and the sync status pill (`489-523`, `1165-1199`) with a `StampBadge` (`tone="olive" filled` when connected, `neutral` otherwise). These survive into Phase 4.

**Accept**
- `tsc`, lint clean. `grep -rn "'#" src/screens src/components App.tsx` → only `tokens.ts` has hex literals (modal scrims now use `colors.scrim`).
- Library filters work and show counts in both themes; selected segment is dark text on sienna in both themes.
- Primary buttons show dark ink text on sienna in both themes; DELETE in the library shows the oxblood outline.

Commit: `feat(ui): stamp primitives, contrast-safe tokens, typography presets`

---

### Phase 2 — Session model, persistence, and store

Goal: the plan becomes a persisted document with explicit status, editable blocks, wall-clock timer, and a single owner (`SessionProvider`). Old screens keep working through a small bridge until Phases 3–5 replace them.

**2.1 Types** — add to `src/types/models.ts` (paste from Appendix A). Make `SessionConfig.contextFilter` required (`'ALL' | MusicalContext`); update the two constructors that build a `SessionConfig` if any.

**2.2 Repository** (`src/db/repository.ts`), following the user-sync-state pattern at 1218-1282:

```ts
const SESSION_PLAN_SETTING_KEY = 'shed_v2_session_plan_json';

export function getSessionPlan(): SessionPlan | null
// JSON.parse(getAppSetting(KEY)); null when missing, empty, or invalid; validate blocks is an array.

export function upsertLocalSessionPlanFromCloud(plan: SessionPlan): boolean
// Silent. Apply only if local is null OR Date.parse(plan.updatedAt) > Date.parse(local.updatedAt).
// Returns whether it applied. Never pushes.

export function saveSessionPlan(plan: SessionPlan): SessionPlan
// const local = getSessionPlan();
// const { updatedAt: _a, ...nextBody } = plan; const { updatedAt: _b, ...localBody } = local ?? {};
// if (local && JSON.stringify(nextBody) === JSON.stringify(localBody)) return local;   // no-op guard
// const updated = { ...plan, updatedAt: new Date().toISOString() };
// setAppSetting(KEY, JSON.stringify(updated)); onCloudPushSessionPlan?.(updated); return updated;

export function setExerciseBaseBpm(id: string, bpm: number): void
// ex = getExerciseById(id); if (!ex) return; const next = { ...ex, currentBpm: clamp(bpm,30,320) };
// upsertLocalExerciseFromCloud(next); onCloudPushExercise?.(next);

export function incrementExerciseSkipped(id: string): void
// incrementSkippedForCanceledSession([id]);   (existing function; web adapter branch exists at :516)
```
Also: add `'session_plan'` to `PendingMutation.entityType` (line 13); add `let onCloudPushSessionPlan: ((p: SessionPlan) => void) | null = null;` beside lines 33-37; add `pushSessionPlan?:` to `registerCloudSyncHandlers` (39-51) and assign it.

Local-only preferences (device-bound, not synced), via `getAppSetting`/`setAppSetting` with these keys and defaults: `pref_auto_start_next` (`'1'`), `pref_reminder_enabled` (`'0'`), `pref_reminder_hour` (`'8'`). Add tiny typed helpers `getLocalPref(key, fallback)` / `setLocalPref(key, value)`.

**2.3 Cloud sync** (`src/services/CloudSyncService.ts`), copying the user-state code paths exactly:
- `sessionPlanToCloudRow(plan)` → `{ id: 'plan_1', body: plan, updated_at: plan.updatedAt }` and `cloudRowToSessionPlan(row)` → `row.body` after validating `Array.isArray(row.body?.blocks)`. (One JSONB column keeps the Supabase schema stable as the type evolves.)
- `pushSessionPlanToCloud(plan)` — duplicate `pushUserStateToCloud` (508-549) with table `session_plan`, mutation id `'mut_session_plan_1'`, keeping the optional-table schema-error branch (527-531).
- `flushPendingMutations` (554-594): add the `session_plan` UPSERT branch.
- `pullAllFromCloud`: add Step 7 after line 732, in its own try/catch: select `session_plan` where `id = 'plan_1'`; if a row exists → `upsertLocalSessionPlanFromCloud`; else if local exists → push local. Tolerate a missing table with `isSchemaOrPolicyError`.
- `subscribeToRealtimeChanges`: add a `.on('postgres_changes', {event: '*', schema: 'public', table: 'session_plan'}, ...)` handler after line 849; on INSERT/UPDATE call `upsertLocalSessionPlanFromCloud` and call `onDataUpdated()` **only if it returned true** (this is what stops your own echo from triggering a refresh).
- Registration object (892-908): add `pushSessionPlan: (plan) => { pushSessionPlanToCloud(plan); }`.

**2.4 Supabase** — append to `supabase/schema.sql`:
```sql
-- Session plan (one row per account, whole plan as JSON, LWW by updated_at)
CREATE TABLE IF NOT EXISTS public.session_plan (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'plan_1',
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.session_plan ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_plan' AND policyname = 'Allow public read-write for session_plan') THEN
    CREATE POLICY "Allow public read-write for session_plan" ON public.session_plan FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.session_plan; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
```
(This mirrors the idempotent pattern already used at `supabase/schema.sql:86-112`.)
Tell the user in the phase hand-off that this SQL must be run once in the Supabase SQL editor; until then the plan is device-local.

**2.5 Pure planner** — new file `src/session/sessionPlanner.ts` (no React, no DB):

```ts
export function suggestPlan(config: SessionConfig, exercises: Exercise[], song: ActiveStandard, now?: Date): SessionBlock[]
// generateSessionQueue(exercises, song, config.availableMinutes, config.intensity, config.contextFilter)
//   .map(q => ({ exerciseId: q.id, allocatedMinutes: q.allocatedMinutes, status: 'pending', elapsedSeconds: 0, bpm: null, practicedMinutes: null }))

export function newPlan(config: SessionConfig, blocks: SessionBlock[], now?: Date): SessionPlan
// status 'building', currentIndex 0, runningSince null, isCustomized false, createdAt/updatedAt now, startedAt/completedAt null

export function normalizeBlocks(blocks: SessionBlock[], exercisesById: Map<string, Exercise>): SessionBlock[]
// drop blocks whose exerciseId is unknown; clamp allocatedMinutes to [5, 60]

export function elapsedSecondsOf(block: SessionBlock, isCurrent: boolean, runningSince: string | null, nowMs: number): number
// block.elapsedSeconds + (isCurrent && runningSince ? max(0, (nowMs - Date.parse(runningSince)) / 1000) : 0)

export function nextPendingIndex(blocks: SessionBlock[], from: number): number
// first 'pending' index > from; else first 'pending' index anywhere; else -1

export function isSameLocalDay(isoA: string, isoB: string): boolean
```

**2.6 Store** — new file `src/session/SessionContext.tsx` exporting `SessionProvider` and `useSession()`. Internally a `useReducer` over `{ plan: SessionPlan; exercises: Exercise[]; song: ActiveStandard; nowMs: number; isMetronomeOn: boolean; currentBeat: number; staleRunning: boolean }`.

Mount sequence (inside the provider, replacing the logic now in `App.tsx:84-123, 168-187`):
1. `initDatabase(); setupAlarmChannel();`
2. `exercises = getAllVaultExercises(); song = getActiveStandard();`
3. `plan = getSessionPlan()`; apply the day-boundary rules from 2.2 (`complete` → fresh suggestion; `building` & `!isCustomized` & not today → fresh suggestion; `running` & startedAt not today → `staleRunning = true`); if `plan.runningSince` is set, fold the elapsed time into the current block (cap at its allocation), set `runningSince = null`, and save.
4. `pullAllFromCloud().then(reloadFromDb)`; `subscribeToRealtimeChanges(reloadFromDb)`.
5. Start a 1000 ms `setInterval` dispatching `TICK` (updates `nowMs` only; never saves). On each tick, if the current block is running and its remaining seconds are 0, dispatch `COMPLETE_CURRENT({ auto: true })`.

`reloadFromDb()` (read-only): `exercises`, `song`, and `plan = getSessionPlan() ?? state.plan`. It never calls `saveSessionPlan`.

Derived values exposed by `useSession()`:
```ts
plan: SessionPlan
blocks: ResolvedBlock[]      // plan.blocks joined with exercises; unknown exerciseIds are dropped from the view
current: ResolvedBlock | null
status: SessionStatus
isTimerRunning: boolean      // plan.runningSince !== null
isMetronomeOn, currentBeat, staleRunning
config: SessionConfig
remainingPlanMinutes: number // sum over pending blocks of ceil(remaining/60)
song: ActiveStandard
exercises: Exercise[]
```

Actions (every action except `tick` and `setBpm` ends with `plan = saveSessionPlan(normalize(next))`; `setBpm` saves on a 750 ms debounce; all actions that advance apply `normalizeBlocks` first):

| Action | Semantics |
|---|---|
| `setConfig(partial)` | Merge into `plan.config` in React state immediately (so faders feel live). Everything that persists is debounced 300 ms after the last change: `saveUserSyncState({availableMinutes, intensity, contextFilter})` (keeps the existing cloud fields in use), and, if `!plan.isCustomized && status === 'building'`, `blocks = suggestPlan(...)` followed by `saveSessionPlan`. Fader drags therefore cause one push, not one per pixel. |
| `rebuildPlan()` | `blocks = suggestPlan(...)`, `isCustomized = false`, `currentIndex = 0`. Only valid in `building`. |
| `addExercise(exerciseId, where: 'end' \| 'afterCurrent')` | Ignore if already present. Insert `{exerciseId, allocatedMinutes: exercise.durationMinutes, status: 'pending', elapsedSeconds: 0, bpm: null, practicedMinutes: null}`. `isCustomized = true`. |
| `removeBlock(index)` | Remove. If it was the current block, `currentIndex = nextPendingIndex(blocks, index - 1)` (or 0 when none). `isCustomized = true`. |
| `moveBlock(index, dir: -1 \| 1)` | Swap with neighbour; keep `currentIndex` pointing at the same block. `isCustomized = true`. |
| `setBlockMinutes(index, minutes)` | Clamp 5–60. `isCustomized = true`. |
| `startSession()` | `status = 'running'`, `startedAt = now`, `currentIndex = nextPendingIndex(blocks, -1)`. Does not start the timer. |
| `startTimer()` | `runningSince = now`. Starts the metronome if `isMetronomeOn`. |
| `pauseTimer()` | Fold elapsed into `current.elapsedSeconds`; `runningSince = null`. |
| `extendCurrent(minutes)` | `current.allocatedMinutes += minutes` (max 120). |
| `completeCurrent({auto})` | `wasRunning = runningSince !== null`. Fold elapsed; `minutes = max(1, ceil(elapsed / 60))`; `updateExerciseProgress(exerciseId, effectiveBpm, exercise.masteredKeys, true, minutes)`; block `status = 'done'`, `practicedMinutes = minutes`; `playBlockCompleteChime()`; then `advance(wasRunning)`. |
| `skipCurrent()` | `wasRunning`; fold; `incrementExerciseSkipped(exerciseId)`; `status = 'skipped'`; `advance(wasRunning)`. |
| `advance(wasRunning)` (internal) | `next = nextPendingIndex(blocks, currentIndex)`. If `-1`: `pauseTimer`, `status = 'complete'`, `completedAt = now`, stop metronome. Else `currentIndex = next`, `runningSince = (wasRunning && autoStartNext) ? now : null`; if the metronome is on, restart it at the new block's `effectiveBpm`. |
| `setCurrent(index)` | Only pending blocks. `pauseTimer()` first, then `currentIndex = index`. |
| `reopenBlock(index)` | Block `status = 'pending'`, `elapsedSeconds = 0`, `practicedMinutes = null`; if `status === 'complete'` set `status = 'running'`; `setCurrent(index)`. |
| `endSession()` | `pauseTimer()`, `status = 'complete'`, `completedAt = now`, stop metronome. Pending blocks stay pending. |
| `finishSession()` | `plan = newPlan(config, suggestPlan(...))`; `staleRunning = false`. |
| `resumeStale()` | `staleRunning = false` (plan untouched). |
| `startNow(exerciseId)` | `building`: `addExercise(id)` then move it to index 0, `startSession()`, `startTimer()`. `running`: `pauseTimer()`, insert after `currentIndex`, `currentIndex += 1`, `startTimer()`. `complete`: `finishSession()` then as `building`. Caller switches to TODAY. |
| `setBpm(delta)` | `current.bpm = clamp((current.bpm ?? exercise.currentBpm) + delta, 30, 320)`. If the metronome is on, call `audioMetronomeService.setBpm(next)` (added in Phase 6; until then restart as today). Debounced save. |
| `toggleMetronome()` / `setVoice(v)` / `setFeel(f)` | As `TheShedScreen.tsx:236-248, 378-383, 413-420` today, but owned here so tab switches do not stop it. Voice/feel persist via `saveUserSyncState`. The provider stops the metronome only on its own unmount. |
| `toggleKey(key)` | As `TheShedScreen.tsx:196-209` (`updateExerciseProgress(id, bpm, keys, false)`), then `reloadFromDb()`. |
| `setAutoStartNext(b)` | `setLocalPref('pref_auto_start_next', b ? '1' : '0')`. |

**2.7 Bridge in `App.tsx`** (temporary; removed in Phases 3–5): wrap `AppContent` in `SessionProvider`; delete `queue`, `sessionExerciseIndex`, `rebuildQueue`, `refreshData`, `handleCrateRefreshQueue`, `handleFaderChange`, and the mount effect; derive `queue: ScoredExercise[]` from `useSession().blocks` (`{...b.exercise, urgencyScore: calculateUrgencyScore(b.exercise), allocatedMinutes: b.allocatedMinutes, currentBpm: b.effectiveBpm, assignedStandardTitle: b.assignedSongTitle}`), pass `currentExerciseIndex={plan.currentIndex}` and `onIndexChange={setCurrent}` to `TheShedScreen`, map the Call Sheet's `onChangeMinutes/Intensity/ContextFilter` to `setConfig`, `onStartSession` to `startSession` + tab switch, `onSelectExercise` to `startNow` + tab switch, `onRefreshQueue` to `reloadFromDb`, `onRefreshData` to `reloadFromDb`, `onUpdateQueueItem` to a no-op. Stop writing `activeQueueIds`/`activeQueueIndex` anywhere (leave the fields in the type for cloud compatibility).

**Accept**
- `tsc`, lint clean.
- Web: build a plan on Session Plan, switch to Library and back: same plan, same block, timer still counting if it was running (the old screen still resets on mount; verify through `getSessionPlan()` in the console: `JSON.parse(localStorage.getItem('shed_v2_setting_shed_v2_session_plan_json')).runningSince` is non-null while running).
- Reload the page mid-session: the plan, status, index, and elapsed time come back (timer paused).
- Moving a fader while a plan is customised does not change the plan; `REBUILD` not yet in UI, so verify via `isCustomized` in storage after calling `removeBlock` from a temporary button or the console.
- With Supabase configured and the SQL applied: editing the plan on one browser shows up on another within seconds, and a browser's own edit does not trigger a visible refresh loop (watch the network tab: one upsert per edit).

Commit: `feat(session): persisted session plan with status, editable blocks, wall-clock timer`

---

### Phase 3 — TODAY screen

Goal: replace `TheShedScreen` and the planner half of `TheCallSheetScreen` with one `TodayScreen` built from the store and the Phase 1 primitives, matching section 2.2 exactly.

**Files**
- `src/screens/TodayScreen.tsx` — chooses the state view, handles the desktop two-column wrapper, renders the stale-session `Callout`.
- `src/components/today/SuggestPanel.tsx` — collapsed/expanded panel; presets as `SegmentedStamp` (`fill`), two `StudioFader`s (`height={150}`), FOCUS `SegmentedStamp`, conditional `REBUILD PLAN` (`tertiary sm`) + hint.
- `src/components/today/PlanList.tsx` + `PlanRow` — `mode: 'building' | 'running' | 'summary'`. Row layout: `[index or status stamp] [title + badges] [Stepper minutes] [↑][↓][✕]`. In `running` mode pending rows are pressable (`setCurrent`), done/skipped rows show `AGAIN` (`tertiary sm` → `reopenBlock`). Minutes `Stepper` is `size="sm"`.
- `src/components/today/BlockRunner.tsx` — block card + timer + control row (section 2.2 RUNNING items 2).
- `src/components/today/MetronomeStrip.tsx` — BPM `Stepper`, `StampToggle METRONOME`, beat dots, `SOUND ▾` disclosure (voice `SegmentedStamp` tone `brass`, `BEATS 2 & 4 ONLY` toggle, `AUTO-START NEXT BLOCK` toggle).
- `src/components/today/SessionSummary.tsx` — totals + decision rows + `FINISH`.
- `src/components/today/AddFromLibraryModal.tsx` — `StampModal` with search `StampInput`, `SegmentedStamp` ACTIVE/SAVED/ALL, list of exercises not already in the plan; tapping a row calls `addExercise(id, 'end')` and the row flips to a `✓ ADDED` stamp; `DONE` closes.

**Behaviour details**
- Timer digits: `remainingSeconds` from the store formatted `MM:SS`; progress bar width = elapsed / (allocated × 60).
- Primary button label: `▶ START` when `elapsedSeconds === 0 && !isTimerRunning`; `❚❚ PAUSE` when running; `▶ RESUME` otherwise. If `status === 'building'` the first press calls `startSession()` then `startTimer()`.
- At zero the store auto-completes (Phase 2); the UI shows nothing extra.
- Session bar minutes-left = `remainingPlanMinutes`.
- Description: `numberOfLines={2}` with a `MORE ▾` / `LESS ▴` stamp link.
- `WITH SONG` badge: `StampBadge tone="brass"` with `assignedSongTitle`; only when defined.
- Summary delta = `block.bpm - exercise.currentBpm` when `block.bpm !== null`.
- Stale session `Callout` (`tone="warn"`): `RESUME` → `resumeStale()`; `END & REVIEW` → `endSession()`.

**Wiring**
- `App.tsx`: first tab renders `<TodayScreen />`; delete `src/screens/TheShedScreen.tsx` and the bridge props for it. The third tab keeps `TheCallSheetScreen` for one more phase but with its planner card removed from the JSX (`renderMixingConsoleCard` and `renderRoutinePreviewCard` calls in both branches) so the fader inputs exist in exactly one place.
- Library `onSelectExercise` (`PRACTICE NOW`) → `startNow(id)` + `setActiveTab('today')` (full library redesign is Phase 4).

**Accept** (web + phone if available)
1. Fresh storage → TODAY shows a suggestion; suggest panel expanded; `START SESSION` enabled.
2. Remove the 2nd block, move the last block to the top, change a block to 25 min: header meta updates; panel shows `REBUILD PLAN`; moving the TIME fader no longer changes the list.
3. `ADD FROM LIBRARY` → add a saved (non-active) exercise → it appears at the end and stays after reload.
4. `START SESSION` → block 1 card; `▶ START` runs the clock; switch to LIBRARY and back: still running; metronome keeps ticking across the switch.
5. `✓ DONE` at 0:40 → PROGRESS history shows a 1-minute log; block row reads `✓ DONE`; next block is current; with AUTO-START on it is already running.
6. `SKIP →` → row reads `SKIPPED`; in LIBRARY the exercise's `skippedCount` increased (check `getAllVaultExercises()` in console or the Importance reason later).
7. Let a 5-minute block run out → chime, row `✓ DONE`, 5-minute log, advance.
8. `END SESSION` → summary with totals; `SAVE ♩ AS TEMPO` updates the exercise's BPM in LIBRARY; `FINISH` → new suggestion, BUILDING.
9. Reload mid-run → RUNNING state restored, timer paused at the correct remaining time.
10. Change the device date to tomorrow (or edit `startedAt` in storage) → stale-session callout appears.
11. Desktop width ≥ 960: two columns, no duplicated controls.

Commit: `feat(today): build-run-review session screen replacing the training room`

---

### Phase 4 — LIBRARY screen

Goal: one render tree, simplified card, honest editor, "Add to today".

**Steps**
4.1 `git mv src/screens/TheCrateScreen.tsx src/screens/LibraryScreen.tsx`; rename the component `LibraryScreen`; props become `{ onStartNow: (id: string) => void }` (uses `useSession()` for everything else).
4.2 Collapse the desktop/mobile duplication: extract `renderHeader()` (title, actions, search, two `SegmentedStamp`s) and `renderCards()`; on desktop wrap header in a 270 px rail and cards in a two-column grid; on mobile stack them. Delete the second copy.
4.3 Card per section 2.3. `ADD TO TODAY` → `addExercise(id, 'end')`; disabled with label `✓ IN TODAY'S PLAN` when `plan.blocks.some(b => b.exerciseId === id)`. `•••` → `ActionSheet` with `START NOW` (→ `onStartNow`), `MAKE ACTIVE`/`SAVE FOR LATER` (→ `toggleExerciseRotation`), `ADD TO THIS WEEK`/`REMOVE FROM THIS WEEK` (→ `setExerciseHomework`), `DELETE` (`variant="alert"`, then a second `ActionSheet` `Delete "<title>"?` with `DELETE` / cancel → `deleteExercise`). After every mutation call `reloadFromDb()` from the store (it re-reads exercises) instead of the local `reloadExercises` + `onRefreshQueue` pair.
4.4 Remove: tenure badge (`getRotationTenureStats` usage), `Energy/Priority` meta line, the header count sentence, the homework decision banner, the sync pill (keep its code for Phase 5 to move; temporarily render nothing).
4.5 Editor (`StampModal`): fields per section 2.3 using `StampInput`, `SegmentedStamp`, `Stepper` (minutes 5–60 step 5; BPM 30–320 step 5), `StampToggle`. Save passes the user's EFFORT and IMPORTANCE values; mapping Importance → `basePriority`: Low 3, Normal 5, High 8; reverse mapping for display: `≤3` Low, `4–6` Normal, `≥7` High. Keep `usesActiveStandard = category === 'MAINTENANCE'`.
4.6 Bulk-add modal → `StampModal` + `StampInput multiline`; unchanged parser.
4.7 Delete `getRotationTenureStats` from `CrateUtils.ts` if nothing else uses it (grep first).

**Accept**
- Library renders once per layout (search for `isDesktop ?` — only layout wrappers remain).
- Editing a seed exercise and saving keeps its Effort/Importance; changing them changes the next suggestion's order/eligibility.
- `ADD TO TODAY` appends to the plan and flips to `✓ IN TODAY'S PLAN`; `START NOW` from the sheet jumps to TODAY and starts the clock on that exercise.
- `DELETE` asks first; deleting an exercise that is in today's plan removes its row on TODAY without errors.

Commit: `feat(library): single-tree library with add-to-today, action sheet, honest editor`

---

### Phase 5 — PROGRESS screen and app shell

Goal: history on every platform, one home for the current song, settings out of the way, three clean tabs.

**Steps**
5.1 Create `src/screens/ProgressScreen.tsx` per section 2.4 with components in `src/components/progress/`: `CurrentSongCard.tsx`, `HistoryPanel.tsx` (move `renderDesktopPracticeHistoryCard` logic from `TheCallSheetScreen.tsx:439-769` and the analytics memo `148-225`; keep the `subscribeToSyncStatus` refresh and additionally re-read logs when `useSession().plan.updatedAt` changes), `ReminderRow.tsx`, `SettingsCard.tsx`, `ChangeSongModal.tsx` (move the modal from `App.tsx:758-898`; use `KeyStampGrid mode="single"` for the key, `SegmentedStamp` for presets and cycle days), `CloudModal.tsx` (move from `LibraryScreen` with labels `SUPABASE URL` / `ANON KEY`).
5.2 `src/services/AlarmManager.ts`: add `cancelNextShedAlarm(): Promise<void>` (`notifee.cancelNotification('next_scheduled_shed')`, no-op on web) and make `scheduleNextShedAlarm` take `(hour: number, config: SessionConfig)` computing "next occurrence of `hour`:00 (today if still ahead, else tomorrow)". The notification preview must use `generateSessionQueue(..., config.contextFilter)` so it matches the plan. `ReminderRow` toggles call these and store `pref_reminder_enabled` / `pref_reminder_hour`.
5.3 Delete `src/screens/TheCallSheetScreen.tsx` and `src/components/ActiveStandardBanner.tsx`.
5.4 `App.tsx` shell: three `NavItem`s (`01 TODAY / Plan & practice`, `02 LIBRARY / Exercises`, `03 PROGRESS / History & settings`); mobile dock uses `compact`; desktop sidebar = one wordmark line `SHED ENGINE` (`title` style) + one `stampSmall` line `PRACTICE LOG` + the three `NavItem`s; delete the sidebar song box, the theme button, the version line, and the `NAVIGATION` label. Theme toggling now lives only in `SettingsCard`.
5.5 Remove every remaining emoji and bracketed label; run `grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src App.tsx` and fix each hit (`✓ ✕ ▶` are allowed; `⚠️ 🎵 🎓 📝 📥 ⏰ ⚡ 🌙 ☀️` are not).

**Accept**
- Mobile: history visible; three tabs fit without wrapping at 360 px width.
- Current song appears exactly once per screen (PROGRESS card; `WITH SONG` badge on blocks).
- Reminder toggle schedules/cancels (phone) and persists after reload; hour stepper changes the scheduled time.
- Theme toggle works from Settings in both layouts; warm mode shows no black-on-dark text (check the change-song modal headers).

Commit: `feat(progress): history, current song, reminder and settings; three-tab shell`

---

### Phase 6 — Engine quality (scheduler, metronome)

**6.1 Scheduler** (`src/services/SchedulerEngine.ts`), see Appendix B for the full spec:
- Eligibility fallback: if the energy cap excludes every active exercise but active exercises exist, ignore the cap (and the context filter only if it also excludes everything).
- Exclude exercises whose `lastPracticedAt` is today (local date) unless that leaves the pool empty.
- Homework first: partition eligible into homework and others; pack homework blocks first in urgency order, then the rest with the existing soloing/comping alternation.
- Packing window: loop while `remainingMinutes >= 5`; never trim a block below 5 minutes; a block whose `durationMinutes` is not a finite positive number counts as 15.
- Remove the now-unused `reconcileQueueInPlace`.

**6.2 Metronome** (`src/services/AudioMetronomeService.ts`):
- Replace the `setInterval(tick, 60000/bpm)` scheduler with look-ahead scheduling: a 25 ms timer that schedules every click whose time falls within the next 100 ms at an exact `AudioContext` time (`nextClickTime += 60 / bpm`). Report beats to `onBeat` via `setTimeout` aligned to `(clickTime - ctx.currentTime) * 1000`.
- Add `setBpm(bpm)` that changes the interval without resetting the beat counter or producing an extra click. The store (Phase 2) calls it on BPM steps.
- Haptics only on beats that sound (in `BACKBEAT_2_4` mode: beats 2 and 4 only).
- Native audio: on iOS/Android there is no `window.AudioContext`, so the metronome is haptics-only today. `react-native-audio-api` (already installed) provides a Web-Audio-compatible `AudioContext`. In `getAudioContext()`, when `Platform.OS !== 'web'`, import `{ AudioContext }` from `react-native-audio-api` and use it with the same node code. Before writing this, read `node_modules/react-native-audio-api/README.md` and confirm the exported class name and that `createOscillator`, `createGain`, `createBufferSource`, `createBuffer` exist at version 0.13.x. Test on a development build (`npx expo run:android` or EAS development profile). If it does not work within one attempt, leave native haptics-only and note it in the hand-off.

**Accept**
- Energy 1 with only effort-3 exercises still yields a plan.
- A 12-minute window yields a 12-minute first block, not an empty plan; a 7-minute window yields one 7-minute block.
- Homework exercises are always blocks 1..n.
- Web metronome at 240 BPM stays even for 60 s (compare against a phone metronome); changing BPM while running does not double-click.

Commit: `feat(engine): scheduler fallbacks and look-ahead metronome`

---

### Phase 7 — Data layer hardening (optional, do only if asked)

Each is independent; all are small.
1. `pullAllFromCloud`: add an in-flight guard (`if (pullInFlight) return pullInFlight; …`) so overlapping mount / AppState / online pulls do not interleave `replaceLocalCacheWithCloudData`.
2. `upsertLocalUserStateFromCloud` and the realtime user-state handler: apply only when the cloud `updatedAt` is newer (`Date.parse`), mirroring the session-plan rule.
3. `setExerciseHomework` / `resolveHomeworkDecision`: push the exercise once, not twice.
4. `flushPendingMutations`: wrap each `JSON.parse(mut.payload)` in try/catch and remove the mutation on parse failure; also remove mutations with an unknown `entityType`.
5. `isSchemaOrPolicyError`: stop treating `23505` (unique violation) as a schema error.
6. `pullAllFromCloud` bootstrap early-return (`652-660`): after uploading local exercises, continue to the logs / user-state / session-plan steps instead of returning.
7. `addExercise` / `logPracticeSession` ids: append a per-session counter to the random suffix so synchronous bulk adds cannot collide.

Commit: `fix(sync): hardening for pulls, echoes, and outbox parsing`

---

## Appendix A — Types to paste into `src/types/models.ts`

```ts
export type BlockStatus = 'pending' | 'done' | 'skipped';

export interface SessionBlock {
  exerciseId: string;
  allocatedMinutes: number;        // 5..60 (extendCurrent may raise to 120)
  status: BlockStatus;
  elapsedSeconds: number;          // practiced seconds folded in on pause/done/skip
  bpm: number | null;              // session tempo; null = use exercise.currentBpm
  practicedMinutes: number | null; // set when status becomes 'done'
}

export type SessionStatus = 'building' | 'running' | 'complete';

export interface SessionPlan {
  id: 'plan_1';
  status: SessionStatus;
  blocks: SessionBlock[];
  currentIndex: number;
  runningSince: string | null;     // ISO; non-null while the current block's clock runs
  isCustomized: boolean;           // true once the user edits the suggestion
  config: SessionConfig;           // inputs used for the last suggestion
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;               // LWW key for cloud sync
}

export interface ResolvedBlock extends SessionBlock {
  index: number;
  exercise: Exercise;
  effectiveBpm: number;            // bpm ?? exercise.currentBpm
  elapsedSecondsNow: number;       // includes the running interval for the current block
  remainingSeconds: number;        // max(0, allocatedMinutes*60 - elapsedSecondsNow)
  isCurrent: boolean;
  assignedSongTitle?: string;      // "Stella by Starlight (Bb)" when bound to the current song
}
```

`SessionConfig` (existing) becomes:
```ts
export interface SessionConfig {
  availableMinutes: number;        // 15-120
  intensity: number;               // 1-5
  contextFilter: 'ALL' | MusicalContext;
}
```

## Appendix B — Scheduler spec (`generateSessionQueue`)

Inputs: `exercises` (all), `song`, `availableMinutes` (finite, else 30), `maxIntensity` (finite, else 3), `contextFilter`.

1. `active = exercises.filter(e => e.inRotation)`. If empty → `[]`.
2. `pool = active.filter(e => intensity(e) <= maxIntensity)`; if empty → `pool = active`.
3. `pool = pool.filter(byContext)`; if empty → skip the context filter.
4. `fresh = pool.filter(e => !practicedToday(e))`; if non-empty → `pool = fresh`.
5. Score each with `calculateUrgencyScore`; `allocatedMinutes = sanitize(durationMinutes)` (finite and > 0, else 15); `assignedStandardTitle` as today.
6. `homework = pool.filter(isHomework)` sorted by urgency desc; `others = rest` sorted by urgency desc.
7. Pack `homework` first, then `others` with the existing alternation rule (only when `contextFilter === 'ALL'`), while `remaining >= 5`. Block minutes = `min(allocatedMinutes, remaining)`; if that is `< 5`, stop.
8. Return the packed list.

`practicedToday(e)`: `e.lastPracticedAt` is non-null and its local calendar date equals today's.

## Appendix C — Manual end-to-end script (run after Phase 5)

1. Clear site data (web) or reinstall (phone). Open → TODAY, BUILDING, suggestion present, panel expanded.
2. Remove one block; move another up; set one to 25 min. Reload → edits persist; `REBUILD PLAN` visible; faders inert.
3. ADD FROM LIBRARY → add a Saved exercise → appears last.
4. START SESSION → START → wait 10 s → switch to LIBRARY → back: still running.
5. PAUSE → RESUME → DONE → log in PROGRESS with 1 min; next block current.
6. SKIP → row SKIPPED. Reopen it with AGAIN → pending and current again.
7. Metronome ON, change BPM twice, open SOUND, change voice, close → settings persist after reload.
8. Let a block run to zero → chime, auto-done, next auto-started (toggle off → next armed only).
9. END SESSION → summary → SAVE ♩ AS TEMPO → FINISH → fresh suggestion.
10. LIBRARY → •••→ START NOW on any exercise → TODAY running on it.
11. PROGRESS → CHANGE SONG → pick a preset → block badges show the new song.
12. PROGRESS → toggle MORNING REMINDER (phone) → notification scheduled for the chosen hour.
13. Warm theme → repeat 1–12 visually: no invisible text, no colour emoji.

## Appendix D — Suggestions NOT in scope (do not implement unless asked)

Drag-and-drop reordering (needs reanimated), tap-tempo, per-session notes, saved plan templates, weekly minute goals, per-exercise practice streaks, voice announcements between blocks, an in-app tuner.
