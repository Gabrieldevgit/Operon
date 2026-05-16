-- ============================================================
-- DTS Coworker — Memory Table Migration
-- Run this in the Supabase SQL editor once.
-- This backs up memory entries to Postgres for durability.
-- Primary store is Firestore (real-time); this is the audit log.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memory_entries (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT        NOT NULL,
  key          TEXT        NOT NULL,
  type         TEXT        NOT NULL,
  scope        TEXT        NOT NULL DEFAULT 'project',
  agent_id     TEXT,
  content      TEXT        NOT NULL,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  importance   SMALLINT    NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memory_workspace
  ON public.memory_entries (workspace_id);

CREATE INDEX IF NOT EXISTS idx_memory_workspace_scope
  ON public.memory_entries (workspace_id, scope);

CREATE INDEX IF NOT EXISTS idx_memory_workspace_type
  ON public.memory_entries (workspace_id, type);

CREATE INDEX IF NOT EXISTS idx_memory_agent
  ON public.memory_entries (workspace_id, agent_id)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memory_importance
  ON public.memory_entries (workspace_id, importance DESC);

CREATE INDEX IF NOT EXISTS idx_memory_tags
  ON public.memory_entries USING GIN (tags);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS memory_entries_updated_at ON public.memory_entries;
CREATE TRIGGER memory_entries_updated_at
  BEFORE UPDATE ON public.memory_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: only workspace members can read their own memories
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;

-- For now allow all authenticated users (tighten in Phase 09)
CREATE POLICY "Authenticated users can manage memories"
  ON public.memory_entries
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ─── Task History Table ────────────────────────────────────────
-- Persists save_action_summary outputs for long-term recall.

CREATE TABLE IF NOT EXISTS public.task_history (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT        NOT NULL,
  task_id       TEXT        NOT NULL,
  task_title    TEXT        NOT NULL,
  agent_id      TEXT        NOT NULL,
  what_was_done TEXT        NOT NULL,
  why_it_was_done TEXT      NOT NULL,
  files_changed TEXT[]      NOT NULL DEFAULT '{}',
  decisions     TEXT[]      NOT NULL DEFAULT '{}',
  next_steps    TEXT[]      NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_workspace
  ON public.task_history (workspace_id, created_at DESC);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage task history"
  ON public.task_history
  FOR ALL
  USING (auth.role() = 'authenticated');
