
-- Add new fields for capacity_rank1_gc portfolio (MES, GC support + paper-forward validation)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS mini_equivalent numeric,
  ADD COLUMN IF NOT EXISTS theoretical_pnl numeric,
  ADD COLUMN IF NOT EXISTS actual_pnl numeric,
  ADD COLUMN IF NOT EXISTS actual_minus_theoretical numeric,
  ADD COLUMN IF NOT EXISTS session_name text,
  ADD COLUMN IF NOT EXISTS move_pct numeric,
  ADD COLUMN IF NOT EXISTS prev_context_open numeric,
  ADD COLUMN IF NOT EXISTS prev_context_close numeric,
  ADD COLUMN IF NOT EXISTS current_session_open numeric,
  ADD COLUMN IF NOT EXISTS gc_watch_flags text;
