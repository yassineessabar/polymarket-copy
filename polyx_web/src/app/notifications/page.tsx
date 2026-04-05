"use client";

import { useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { Card, Badge, Spinner } from "@/components/ui";
import { IconBell } from "@/components/ui";
import { PageHeader, EmptyState } from "@/components";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const data = await notificationsApi.list(false, 50);
      setNotifications(data.notifications);
      setUnread(data.unread_count);
    } catch {}
    setLoading(false);
  }

  async function markAllRead() {
    try {
      await notificationsApi.markRead([], true);
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  function badgeVariant(type: string): "success" | "danger" | "neutral" {
    switch (type) {
      case "BUY": return "success";
      case "SELL": return "danger";
      case "CLOSE": return "neutral";
      default: return "neutral";
    }
  }

  return (
    <div className="max-w-[700px] mx-auto">
      <PageHeader
        title={`Notifications`}
        backHref="/dashboard"
        action={
          unread > 0 ? (
            <button onClick={markAllRead} className="text-xs text-[#0F0F0F] font-medium underline hover:text-[#6B7280] transition-colors">
              Mark all read
            </button>
          ) : undefined
        }
      />

      {unread > 0 && (
        <div className="mb-4 -mt-4">
          <span className="inline-flex items-center justify-center text-xs font-bold bg-[#0F0F0F] text-white rounded-full w-5 h-5">
            {unread > 99 ? "99+" : unread}
          </span>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={<IconBell size={40} className="text-[#D1D5DB]" />}
          title="No notifications yet"
          subtitle="Trade activity and alerts will appear here."
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          {notifications.map((n) => {
            let text = n.payload;
            try {
              const parsed = JSON.parse(n.payload);
              text = parsed.text || parsed.message || n.payload;
            } catch {
              // payload is plain text, keep as-is
            }
            const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            const time = new Date(n.created_at);
            const isUnread = !n.read;

            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 border-b border-black/5 last:border-0 transition-colors ${isUnread ? "bg-[#F8F9FB]" : ""}`}
              >
                <Badge variant={badgeVariant(n.type)} className="mt-0.5 flex-shrink-0 text-[10px] uppercase tracking-wide rounded-md">
                  {n.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${isUnread ? "text-[#0F0F0F]" : "text-[#6B7280]"}`}>
                    {clean.length > 140 ? clean.slice(0, 140) + "..." : clean}
                  </p>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {isUnread && (
                  <div className="w-2 h-2 rounded-full bg-[#0F0F0F] flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
