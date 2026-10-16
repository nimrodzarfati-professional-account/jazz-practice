-- ==============================================================================
-- Shed Engine — Supabase Cloud Backup Schema & Security Policies
-- Paste this script into your Supabase Dashboard -> SQL Editor and tap RUN.
-- ==============================================================================

-- 1. Exercises Table (Sync target for local SQLite exercises)
CREATE TABLE IF NOT EXISTS public.exercises (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  context TEXT NOT NULL CHECK(context IN ('soloing', 'comping')),
  category TEXT NOT NULL CHECK(category IN ('maintenance', 'transcribing', 'new_concept')),
  base_priority INTEGER NOT NULL DEFAULT 5,
  default_duration_minutes INTEGER NOT NULL DEFAULT 15,
  target_bpm INTEGER,
  key_stamps_json TEXT NOT NULL DEFAULT '[]',
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 2. Practice Sessions Table
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

-- 3. Session Logs Table
CREATE TABLE IF NOT EXISTS public.session_logs (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  keys_worked_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  bpm_achieved INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  practiced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_cloud_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_cloud_exercises_context ON public.exercises(context);
CREATE INDEX IF NOT EXISTS idx_cloud_session_logs_practiced ON public.session_logs(practiced_at);

-- Row-Level Security (RLS) setup
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for authenticated users or anonymous app clients with anon key
CREATE POLICY "Allow public read-write for anon mobile client"
  ON public.exercises FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for sessions"
  ON public.practice_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for logs"
  ON public.session_logs FOR ALL USING (true) WITH CHECK (true);
