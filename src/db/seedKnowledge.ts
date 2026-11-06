/**
 * Initial Seed Knowledge Base Notes for Shed Engine
 *
 * Rich, authentic jazz theory and practice markdown notes featuring:
 * - Real jazz concepts, chord formulas, and voice-leading principles
 * - Obsidian-style [[WikiLinks]] connecting interrelated ideas
 * - Hashtags (#theory, #voicings, #bebop, #soloing)
 * - Obsidian Callouts (> [!NOTE], > [!TIP], > [!WARNING], > [!CHORD])
 * - Lead sheet chord blocks and practice checklists
 */
import { KnowledgeNote } from '../types/knowledge';

export const SEED_KNOWLEDGE_NOTES: KnowledgeNote[] = [
  {
    id: 'note_barry_harris',
    title: 'Barry Harris 6th Diminished Concept',
    slug: 'barry-harris-6th-diminished-concept',
    category: 'HARMONY',
    tags: ['theory', 'voicings', 'bebop'],
    pinned: true,
    relatedExerciseIds: ['ex_1', 'ex_2'],
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-15T14:30:00.000Z',
    content: `---
title: Barry Harris 6th Diminished Concept
category: HARMONY
tags: [theory, voicings, bebop]
---

# Barry Harris 6th Diminished Concept

The cornerstone of modern bebop harmony and block chord comping. Barry Harris observed that Western harmony revolves around an alternation between **stability (tonic 6th)** and **instability (diminished 7th)**.

> [!NOTE] The Fundamental Formula
> Combine a **Major 6th chord** with a **Diminished 7th chord** built on the raised 5th degree.
> Scale: \`1 - 2 - 3 - 4 - 5 - b6 - 6 - 7\` (8 notes)
> In C: \`C - D - E - F - G - Ab - A - B\`

## The 4 Inversions of C6 and B°7
When harmonized in 4 parts, the scale alternates between:
1. **C6**: \`C - E - G - A\` (Tonic)
2. **D°7 (B°7)**: \`D - F - Ab - B\` (Dominant passing)
3. **C6 / E**: \`E - G - A - C\`
4. **F°7 (B°7)**: \`F - Ab - B - D\`
5. **C6 / G**: \`G - A - C - E\`
6. **Ab°7 (B°7)**: \`Ab - B - D - F\`
7. **C6 / A (Am7)**: \`A - C - E - G\`
8. **B°7**: \`B - D - F - Ab\`

\`\`\`chord
| C6 | D°7 | C6/E | F°7 | C6/G | Ab°7 | Am7 | B°7 | C6 |
\`\`\`

## Moving Chords & "Borrowing" Notes
Any voice in the C6 chord can move down a half-step to borrow a note from the diminished chord.
- Lower the 5th (G -> F# / Gb) -> creates **C6b5** or creates altered extensions.
- When applied to [[Drop 2 Voicings]], this allows effortless 4-way close harmonic movement.

> [!TIP] Comping Application
> Never hold a static major 7th chord for 4 bars. Instead, move up and down the 6th diminished scale to create internal rhythm and movement behind a soloist.

## Interconnected Concepts
- Essential for [[Drop 2 Voicings]] voice leading.
- Resolves cleanly into [[Tritone Substitutions]] when reharmonizing dominant cycles.
- Complements [[Bill Evans Rootless Shells]] for modern piano/guitar textures.
`,
  },
  {
    id: 'note_drop_2',
    title: 'Drop 2 Voicings Master Guide',
    slug: 'drop-2-voicings-master-guide',
    category: 'COMPING',
    tags: ['comping', 'voicings', 'harmony'],
    pinned: true,
    relatedExerciseIds: ['ex_1'],
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-18T16:00:00.000Z',
    content: `---
title: Drop 2 Voicings Master Guide
category: COMPING
tags: [comping, voicings, harmony]
---

# Drop 2 Voicings Master Guide

Drop 2 voicings are the most balanced, practical 4-note voicings in jazz. They separate the melody from the inner harmonic voices while maintaining a clean bass register.

## How Drop 2 is Built
Take any 4-part close position chord:
1. Stack the notes in close root position: \`1 - 3 - 5 - 7\` (top note is 7, 2nd from top is 5).
2. Take the **second voice from the top** and drop it down one full octave.
3. Resulting spread: \`5 - 1 - 3 - 7\`.

\`\`\`chord
Close:  [C4, E4, G4, B4]  (7 on top, 5 is 2nd voice)
Drop 2: [G3, C4, E4, B4]  (5 dropped to octave 3)
\`\`\`

## The 4 Inversions (Major 7th Example)
- **Root in Bass (Inversion from Close 2nd Inv)**: \`C - G - B - E\` (1 - 5 - 7 - 3)
- **3rd in Bass**: \`E - B - C - G\` (3 - 7 - 1 - 5)
- **5th in Bass**: \`G - C - E - B\` (5 - 1 - 3 - 7)
- **7th in Bass**: \`B - E - G - C\` (7 - 3 - 5 - 1)

> [!CHORD] Voice-Leading II-V-I
> In C Major (Dm7 -> G7 -> Cmaj7):
> Dm7 (1-5-b7-b3): \`D - A - C - F\`
> G7 (7-3-5-1):    \`F - B - D - G\`  (A drops to G, C drops to B!)
> Cmaj7 (3-7-1-5): \`E - B - C - G\`  (Only 1 voice moves!)

## Shed Routine Checklist
- [ ] Practice 4 inversions of Maj7 on top four strings (Strings 1-2-3-4)
- [ ] Practice 4 inversions of Min7 on middle four strings (Strings 2-3-4-5)
- [ ] Connect with [[Barry Harris 6th Diminished Concept]] passing chords
- [ ] Apply smooth voice leading across [[Rhythm Changes Strategies]]
`,
  },
  {
    id: 'note_coltrane_matrix',
    title: 'Coltrane Matrix & Giant Steps Cycle',
    slug: 'coltrane-matrix-giant-steps-cycle',
    category: 'SOLOING',
    tags: ['soloing', 'harmony', 'coltrane'],
    pinned: false,
    relatedExerciseIds: ['ex_4'],
    createdAt: '2026-10-05T09:15:00.000Z',
    updatedAt: '2026-10-20T11:45:00.000Z',
    content: `---
title: Coltrane Matrix & Giant Steps Cycle
category: SOLOING
tags: [soloing, harmony, coltrane]
---

# Coltrane Matrix & Giant Steps Cycle

John Coltrane redefined harmonic motion in 1959 by dividing the octave into three equal parts (major thirds), replacing standard cycle-of-fifths movement with a rapid triangular modulation.

## The Three Tonal Centers
In *Giant Steps*, the key centers are spaced 4 semitones apart:
- **B Major**
- **G Major** (down a major 3rd from B)
- **Eb Major** (down a major 3rd from G)
- Back to **B Major** (down a major 3rd from Eb)

\`\`\`chord
| Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7 |
| Gmaj7 Bb7 | Ebmaj7 F#7 | Bmaj7 | Fm7 Bb7 |
\`\`\`

> [!IMPORTANT] Digital Patterns (1-2-3-5)
> Coltrane mastered continuous 8th-note navigation by practicing 4-note digital patterns:
> - \`1 - 2 - 3 - 5\` on Major 7 chords (e.g. \`B - C# - D# - F#\`)
> - \`1 - 3 - 4 - 5\` or \`1 - 2 - b3 - 5\` on Dominant/Minor chords
> Invert them: \`5 - 3 - 2 - 1\` or \`3 - 2 - 1 - 5\` to create fluid melodic direction.

## Superimposing over standard II-V-I
You can substitute a standard 4-bar \`Dm7 | G7 | Cmaj7 | Cmaj7\` with Coltrane changes:
\`\`\`chord
| Dm7 Eb7 | Abmaj7 B7 | Emaj7 G7 | Cmaj7 |
\`\`\`
This creates an aggressive outside-inside harmonic tension that resolves back to tonic.

## Related Concepts
- Works hand-in-hand with [[Tritone Substitutions & Altered Scales]].
- Develop target note timing via [[Bebop Enclosures & Chromatic Phrasing]].
`,
  },
  {
    id: 'note_bebop_enclosures',
    title: 'Bebop Enclosures & Chromatic Phrasing',
    slug: 'bebop-enclosures-chromatic-phrasing',
    category: 'SOLOING',
    tags: ['soloing', 'phrasing', 'bebop'],
    pinned: false,
    relatedExerciseIds: ['ex_3'],
    createdAt: '2026-10-06T14:20:00.000Z',
    updatedAt: '2026-10-22T08:10:00.000Z',
    content: `---
title: Bebop Enclosures & Chromatic Phrasing
category: SOLOING
tags: [soloing, phrasing, bebop]
---

# Bebop Enclosures & Chromatic Phrasing

The distinctive sound of Charlie Parker, Dizzy Gillespie, and Bud Powell comes from surrounding harmonic target tones (3rds and 7ths) with chromatic ornamental notes.

> [!NOTE] Downbeat Rule
> For lines to sound harmonically resolved, chord tones (Root, 3rd, 5th, 7th) must fall on **downbeats** (beats 1, 2, 3, 4), while chromatic approach notes sit on the **upbeats** ("&").

## The 4 Primary Enclosure Formulas
Target note: **E** (3rd of C Major 7):

1. **Upper Neighbor -> Lower Chromatic Neighbor -> Target**
   \`F -> D# -> E\` (Diatonic above, half-step below)
2. **Double Chromatic Above -> Target**
   \`F# -> F -> E\`
3. **Double Chromatic Below -> Target**
   \`D -> D# -> E\`
4. **Extended Parker Enclosure (4-note turnaround)**
   \`G -> F -> D# -> E\` (Arpeggio leap, step down, chromatic approach from below)

\`\`\`chord
Line over G7:
Beats: | 1     &     2     &    | 3   &   4   &  |
Notes: | F     D#    E     C    | B   Ab  G   -  |
Role:  | (b7) (chrm) (13) (4)   | (3) (b9)(R) -  |
\`\`\`

> [!TIP] Rhythmic Phrasing
> Don't begin every line on beat 1. Start your enclosure on beat 4 of the preceding bar or on the "& of 1" to give your phrases authentic swing forward propulsion.

## Practice Routine
- Pick one standard (e.g. *Donna Lee* or *Confirmation*).
- Isolate the 3rd of every chord.
- Approach each 3rd with Enclosure Formula 1 through all 12 keys.
- Check [[Transcription Workflow & Ear Training]] for analyzing Bird solos.
`,
  },
  {
    id: 'note_tritone_subs',
    title: 'Tritone Substitutions & Altered Scales',
    slug: 'tritone-substitutions-altered-scales',
    category: 'THEORY',
    tags: ['harmony', 'theory', 'soloing'],
    pinned: false,
    relatedExerciseIds: ['ex_5'],
    createdAt: '2026-10-08T18:00:00.000Z',
    updatedAt: '2026-10-24T19:30:00.000Z',
    content: `---
title: Tritone Substitutions & Altered Scales
category: THEORY
tags: [harmony, theory, soloing]
---

# Tritone Substitutions & Altered Scales

Why does substituting **Db7** for **G7** work when resolving to **Cmaj7**? The answer lies in the shared tritone interval and chromatic bass voice leading.

## The Shared Tritone (3rd & 7th)
- In **G7**: The 3rd is **B**, the 7th is **F**. Interval between B and F = 6 semitones (Tritone).
- In **Db7**: The 3rd is **F**, the 7th is **Cb (B)**. The exact same interval!
- Because the tritone drives dominant resolution, both chords resolve identically to **Cmaj7**.

> [!CHORD] Bass Motion Comparison
> Standard cycle: \`G -> C\` (Down a 5th)
> Tritone sub:    \`Db -> C\` (Smooth downward half-step bass!)

## The Altered Scale (Super Locrian)
The best melodic vehicle for tritone substitutions is the **Altered Scale**, which is the 7th mode of the **Melodic Minor scale**.
- To play over **G7alt**, play **Ab Melodic Minor**:
- \`G - Ab - Bb - B (Cb) - Db - Eb - F\`
- Formula: \`1 - b9 - #9 - 3 - #11 - b13 - b7\`

> [!WARNING] Avoid the Natural 5th
> The Altered scale contains NO natural 5th, natural 9th, or natural 11th. Playing a natural D over G7alt will clash violently with the altered harmony.

## Practical Links
- Connects to [[Barry Harris 6th Diminished Concept]] diminished sharing.
- Use digital patterns from [[Coltrane Matrix & Giant Steps Cycle]] to outline altered intervals.
`,
  },
  {
    id: 'note_bill_evans',
    title: 'Bill Evans Rootless Shells',
    slug: 'bill-evans-rootless-shells',
    category: 'COMPING',
    tags: ['comping', 'voicings', 'piano'],
    pinned: false,
    relatedExerciseIds: ['ex_2'],
    createdAt: '2026-10-10T11:00:00.000Z',
    updatedAt: '2026-10-25T15:20:00.000Z',
    content: `---
title: Bill Evans Rootless Shells
category: COMPING
tags: [comping, voicings, piano]
---

# Bill Evans Rootless Shells

Pioneered by Bill Evans on *Kind of Blue* and *Portrait in Jazz*, leaving the root to the acoustic bassist frees your hands to voice rich tensions (9ths, 11ths, 13ths) without muddy low-end buildup.

## The Two Primary Forms (A & B)
Every chord in a II-V-I progression can be voiced in either **Form A (3rd on bottom)** or **Form B (7th on bottom)**:

### II-V-I in C (Form A - 3rd on bottom)
1. **Dm9**:  \`F - A - C - E\`   (b3 - 5 - b7 - 9)
2. **G13**:  \`F - A - B - E\`   (b7 - 9 - 3 - 13)
3. **Cmaj9**:\`E - G - B - D\`   (3 - 5 - 7 - 9)

### II-V-I in C (Form B - 7th on bottom)
1. **Dm9**:  \`C - E - F - A\`   (b7 - 9 - b3 - 5)
2. **G13**:  \`B - E - F - A\`   (3 - 13 - b7 - 9)
3. **Cmaj9**:\`B - D - E - G\`   (7 - 9 - 3 - 5)

> [!TIP] Minimal Movement Principle
> Notice that between Dm9 and G13, only **one single note moves by a half step** (C moves to B in Form A, or F moves to E in Form B). The other three notes remain completely static!

\`\`\`chord
| Dm9 (Form A) | G13 (Form A) | Cmaj9 (Form A) |
| Dm9 (Form B) | G13 (Form B) | Cmaj9 (Form B) |
\`\`\`

## Routine Integration
- Combine with [[Drop 2 Voicings Master Guide]] when accompanying soloists.
- Use as harmonic backdrop when executing [[Bebop Enclosures & Chromatic Phrasing]].
`,
  },
  {
    id: 'note_rhythm_changes',
    title: 'Rhythm Changes Strategies & Bridges',
    slug: 'rhythm-changes-strategies-bridges',
    category: 'STANDARDS',
    tags: ['standards', 'soloing', 'harmony'],
    pinned: false,
    relatedExerciseIds: ['ex_3', 'ex_4'],
    createdAt: '2026-10-12T13:45:00.000Z',
    updatedAt: '2026-10-27T10:15:00.000Z',
    content: `---
title: Rhythm Changes Strategies & Bridges
category: STANDARDS
tags: [standards, soloing, harmony]
---

# Rhythm Changes Strategies & Bridges

Along with the 12-bar blues, the 32-bar AABA form of George Gershwin's *I Got Rhythm* is the universal proving ground for jazz improvisers.

## The A Section (8 Bars)
\`\`\`chord
| Bbmaj7 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 |
| Fm7 Bb7   | Eb7 E°7| Dm7 G7 | Cm7 F7 |
\`\`\`

### Strategies for the A Section
1. **The Tonicization Approach**: Instead of outlining every single chord change, think in 2-bar or 4-bar blocks of **Bb Major** and **Bb Blues**.
2. **The 3-to-6 Diminished Sub**: Substitute \`G7\` with \`B°7\` as taught in [[Barry Harris 6th Diminished Concept]].
3. **The Bebop Line**: Use chromatic turnaround licks outlined in [[Bebop Enclosures & Chromatic Phrasing]].

## The Montgomery / Cycle Bridge (8 Bars)
The B Section is a cycle of dominant 7th chords moving around the circle of fifths, each lasting 2 bars:
\`\`\`chord
| D7 | % | G7 | % |
| C7 | % | F7 | % |
\`\`\`

> [!CHORD] Bridge Substitutions
> - **Preceding II-V**: Precede each dominant with its minor 7th:
>   \`| Am7 D7 | Am7 D7 | Dm7 G7 | Dm7 G7 | Gm7 C7 | Gm7 C7 | Cm7 F7 | Cm7 F7 |\`
> - **Tritone Subs**: Substitute alternate bars with tritone chords from [[Tritone Substitutions & Altered Scales]]:
>   \`| D7 | Ab7 | G7 | Db7 | C7 | Gb7 | F7 | B7 |\`
> - **Coltrane Matrix**: Apply [[Coltrane Matrix & Giant Steps Cycle]] cycles over the 2-bar dominant spans.
`,
  },
  {
    id: 'note_transcription',
    title: 'Transcription Workflow & Ear Training',
    slug: 'transcription-workflow-ear-training',
    category: 'ROUTINE',
    tags: ['transcription', 'ear-training', 'routine'],
    pinned: false,
    relatedExerciseIds: ['ex_3'],
    createdAt: '2026-10-14T08:00:00.000Z',
    updatedAt: '2026-10-28T17:00:00.000Z',
    content: `---
title: Transcription Workflow & Ear Training
category: ROUTINE
tags: [transcription, ear-training, routine]
---

# Transcription Workflow & Ear Training

Transcribing by ear directly from master recordings is the single most effective way to absorb authentic jazz vocabulary, time-feel, tone, and articulation.

> [!QUOTE] Clark Terry's 3 Steps
> **"Imitate, Assimilate, Innovate."**
> You cannot innovate until you have assimilated, and you cannot assimilate until you have imitated.

## The 4-Stage Ear-to-Fingers Method
1. **Sing It (Voice First)**:
   - Loop a 2-4 bar phrase.
   - Sing the exact line with accurate pitch, vibrato, and jazz syllables (*doo-dle-oot*).
   - *Rule: If you cannot sing it, you do not know it.*
2. **Locate on Instrument**:
   - Find the notes on your instrument without writing anything down.
   - Determine the most ergonomic fingering / string position.
3. **Play in Time with Recording**:
   - Play along with the master recording at full tempo.
   - Match the soloist's swing ratio, micro-timing (ahead or behind the beat), and breath dynamics.
4. **Theoretical Analysis**:
   - Analyze which scale degrees were used over each chord.
   - Check if the soloist used [[Bebop Enclosures & Chromatic Phrasing]] or [[Tritone Substitutions & Altered Scales]].

> [!TIP] Speeding Up the Loop
> Don't attempt to transcribe an entire 5-chorus Coltrane solo at once. Transcribe **one killer phrase per day** and immediately run it through all 12 keys!
`,
  },
  {
    id: 'note_triad_pairs',
    title: 'Triad Pairs & Hexatonic Lines',
    slug: 'triad-pairs-hexatonic-lines',
    category: 'SOLOING',
    tags: ['soloing', 'modern-jazz', 'theory'],
    pinned: false,
    relatedExerciseIds: ['ex_4', 'ex_5'],
    createdAt: '2026-10-16T15:30:00.000Z',
    updatedAt: '2026-10-29T12:00:00.000Z',
    content: `---
title: Triad Pairs & Hexatonic Lines
category: SOLOING
tags: [soloing, modern-jazz, theory]
---

# Triad Pairs & Hexatonic Lines

Used extensively by Woody Shaw, Michael Brecker, and Kurt Rosenwinkel, **Triad Pairs** involve alternating between two mutually exclusive major or minor triads to produce modern, angular melodies without scalar clutter.

## What Makes a Triad Pair?
Two triads that share **zero common tones**. Together they form a 6-note **hexatonic scale**.

### Classic Triad Pairs
1. **C Major + D Major over Cmaj7#11** (Lydian):
   - C Triad: \`C - E - G\` (1 - 3 - 5)
   - D Triad: \`D - F# - A\` (9 - #11 - 13)
   - Hexatonic scale: \`C - D - E - F# - G - A\` (Every note is gorgeous!)

2. **F Major + G Major over Dm7** (Dorian):
   - F Triad: \`F - A - C\` (b3 - 5 - b7)
   - G Triad: \`G - B - D\` (11 - 6 - 1)

3. **Eb Minor + F Major over G7alt**:
   - Yields the altered tensions without scalar mud!

\`\`\`chord
| Cmaj7#11: [ C Triad: C-E-G ] <--> [ D Triad: D-F#-A ] |
| G7alt:    [ Eb Triad: Eb-G-Bb ] <--> [ F Triad: F-A-C ] |
\`\`\`

> [!NOTE] How to Improvise with Triad Pairs
> Practice arpeggiating them in alternating order:
> Up Triad 1 -> Down Triad 2 -> Up Inversion 1 -> Down Inversion 2.
> Example in C Lydian: \`C-E-G\` -> \`A-F#-D\` -> \`E-G-C\` -> \`F#-D-A\`.

## Connections
- Perfect companion to [[Coltrane Matrix & Giant Steps Cycle]] angular phrasing.
- Superimposes smoothly over [[Bill Evans Rootless Shells]].
`,
  },
];
