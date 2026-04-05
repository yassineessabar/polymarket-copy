"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { userApi, clearToken } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";
import { Button, Card, Spinner } from "@/components/ui";
import {
  IconWallet, IconKey, IconChevronRight, IconBook,
  IconQuestion, IconEnvelope, IconShield, IconDocument,
  IconSend, IconExternalLink, IconLogout,
} from "@/components/ui";
import { PageHeader } from "@/components";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function copyWallet() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPrivateKey() {
    const key = profile?.private_key || profile?.auth_wallet || "";
    if (key) {
      navigator.clipboard.writeText(key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }

  function logout() {
    clearToken();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const walletDisplay = profile?.wallet_address
    ? truncateAddress(profile.wallet_address)
    : "Not connected";

  return (
    <div className="max-w-[700px] mx-auto">
      <PageHeader title="Settings" />

      {/* Wallet */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconWallet size={20} className="text-[#6B7280]" />
            <div>
              <p className="text-sm font-medium text-[#0F0F0F]">Wallet</p>
              <p className="text-xs text-[#6B7280] font-mono">{walletDisplay}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyWallet}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </Card>

      {/* Export Private Key -- inline expandable */}
      <Card padding="none" className="mb-4 overflow-hidden">
        <button
          onClick={() => setShowKey(!showKey)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F5F5F5] transition-colors text-left"
        >
          <IconKey size={20} className="text-[#6B7280]" />
          <span className="flex-1 text-sm font-medium text-[#0F0F0F]">Export Private Key</span>
          <IconChevronRight size={16} className={`text-[#9CA3AF] transition-transform ${showKey ? "rotate-90" : ""}`} />
        </button>
        {showKey && (
          <div className="px-5 pb-5 border-t border-black/5">
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-3 mt-4 mb-3">
              <p className="text-xs text-[#856404] font-medium">
                <strong>Warning:</strong> Never share your private key. Anyone with this key has full access to your funds.
              </p>
            </div>
            <div className="bg-[#F5F5F5] rounded-xl px-4 py-3 font-mono text-xs break-all text-[#0F0F0F] mb-3">
              {profile?.private_key || profile?.auth_wallet || "Your private key is securely stored. Contact support to export."}
            </div>
            <Button size="sm" onClick={copyPrivateKey}>
              {keyCopied ? "Copied!" : "Copy Key"}
            </Button>
          </div>
        )}
      </Card>

      {/* Help & Resources -- inline expandable */}
      <Card padding="none" className="mb-4 overflow-hidden">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F5F5F5] transition-colors text-left"
        >
          <IconBook size={20} className="text-[#6B7280]" />
          <span className="flex-1 text-sm font-medium text-[#0F0F0F]">Help & Resources</span>
          <IconChevronRight size={16} className={`text-[#9CA3AF] transition-transform ${showHelp ? "rotate-90" : ""}`} />
        </button>
        {showHelp && (
          <div className="px-5 pb-5 border-t border-black/5 pt-3">
            <div className="space-y-1">
              <a href="https://t.me/polycoolapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F5] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <IconQuestion size={16} className="text-[#0F0F0F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">FAQ & Support</p>
                  <p className="text-xs text-[#6B7280]">Get help from our team on Telegram</p>
                </div>
              </a>
              <a href="mailto:support@polycool.app" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F5] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <IconEnvelope size={16} className="text-[#0F0F0F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">Email Support</p>
                  <p className="text-xs text-[#6B7280]">support@polycool.app</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <IconShield size={16} className="text-[#0F0F0F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">Security</p>
                  <p className="text-xs text-[#6B7280]">Your funds are secured on Polygon</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <IconDocument size={16} className="text-[#0F0F0F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">Terms of Service</p>
                  <p className="text-xs text-[#6B7280]">Legal terms and conditions</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Join the Community */}
      <a href="https://t.me/polycoolapp" target="_blank" rel="noopener noreferrer">
        <Card className="mb-4 hover:bg-[#F5F5F5] transition-colors">
          <div className="flex items-center gap-3">
            <IconSend size={20} className="text-[#6B7280]" />
            <span className="flex-1 text-sm font-medium text-[#0F0F0F]">Join the Community</span>
            <IconExternalLink size={14} className="text-[#9CA3AF]" />
          </div>
        </Card>
      </a>

      {/* Account Info */}
      <Card className="mb-4">
        <h3 className="font-bold text-sm text-[#0F0F0F] mb-3">Account</h3>
        <div className="space-y-0 text-sm">
          <div className="flex justify-between py-3 border-b border-black/5">
            <span className="text-[#6B7280] font-medium">Auth</span>
            <span className="font-medium text-[#0F0F0F]">
              {(profile?.auth_provider || "web").charAt(0).toUpperCase() + (profile?.auth_provider || "web").slice(1)}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-black/5">
            <span className="text-[#6B7280] font-medium">Wallet</span>
            <span className="font-medium text-[#0F0F0F] font-mono text-xs">{walletDisplay}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-[#6B7280] font-medium">Since</span>
            <span className="font-medium text-[#0F0F0F]">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "--"}
            </span>
          </div>
        </div>
      </Card>

      {/* Log out */}
      <Button variant="danger" size="sm" onClick={logout} className="gap-3">
        <IconLogout size={18} />
        Log out
      </Button>
    </div>
  );
}
