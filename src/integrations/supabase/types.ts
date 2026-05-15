export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_notes: {
        Row: {
          created_at: string
          execution_notes: string | null
          id: string
          lessons: string | null
          lucid_eod_day: string
          market_notes: string | null
          mistakes: string | null
          tomorrow_focus: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          execution_notes?: string | null
          id?: string
          lessons?: string | null
          lucid_eod_day: string
          market_notes?: string | null
          mistakes?: string | null
          tomorrow_focus?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          execution_notes?: string | null
          id?: string
          lessons?: string | null
          lucid_eod_day?: string
          market_notes?: string | null
          mistakes?: string | null
          tomorrow_focus?: string | null
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          active_portfolio_mode: string | null
          commission_es_per_side: number | null
          commission_hg_per_side: number | null
          commission_ym_per_side: number | null
          created_at: string
          default_slippage_ticks: number | null
          default_timezone: string | null
          id: string
          user_id: string
        }
        Insert: {
          active_portfolio_mode?: string | null
          commission_es_per_side?: number | null
          commission_hg_per_side?: number | null
          commission_ym_per_side?: number | null
          created_at?: string
          default_slippage_ticks?: number | null
          default_timezone?: string | null
          id?: string
          user_id: string
        }
        Update: {
          active_portfolio_mode?: string | null
          commission_es_per_side?: number | null
          commission_hg_per_side?: number | null
          commission_ym_per_side?: number | null
          created_at?: string
          default_slippage_ticks?: number | null
          default_timezone?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          actual_minus_theoretical: number | null
          actual_pnl: number | null
          body_fraction: number | null
          body_pct: number | null
          commissions_current: number | null
          commissions_optimized: number | null
          confirm_value: number | null
          created_at: string
          current_qty: number | null
          current_session_open: number | null
          date_et: string | null
          direction: string | null
          entry_price_actual: number | null
          entry_price_theoretical: number | null
          entry_time_et: string | null
          estimated_slippage_current: number | null
          estimated_slippage_optimized: number | null
          exit_price_actual: number | null
          exit_price_theoretical: number | null
          exit_reason: string | null
          exit_time_et: string | null
          gap_pct: number | null
          gc_watch_flags: string | null
          gross_pnl_current: number | null
          gross_pnl_optimized: number | null
          id: string
          lucid_eod_day: string | null
          mini_equivalent: number | null
          move_pct: number | null
          net_pnl_current: number | null
          net_pnl_optimized: number | null
          notes: string | null
          optimized_qty: number | null
          portfolio_version: string | null
          prev_context_close: number | null
          prev_context_open: number | null
          rule_error_type: string | null
          rule_followed: boolean | null
          session_name: string | null
          setup_value: number | null
          signal_time_et: string | null
          slippage_ticks: number | null
          stop_price: number | null
          strategy_name: string | null
          symbol: string
          target_price: number | null
          theoretical_pnl: number | null
          trade_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minus_theoretical?: number | null
          actual_pnl?: number | null
          body_fraction?: number | null
          body_pct?: number | null
          commissions_current?: number | null
          commissions_optimized?: number | null
          confirm_value?: number | null
          created_at?: string
          current_qty?: number | null
          current_session_open?: number | null
          date_et?: string | null
          direction?: string | null
          entry_price_actual?: number | null
          entry_price_theoretical?: number | null
          entry_time_et?: string | null
          estimated_slippage_current?: number | null
          estimated_slippage_optimized?: number | null
          exit_price_actual?: number | null
          exit_price_theoretical?: number | null
          exit_reason?: string | null
          exit_time_et?: string | null
          gap_pct?: number | null
          gc_watch_flags?: string | null
          gross_pnl_current?: number | null
          gross_pnl_optimized?: number | null
          id?: string
          lucid_eod_day?: string | null
          mini_equivalent?: number | null
          move_pct?: number | null
          net_pnl_current?: number | null
          net_pnl_optimized?: number | null
          notes?: string | null
          optimized_qty?: number | null
          portfolio_version?: string | null
          prev_context_close?: number | null
          prev_context_open?: number | null
          rule_error_type?: string | null
          rule_followed?: boolean | null
          session_name?: string | null
          setup_value?: number | null
          signal_time_et?: string | null
          slippage_ticks?: number | null
          stop_price?: number | null
          strategy_name?: string | null
          symbol: string
          target_price?: number | null
          theoretical_pnl?: number | null
          trade_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minus_theoretical?: number | null
          actual_pnl?: number | null
          body_fraction?: number | null
          body_pct?: number | null
          commissions_current?: number | null
          commissions_optimized?: number | null
          confirm_value?: number | null
          created_at?: string
          current_qty?: number | null
          current_session_open?: number | null
          date_et?: string | null
          direction?: string | null
          entry_price_actual?: number | null
          entry_price_theoretical?: number | null
          entry_time_et?: string | null
          estimated_slippage_current?: number | null
          estimated_slippage_optimized?: number | null
          exit_price_actual?: number | null
          exit_price_theoretical?: number | null
          exit_reason?: string | null
          exit_time_et?: string | null
          gap_pct?: number | null
          gc_watch_flags?: string | null
          gross_pnl_current?: number | null
          gross_pnl_optimized?: number | null
          id?: string
          lucid_eod_day?: string | null
          mini_equivalent?: number | null
          move_pct?: number | null
          net_pnl_current?: number | null
          net_pnl_optimized?: number | null
          notes?: string | null
          optimized_qty?: number | null
          portfolio_version?: string | null
          prev_context_close?: number | null
          prev_context_open?: number | null
          rule_error_type?: string | null
          rule_followed?: boolean | null
          session_name?: string | null
          setup_value?: number | null
          signal_time_et?: string | null
          slippage_ticks?: number | null
          stop_price?: number | null
          strategy_name?: string | null
          symbol?: string
          target_price?: number | null
          theoretical_pnl?: number | null
          trade_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
