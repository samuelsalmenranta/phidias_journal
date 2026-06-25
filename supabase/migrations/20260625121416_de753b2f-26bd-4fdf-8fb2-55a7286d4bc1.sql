
DELETE FROM public.trades;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS leg_id text,
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS account_structure text,
  ADD COLUMN IF NOT EXISTS account_label text,
  ADD COLUMN IF NOT EXISTS timeframe text,
  ADD COLUMN IF NOT EXISTS family text,
  ADD COLUMN IF NOT EXISTS qty integer,
  ADD COLUMN IF NOT EXISTS signal_close numeric,
  ADD COLUMN IF NOT EXISTS atr_period integer,
  ADD COLUMN IF NOT EXISTS atr_value numeric,
  ADD COLUMN IF NOT EXISTS stop_multiple numeric,
  ADD COLUMN IF NOT EXISTS target_multiple numeric,
  ADD COLUMN IF NOT EXISTS time_exit_time text,
  ADD COLUMN IF NOT EXISTS hard_flat_relevant boolean,
  ADD COLUMN IF NOT EXISTS prev_high numeric,
  ADD COLUMN IF NOT EXISTS prev_low numeric,
  ADD COLUMN IF NOT EXISTS prev_close numeric,
  ADD COLUMN IF NOT EXISTS overnight_high numeric,
  ADD COLUMN IF NOT EXISTS overnight_low numeric,
  ADD COLUMN IF NOT EXISTS r4 numeric,
  ADD COLUMN IF NOT EXISTS s4 numeric,
  ADD COLUMN IF NOT EXISTS upper_threshold numeric,
  ADD COLUMN IF NOT EXISTS lower_threshold numeric,
  ADD COLUMN IF NOT EXISTS distance numeric,
  ADD COLUMN IF NOT EXISTS distance_threshold numeric,
  ADD COLUMN IF NOT EXISTS slippage_est numeric;

CREATE INDEX IF NOT EXISTS trades_leg_id_idx ON public.trades(user_id, leg_id);
