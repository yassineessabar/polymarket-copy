'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Settings } from '../../types';

export default function DemoModeBanner() {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    api
      .get<Settings>('/api/user/settings')
      .then((s) => {
        if (s && s.demo_mode) {
          setIsDemoMode(true);
        }
      })
      .catch(() => {
        // Not logged in or API down — don't show banner
      });
  }, []);

  if (!isDemoMode) return null;

  return (
    <div className="flex items-center justify-center bg-amber-600/90 px-4 py-1.5 text-xs font-medium text-white">
      Demo Mode Active — trades are simulated, no real funds at risk
    </div>
  );
}
