'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import type { ExceptionItem } from '@/types';

const mockExceptions: ExceptionItem[] = [
  { id: 'EX-001', transaction_id: 'SEPAY-0006', error_type: 'Không tìm thấy đơn hàng', amount: 80000, timestamp: '10/07/2026 10:30', status: 'Chờ xử lý', sender: 'Nguyễn Văn B', note: 'Chuyen khoan cat toc', ai_suggestion: 'Doanh thu — cắt tóc', confidence: 0.92, reasoning: 'Số tiền 80,000₫ khớp với giá dịch vụ cắt tóc. Note có từ khóa "cat toc".' },
  { id: 'EX-002', transaction_id: 'SEPAY-0011', error_type: 'Trùng lặp giao dịch', amount: 50000, timestamp: '15/07/2026 14:20', status: 'Chờ xử lý', sender: 'Trần Thị C', note: 'CK Salon Hoa 50000', ai_suggestion: 'Trùng lặp — kiểm tra giao dịch gốc', confidence: 0.88, reasoning: 'Giao dịch cùng số tiền và cùng ngày với SEPAY-0005. Có thể là thanh toán trùng.' },
  { id: 'EX-003', transaction_id: 'SEPAY-0016', error_type: 'Số tiền không khớp', amount: 5000000, timestamp: '16/07/2026 09:00', status: 'Chờ xử lý', sender: 'Phạm Văn D', note: 'Noi bo chuyen von', ai_suggestion: 'Chuyển nội bộ — không phải doanh thu', confidence: 0.82, reasoning: 'Số tiền lớn bất thường. Note có "noi bo" và "chuyen von" cho thấy đây là giao dịch nội bộ.' },
  { id: 'EX-004', transaction_id: 'SEPAY-0018', error_type: 'Thiếu hóa đơn', amount: 200000, timestamp: '17/07/2026 11:15', status: 'Chờ xử lý', sender: 'Lê Thị E', note: 'Goi dau 200k', ai_suggestion: 'Doanh thu — gội đầu, cần xuất hóa đơn', confidence: 0.95, reasoning: 'Số tiền 200,000₫ khớp giá gội đầu. Sale ORDER-0028 chưa có hóa đơn.' },
  { id: 'EX-005', transaction_id: 'CASH-001', error_type: 'Chênh lệch quỹ', amount: 120000, timestamp: '17/07/2026 18:00', status: 'Chờ xử lý', sender: '—', note: 'Cash session discrepancy', ai_suggestion: 'Chênh lệch quỹ tiền mặt -120,000₫', confidence: 0.99, reasoning: 'Tiền đếm 5,080,000₫ khác với dự kiến 5,200,000₫. Chênh lệch 120,000₫.' },
];

export default function ExceptionsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const visible = mockExceptions.filter((e) => !resolved.has(e.id));

  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Quản lý ngoại lệ</h2>
          <p className="font-default text-default text-text-secondary">Các giao dịch cần quyết định con người</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-default p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block font-label-caps text-label-caps text-text-secondary mb-2 uppercase">Merchant</label>
          <select className="w-full bg-white border border-border-default rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary text-body">
            <option>Salon Hoa</option>
          </select>
        </div>
        <div className="w-48">
          <label className="block font-label-caps text-label-caps text-text-secondary mb-2 uppercase">Kỳ báo cáo</label>
          <select className="w-full bg-white border border-border-default rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary text-body">
            <option>07/2026</option>
          </select>
        </div>
        <div className="w-48">
          <label className="block font-label-caps text-label-caps text-text-secondary mb-2 uppercase">Loại ngoại lệ</label>
          <select className="w-full bg-white border border-border-default rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary text-body">
            <option>Tất cả</option>
            <option>Không tìm thấy đơn hàng</option>
            <option>Trùng lặp</option>
            <option>Số tiền không khớp</option>
            <option>Thiếu hóa đơn</option>
            <option>Chênh lệch quỹ</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-success text-4xl">check_circle</span>
          </div>
          <h3 className="font-section-header text-section-header text-text-primary mb-2">Tất cả giao dịch đã đối soát</h3>
          <p className="text-text-secondary">Không còn ngoại lệ nào cần xử lý</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((ex) => (
            <div key={ex.id} className="bg-white rounded-xl shadow-sm border border-border-default overflow-hidden animate-fade-in">
              <div className="p-5 cursor-pointer" onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-warning-light flex items-center justify-center">
                      <span className="material-symbols-outlined text-warning">priority_high</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-data-mono text-data-mono text-text-primary">{ex.transaction_id}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-warning-light text-warning font-label-caps text-label-caps text-xs">
                          {ex.error_type}
                        </span>
                      </div>
                      <p className="font-body text-body text-text-secondary">
                        {ex.sender} — {ex.note}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary-light text-primary font-label-caps text-label-caps text-xs">
                          AI: {ex.ai_suggestion}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-surface-container-low text-text-secondary font-label-caps text-label-caps text-xs">
                          Confidence: {(ex.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data-mono text-data-mono text-text-primary text-lg">{fmt(ex.amount)}₫</p>
                    <p className="font-data-mono text-data-mono text-text-tertiary text-xs mt-1">{ex.timestamp}</p>
                  </div>
                </div>
                {expanded === ex.id && (
                  <div className="mt-4 pt-4 border-t border-border-default animate-fade-in">
                    <h4 className="font-label-caps text-label-caps text-text-secondary uppercase mb-2">AI Reasoning</h4>
                    <p className="font-body text-body text-text-primary mb-4">{ex.reasoning}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setResolved(new Set([...resolved, ex.id])); }}
                        className="primary-gradient text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        Duyệt
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setResolved(new Set([...resolved, ex.id])); }}
                        className="bg-white border border-danger text-danger px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-danger-light transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        Từ chối
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="bg-white border border-border-default text-text-primary px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-surface-container-low transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">category</span>
                        Phân loại lại
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
