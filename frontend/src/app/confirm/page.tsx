'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';

const pendingItems = [
  { id: '1', type: 'Phân loại giao dịch', description: 'SEPAY-0016 — 5,000,000₫', suggestion: 'Chuyển nội bộ — không phải doanh thu', confidence: 0.82 },
  { id: '2', type: 'Xuất hóa đơn', description: 'ORDER-0028 — 200,000₫', suggestion: 'Cần xuất hóa đơn cho dịch vụ gội đầu', confidence: 0.95 },
  { id: '3', type: 'Chênh lệch quỹ', description: 'CASH-001 — -120,000₫', suggestion: 'Chênh lệch tiền mặt ca 17/07', confidence: 0.99 },
];

export default function ConfirmPage() {
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const remaining = pendingItems.filter((i) => !approved.has(i.id) && !rejected.has(i.id));

  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Xác nhận từ Merchant</h2>
          <p className="font-default text-default text-text-secondary">Các quyết định cần merchant phê duyệt</p>
        </div>
        <span className="inline-flex items-center px-4 py-2 rounded-full bg-warning-light text-warning font-label-caps text-label-caps">
          {remaining.length} mục chờ duyệt
        </span>
      </div>

      {remaining.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-success text-4xl">check_circle</span>
          </div>
          <h3 className="font-section-header text-section-header text-text-primary mb-2">Tất cả đã được phê duyệt</h3>
          <p className="text-text-secondary">Không còn mục nào cần xác nhận</p>
        </div>
      ) : (
        <div className="space-y-4">
          {remaining.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-border-default p-6 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">pending_actions</span>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-low text-text-secondary font-label-caps text-label-caps text-xs mb-2">
                      {item.type}
                    </span>
                    <h4 className="font-section-header text-section-header text-text-primary">{item.description}</h4>
                    <p className="font-body text-body text-text-secondary mt-1">{item.suggestion}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary-light text-primary font-label-caps text-label-caps text-xs">
                        AI Confidence: {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border-default flex gap-3">
                <button
                  onClick={() => setApproved(new Set(Array.from(approved).concat(item.id)))}
                  className="primary-gradient text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Duyệt
                </button>
                <button
                  onClick={() => setRejected(new Set(Array.from(rejected).concat(item.id)))}
                  className="bg-white border border-danger text-danger px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-danger-light transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(approved.size > 0 || rejected.size > 0) && (
        <div className="mt-8 space-y-4">
          <h3 className="font-section-header text-section-header text-text-secondary">Đã xử lý</h3>
          {pendingItems
            .filter((i) => approved.has(i.id) || rejected.has(i.id))
            .map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-border-default p-4 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${approved.has(item.id) ? 'text-success' : 'text-danger'}`}>
                    {approved.has(item.id) ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="font-body text-body text-text-primary">{item.description}</span>
                </div>
                <span className={`font-label-caps text-label-caps ${approved.has(item.id) ? 'text-success' : 'text-danger'}`}>
                  {approved.has(item.id) ? 'Đã duyệt' : 'Đã từ chối'}
                </span>
              </div>
            ))}
        </div>
      )}
    </AppShell>
  );
}
