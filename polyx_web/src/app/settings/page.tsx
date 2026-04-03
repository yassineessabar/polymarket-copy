'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import type { Settings } from '@/types';
import { Shield, Beaker, Activity, Save, RotateCcw } from 'lucide-react';

function ToggleGroup({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v) => String(v));
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-primary">{label}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              value === opt
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-dark-border bg-dark-bg text-text-secondary hover:border-text-secondary/30 hover:text-text-primary'
            }`}
          >
            {fmt(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function fetchSettings() {
    try {
      const s = await api.get<Settings>('/api/user/settings');
      setSettings(s);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchSettings().finally(() => setLoading(false));
  }, []);

  function update(patch: Partial<Settings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    setDirty(true);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      // Only send fields that UpdateSettingsRequest accepts
      await api.patch('/api/user/settings', {
        trade_mode: settings.trade_mode,
        quickbuy_amount: settings.quickbuy_amount,
        max_risk_pct: settings.max_risk_pct,
        min_bet: settings.min_bet,
        max_open_positions: settings.max_open_positions,
        max_per_event: settings.max_per_event,
        max_exposure_pct: settings.max_exposure_pct,
        daily_loss_limit_pct: settings.daily_loss_limit_pct,
        drawdown_scale_start: settings.drawdown_scale_start,
        correlation_penalty: settings.correlation_penalty,
        dry_run: settings.dry_run,
        notifications_on: settings.notifications_on,
      });
      // Re-fetch to get the actual saved state
      await fetchSettings();
      setDirty(false);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDemoMode() {
    if (!settings) return;
    try {
      const isCurrentlyDemo = !!settings.demo_mode;
      if (isCurrentlyDemo) {
        await api.post('/api/user/demo/disable');
      } else {
        await api.post('/api/user/demo/enable', { balance: 1000.0 });
      }
      await fetchSettings();
    } catch (e) {
      console.error('Toggle demo failed:', e);
    }
  }

  async function resetDemoBalance(amount: number) {
    try {
      await api.post('/api/user/demo/reset', { balance: amount });
      await fetchSettings();
    } catch (e) {
      console.error('Reset failed:', e);
    }
  }

  const isDemo = !!(settings?.demo_mode);
  const isDryRun = !!(settings?.dry_run);

  const mode = isDemo
    ? 'Demo'
    : isDryRun
    ? 'Dry Run'
    : 'Live';

  const modeColor = isDemo
    ? 'text-amber-400 bg-amber-400/10'
    : isDryRun
    ? 'text-blue-400 bg-blue-400/10'
    : 'text-profit bg-profit/10';

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Configure risk parameters and trading preferences
              </p>
            </div>
            {dirty && (
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>

          {loading || !settings ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl border border-dark-border bg-dark-card"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Trading Mode Indicator */}
              <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
                <Activity size={16} className="text-text-secondary" />
                <span className="text-sm text-text-secondary">Trading Mode:</span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${modeColor}`}
                >
                  {mode}
                </span>
              </div>

              {/* Risk Parameters */}
              <div className="rounded-xl border border-dark-border bg-dark-card p-5">
                <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Shield size={16} className="text-accent" />
                  Risk Parameters
                </div>
                <div className="space-y-5">
                  <ToggleGroup
                    label="Max Risk Per Trade"
                    options={[5, 10, 20]}
                    value={settings.max_risk_pct}
                    onChange={(v) => update({ max_risk_pct: v })}
                    format={(v) => `${v}%`}
                  />
                  <ToggleGroup
                    label="Min Bet Size"
                    options={[1, 5, 10]}
                    value={settings.min_bet}
                    onChange={(v) => update({ min_bet: v })}
                    format={(v) => `$${v}`}
                  />
                  <ToggleGroup
                    label="Max Open Positions"
                    options={[10, 20, 50]}
                    value={settings.max_open_positions}
                    onChange={(v) => update({ max_open_positions: v })}
                  />
                  <ToggleGroup
                    label="Max Exposure"
                    options={[25, 50, 75]}
                    value={settings.max_exposure_pct}
                    onChange={(v) => update({ max_exposure_pct: v })}
                    format={(v) => `${v}%`}
                  />
                </div>
              </div>

              {/* Demo Mode */}
              <div className="rounded-xl border border-dark-border bg-dark-card p-5">
                <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Beaker size={16} className="text-amber-400" />
                  Demo Mode
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary">Paper Trading</p>
                    <p className="text-xs text-text-secondary">
                      Simulate trades without real funds
                    </p>
                  </div>
                  <button
                    onClick={toggleDemoMode}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      isDemo ? 'bg-accent' : 'bg-dark-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                        isDemo ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {isDemo && (
                  <div className="mt-5 space-y-4 border-t border-dark-border pt-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Demo Balance
                      </p>
                      <p className="mt-1 font-mono text-2xl font-bold text-text-primary">
                        ${(settings.demo_balance ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-text-primary">
                        Reset Balance To
                      </p>
                      <div className="flex gap-2">
                        {[1000, 5000, 10000, 50000].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => resetDemoBalance(amount)}
                            className="flex items-center gap-1 rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
                          >
                            <RotateCcw size={12} />$
                            {amount >= 1000 ? `${amount / 1000}K` : amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
