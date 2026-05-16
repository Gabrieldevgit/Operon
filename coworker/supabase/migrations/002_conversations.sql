-- ============================================================
-- DTS Coworker — Conversations Table
-- Persists chat messages across sessions.
-- Run in Supabase SQL Editor after 001_memory.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  agent_id     TEXT,
  agent_name   TEXT,
  content      TEXT        NOT NULL,
  timestamp    BIGINT      NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_workspace
  ON public.conversations (workspace_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_agent
  ON public.conversations (workspace_id, agent_id)
  WHERE agent_id IS NOT NULL;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'authenticated');

-- Allow anonymous access during development
CREATE POLICY "Anon read during development"
  ON public.conversations FOR SELECT
  USING (true);

CREATE POLICY "Anon insert during development"
  ON public.conversations FOR INSERT
  WITH CHECK (true);
