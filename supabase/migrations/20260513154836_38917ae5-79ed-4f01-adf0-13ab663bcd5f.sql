
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_et DATE,
  lucid_eod_day DATE,
  symbol TEXT NOT NULL,
  strategy_name TEXT,
  portfolio_version TEXT,
  trade_status TEXT,
  direction TEXT,
  current_qty INTEGER,
  optimized_qty INTEGER,
  signal_time_et TEXT,
  entry_time_et TEXT,
  exit_time_et TEXT,
  setup_value NUMERIC,
  confirm_value NUMERIC,
  gap_pct NUMERIC,
  body_pct NUMERIC,
  body_fraction NUMERIC,
  entry_price_theoretical NUMERIC,
  entry_price_actual NUMERIC,
  stop_price NUMERIC,
  target_price NUMERIC,
  exit_price_theoretical NUMERIC,
  exit_price_actual NUMERIC,
  exit_reason TEXT,
  gross_pnl_current NUMERIC,
  gross_pnl_optimized NUMERIC,
  commissions_current NUMERIC DEFAULT 0,
  commissions_optimized NUMERIC DEFAULT 0,
  estimated_slippage_current NUMERIC DEFAULT 0,
  estimated_slippage_optimized NUMERIC DEFAULT 0,
  net_pnl_current NUMERIC,
  net_pnl_optimized NUMERIC,
  slippage_ticks NUMERIC,
  rule_followed BOOLEAN,
  rule_error_type TEXT,
  notes TEXT
);

CREATE TABLE public.daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lucid_eod_day DATE NOT NULL,
  market_notes TEXT,
  execution_notes TEXT,
  mistakes TEXT,
  lessons TEXT,
  tomorrow_focus TEXT
);

CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  default_timezone TEXT DEFAULT 'America/New_York',
  commission_es_per_side NUMERIC DEFAULT 2.50,
  commission_ym_per_side NUMERIC DEFAULT 2.50,
  commission_hg_per_side NUMERIC DEFAULT 2.50,
  default_slippage_ticks NUMERIC DEFAULT 0.5,
  active_portfolio_mode TEXT DEFAULT 'Both'
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own trades select" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own trades insert" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own trades update" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own trades delete" ON public.trades FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own notes select" ON public.daily_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own notes insert" ON public.daily_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes update" ON public.daily_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own notes delete" ON public.daily_notes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own settings select" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own settings insert" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own settings update" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own settings delete" ON public.settings FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX trades_user_date_idx ON public.trades(user_id, date_et DESC);
CREATE INDEX trades_user_eod_idx ON public.trades(user_id, lucid_eod_day);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trades_updated_at BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
