-- ==============================================================================
-- Shed Engine V2 — Full Cross-Device Sync Schema (Run in Supabase SQL Editor)
-- ==============================================================================

-- 1. Active Standard Table
CREATE TABLE IF NOT EXISTS public.active_standard (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'std_1',
  title TEXT NOT NULL,
  default_key TEXT NOT NULL DEFAULT 'Bb',
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  rotation_cycle_days INTEGER NOT NULL DEFAULT 14,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Exercises Table (In-Rotation & Vault)
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

-- 3. Practice Logs Table (Every Exercise Played Across Computer & Phone)
CREATE TABLE IF NOT EXISTS public.practice_logs (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_title TEXT NOT NULL,
  standard_title TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  bpm_achieved INTEGER NOT NULL DEFAULT 120,
  mastered_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  practiced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. User Sync State Table (Call Sheet Faders, Active Queue Position, Metronome & Theme)
CREATE TABLE IF NOT EXISTS public.user_sync_state (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'state_1',
  available_minutes INTEGER NOT NULL DEFAULT 30,
  intensity INTEGER NOT NULL DEFAULT 3,
  context_filter TEXT NOT NULL DEFAULT 'ALL',
  active_queue_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_queue_index INTEGER NOT NULL DEFAULT 0,
  metronome_feel TEXT NOT NULL DEFAULT 'BACKBEAT_2_4',
  metronome_voice TEXT NOT NULL DEFAULT 'PENDULUM',
  theme_mode TEXT NOT NULL DEFAULT 'default',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_exercises_rotation ON public.exercises(in_rotation);
CREATE INDEX IF NOT EXISTS idx_practice_logs_practiced_at ON public.practice_logs(practiced_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_logs_exercise_id ON public.practice_logs(exercise_id);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.active_standard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sync_state ENABLE ROW LEVEL SECURITY;

-- Policies for Anon Key R/W
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'active_standard' AND policyname = 'Allow public read-write for active_standard') THEN
    CREATE POLICY "Allow public read-write for active_standard" ON public.active_standard FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Allow public read-write for exercises') THEN
    CREATE POLICY "Allow public read-write for exercises" ON public.exercises FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'practice_logs' AND policyname = 'Allow public read-write for practice_logs') THEN
    CREATE POLICY "Allow public read-write for practice_logs" ON public.practice_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sync_state' AND policyname = 'Allow public read-write for user_sync_state') THEN
    CREATE POLICY "Allow public read-write for user_sync_state" ON public.user_sync_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime on all 4 tables
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.exercises; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.active_standard; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.practice_logs; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sync_state; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
