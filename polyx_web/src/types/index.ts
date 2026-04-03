export interface User {
  user_id: number;
  wallet_address: string | null;
  username?: string | null;
  auth_provider: string;
  referral_code: string;
  created_at: string;
  is_active?: number;
  total_fees_paid?: number;
  positions_value?: number;
  position_count?: number;
  daily_pnl?: number;
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
  dry_run: number;           // 0 or 1 from API
  notifications_on: number;  // 0 or 1 from API
  copy_trading_active: number; // 0 or 1 from API
  demo_mode: number;         // 0 or 1 from API
  demo_balance: number;
}

export interface Position {
  id: number;
  target_wallet: string | null;
  condition_id: string;
  outcome_index: number;
  token_id: string;
  title: string | null;
  outcome: string | null;
  entry_price: number;
  bet_amount: number;
  target_usdc_size: number | null;
  event_slug: string | null;
  opened_at: string;
  is_open: number;
  closed_at?: string | null;
  exit_price?: number | null;
  pnl_usd?: number | null;
  close_reason?: string | null;
  current_price?: number | null;
  unrealized_pnl?: number | null;
}

export interface CopyTarget {
  id: number;
  wallet_addr: string;
  display_name?: string | null;
  description?: string | null;
  is_active: number;
  added_at: string;
}

export interface PortfolioStats {
  positions_value: number;
  position_count: number;
  daily_pnl: number;
  total_pnl: number;
  win_rate: number;
}

export interface WalletInfo {
  wallet_address: string | null;
  usdc_balance: number;
  matic_balance: number;
}

export interface Market {
  condition_id?: string;
  question?: string;
  category?: string;
  volume?: number;
  liquidity?: number;
  outcomes?: string[];
  outcome_prices?: (string | number)[];
  end_date?: string;
  image?: string;
  // Gamma API fields that may also appear
  title?: string;
  slug?: string;
  volume24hr?: number;
  description?: string;
}

export interface ReferralStats {
  referral_code: string;
  tier1: number;
  tier2: number;
  tier3: number;
  total_reach: number;
  total_earned: number;
  claimable: number;
}

export interface SmartWallet {
  name: string;
  address: string;
  copiers: number;
  description: string;
  weekly_pnl: string;
  stats_url?: string;
}
