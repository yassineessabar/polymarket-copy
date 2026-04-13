export interface User {
  user_id: number;
  wallet_address: string;
  auth_wallet?: string;
  auth_provider: string;
  created_at: string;
  demo_mode: number;
  demo_balance: number;
}

export interface Settings {
  trade_mode: string;
  quickbuy_amount: number;
  max_risk_pct: number;
  min_bet: number;
  max_open_positions: number;
  max_per_event: number;
  max_exposure_pct: number;
  daily_loss_limit_pct: number;
  drawdown_scale_start: number;
  correlation_penalty: number;
  dry_run: number;
  demo_mode: number;
  demo_balance: number;
  copy_trading_active: number;
}

export interface PortfolioSummary {
  balance_usdc: number;
  positions_value: number;
  position_count: number;
  net_worth: number;
  daily_pnl: number;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  demo_mode: boolean;
}

export interface Position {
  id: number;
  title: string;
  outcome: string;
  entry_price: number;
  bet_amount: number;
  token_id: string;
  condition_id: string;
  target_wallet?: string;
  source_timestamp?: string;
  opened_at: string;
  is_open: number;
  closed_at?: string;
  exit_price?: number;
  pnl_usd?: number;
  close_reason?: string;
  live_price?: number;
  unrealized_pnl?: number;
  pnl_pct?: number;
  end_date?: string;
}

export interface CopyTarget {
  id: number;
  wallet_addr: string;
  display_name: string;
  description: string;
  added_at: string;
  is_active: number;
}

export interface SuggestedTrader {
  wallet: string;
  name: string;
  emoji: string;
  description: string;
  win_rate: number;
  profit: string;
  trades: string;
  copiers: number;
}

export interface Notification {
  id: number;
  type: string;
  payload: string;
  created_at: string;
  read: number;
}

export interface CopyStatus {
  active: boolean;
  target_count: number;
  open_positions: number;
  demo_mode: boolean;
}
