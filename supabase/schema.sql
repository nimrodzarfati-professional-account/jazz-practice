-- ==============================================================================
-- Shed Engine V2 — Supabase Cloud Realtime Database Schema & Security Policies
-- Paste this script into your Supabase Dashboard -> SQL Editor and tap RUN.
-- ==============================================================================

-- 1. Active Standard Table (1-2 Week Cycle)
CREATE TABLE IF NOT EXISTS public.active_standard (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'std_1',
  title TEXT NOT NULL,
  default_key TEXT NOT NULL DEFAULT 'Bb',
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  rotation_cycle_days INTEGER NOT NULL DEFAULT 14,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Exercises Table (In-Rotation & Repertoire Vault)
CREATE TABLE IF NOT EXISTS public.exercises (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  context TEXT NOT NULL CHECK(context IN ('SOLOING', 'COMPING')),
  category TEXT NOT NULL CHECK(category IN ('MAINTENANCE', 'TRANSCRIBING', 'NEW_CONCEPT')),
  in_rotation BOOLEAN NOT NULL DEFAULT true,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  intensity INTEGER NOT NULL DEFAULT 3 CHECK(intensity BETWEEN 1 AND 5),
  base_priority INTEGER NOT NULL DEFAULT 5,
  current_bpm INTEGER NOT NULL DEFAULT 120,
  is_key_based BOOLEAN NOT NULL DEFAULT false,
  mastered_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  uses_active_standard BOOLEAN NOT NULL DEFAULT false,
  last_practiced_at TIMESTAMPTZ,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  rotation_changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  accumulated_in_rotation_ms BIGINT NOT NULL DEFAULT 0,
  accumulated_out_rotation_ms BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Practice Sessions Table (Historical Logs)
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  available_minutes INTEGER NOT NULL,
  intensity INTEGER NOT NULL CHECK(intensity BETWEEN 1 AND 5),
  blocks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_exercises_rotation ON public.exercises(in_rotation);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_context ON public.exercises(context);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.active_standard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read & write access for mobile client & web browser using Anon key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'active_standard' AND policyname = 'Allow public read-write for active_standard'
  ) THEN
    CREATE POLICY "Allow public read-write for active_standard"
      ON public.active_standard FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Allow public read-write for exercises'
  ) THEN
    CREATE POLICY "Allow public read-write for exercises"
      ON public.exercises FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practice_sessions' AND policyname = 'Allow public read-write for practice_sessions'
  ) THEN
    CREATE POLICY "Allow public read-write for practice_sessions"
      ON public.practice_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime for Exercises and Active Standard tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exercises;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_standard;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
