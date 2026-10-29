'use client';

import { useEffect } from 'react';

export const IDLE_LIMIT_MS = 60_000;
export const ACTIVITY_KEY = 'srs-nova-last-activity';

export function touchActivity(): void {
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function IdleActivity() {
  useEffect(() => {
    touchActivity();
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 1000) return;
      lastWrite = now;
      touchActivity();
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;
    for (const event of events) window.addEventListener(event, onActivity, { passive: true });
    return () => {
      for (const event of events) window.removeEventListener(event, onActivity);
    };
  }, []);

  return null;
}
