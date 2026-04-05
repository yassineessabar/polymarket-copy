"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notificationsApi } from "@/lib/api";
import type { Notification } from "@/lib/types";

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
        <div className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function badgeStyle(type: string) {
    switch (type) {
      case "BUY":
        return "bg-[#E6F7EF] text-[#009D55]";
      case "SELL":
        return "bg-[#FEE2E2] text-[#DC2626]";
      case "CLOSE":
        return "bg-[#FFF3E0] text-[#D97706]";
      default:
        return "bg-[#F3F3F3] text-[#9B9B9B]";
    }
  }

  return (
    <div className="max-w-[700px] mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[#9B9B9B] hover:text-[#121212] transition-colors mb-5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#121212]">
          Notifications
          {unread > 0 && (
            <span className="ml-2 inline-flex items-center justify-center text-xs font-bold bg-[#121212] text-white rounded-full w-5 h-5 align-middle">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-[#121212] font-medium underline hover:text-[#656565] transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" className="mx-auto mb-4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <h3 className="font-bold mb-1 text-[#121212]">No notifications yet</h3>
          <p className="text-sm text-[#9B9B9B] font-medium">Trade activity and alerts will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                <span className={`mt-0.5 flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${badgeStyle(n.type)}`}>
                  {n.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${isUnread ? "text-[#121212]" : "text-[#656565]"}`}>
                    {clean.length > 140 ? clean.slice(0, 140) + "..." : clean}
                  </p>
                  <span className="text-[11px] text-[#9B9B9B] mt-1 block">
                    {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {isUnread && (
                  <div className="w-2 h-2 rounded-full bg-[#121212] flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
