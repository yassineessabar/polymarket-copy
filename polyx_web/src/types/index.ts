export interface User {
  user_id: number;
  wallet_address: string;
  username?: string;
  auth_provider: 'telegram' | 'wallet';
  referral_code: string;
  created_at: string;
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
  dry_run: boolean;
  notifications_on: boolean;
  copy_trading_active: boolean;
  demo_mode: boolean;
  demo_balance: number;
}

export interface Position {
  id: number;
  target_wallet: string;
  condition_id: string;
  outcome_index: number;
  token_id: string;
  title: string;
  outcome: string;
  entry_price: number;
  bet_amount: number;
  target_usdc_size: number;
  event_slug: string;
  opened_at: string;
  is_open: boolean;
  closed_at?: string;
  exit_price?: number;
  pnl_usd?: number;
  close_reason?: string;
  current_price?: number;
  unrealized_pnl?: number;
}

export interface CopyTarget {
  wallet_addr: string;
  display_name?: string;
  description?: string;
  is_active: boolean;
  added_at: string;
}

export interface PortfolioStats {
  positions_value: number;
  total_pnl: number;
  open_count: number;
  closed_count: number;
  daily_pnl: number;
}

export interface Market {
  title: string;
  slug: string;
  markets_count: number;
  volume: number;
}

export interface ReferralStats {
  referral_code: string;
  referral_link: string;
  total_referrals: number;
  tier1_count: number;
  tier2_count: number;
  tier3_count: number;
  total_earned: number;
  claimable: number;
}
