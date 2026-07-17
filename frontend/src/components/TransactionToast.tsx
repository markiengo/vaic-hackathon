'use client';

import { useEffect } from 'react';
import { useTransactionSocket, type TransactionNotification } from '@/hooks/useTransactionSocket';

function formatVND(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('vi-VN') + '₫';
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function ToastCard({
  notification,
  onDismiss,
}: {
  notification: TransactionNotification;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 8000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div className="animate-slide-in-right bg-white rounded-xl shadow-lg border border-success/30 p-4 min-w-[320px] max-w-[400px] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-success" />
      <div className="flex items-start gap-3 pl-2">
        <div className="w-10 h-10 rounded-full bg-success-light flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-success" style={{ fontVariationSettings: "'FILL' 1" }}>
            payments
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-label-caps text-label-caps text-success uppercase font-semibold">
              Tiền vào
            </span>
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <p className="font-hero-numbers text-hero-numbers text-text-primary mt-1">
            +{formatVND(notification.amount)}
          </p>
          {notification.raw_note && (
            <p className="font-body text-body text-text-secondary mt-1 truncate">
              {notification.raw_note}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="font-data-mono text-data-mono text-text-tertiary">
              {notification.account_number || notification.source}
            </span>
            <span className="text-text-tertiary">·</span>
            <span className="font-data-mono text-data-mono text-text-tertiary">
              {formatTime(notification.transaction_date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransactionToastProvider() {
  const { notifications, connected, dismiss } = useTransactionSocket();

  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {connected && notifications.length === 0 && (
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-border-default pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="font-label-caps text-label-caps text-text-secondary">Live</span>
        </div>
      )}
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <ToastCard notification={n} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
