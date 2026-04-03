'use client';

import { Menu, Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useAuth } from '../../providers/AuthProvider';
import { injected } from 'wagmi/connectors';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isAuthenticated, login, logout, user } = useAuth();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  async function handleConnect() {
    if (isConnected && !isAuthenticated) {
      await login();
    } else if (!isConnected) {
      connect({ connector: injected() });
    }
  }

  function handleDisconnect() {
    logout();
    disconnect();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-dark-border bg-dark-card px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="text-text-secondary hover:text-text-primary lg:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        {user?.auth_provider === 'wallet' && (
          <span className="hidden text-sm text-text-secondary sm:block">
            {truncated}
          </span>
        )}

        {isConnected && isAuthenticated ? (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark-hover px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent"
          >
            <Wallet size={16} />
            {truncated}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            <Wallet size={16} />
            {isConnected ? 'Sign In' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}
