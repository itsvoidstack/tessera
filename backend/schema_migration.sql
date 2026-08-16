-- Tessera Notes Schema Migration for public.notes
-- Adds minimal note classification and scan tracking columns while keeping existing RLS & ownership

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS note_type VARCHAR(32) DEFAULT 'personal';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS insight_type VARCHAR(64) NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS last_scan_id VARCHAR(64) NULL;

-- Index for efficient project-scoped queries
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON public.notes(project_id);
