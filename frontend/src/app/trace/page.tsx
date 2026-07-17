'use client';

import { AppShell } from '@/components/AppShell';
import type { AgentStep } from '@/types';

const mockSteps: AgentStep[] = [
  { agent: 'Planner', tool: 'create_plan', status: 'completed', confidence: 1.0, timestamp: '10:24:01', duration: '0.3s', description: 'Tạo kế hoạch đối soát: 4 bước — thu thập dữ liệu, đối soát, phân loại ngoại lệ, tạo báo cáo' },
  { agent: 'Reconciliation', tool: 'fetch_bank_transactions', status: 'completed', confidence: 1.0, timestamp: '10:24:02', duration: '1.2s', description: 'Lấy 23 giao dịch ngân hàng từ SePay cho kỳ 07/2026' },
  { agent: 'Reconciliation', tool: 'fetch_sales', status: 'completed', confidence: 1.0, timestamp: '10:24:03', duration: '0.8s', description: 'Lấy 30 giao dịch bán hàng từ POS' },
  { agent: 'Reconciliation', tool: 'score_match_candidates', status: 'completed', confidence: 0.92, timestamp: '10:24:05', duration: '2.1s', description: 'Đối soát 23/23 giao dịch ngân hàng. 20 khớp chính xác, 3 cần kiểm tra.' },
  { agent: 'MerchantOps', tool: 'classify_exception', status: 'completed', confidence: 0.88, timestamp: '10:24:08', duration: '1.5s', description: 'Phân loại 5 ngoại lệ: 2 thiếu hóa đơn, 1 trùng lặp, 1 sai số tiền, 1 chênh lệch quỹ' },
  { agent: 'TaxCompliance', tool: 'check_required_fields', status: 'completed', confidence: 0.95, timestamp: '10:24:10', duration: '0.9s', description: 'Kiểm tra 6 mục readiness: 4 đạt, 2 chưa đạt (hóa đơn, quỹ)' },
  { agent: 'MerchantOps', tool: 'request_human_approval', status: 'waiting', confidence: 0.85, timestamp: '10:24:12', duration: '—', description: 'Chờ merchant xác nhận phân loại giao dịch SEPAY-0016 (5,000,000₫)' },
];

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  completed: { color: 'text-success', bg: 'bg-success', icon: 'check', label: 'Hoàn thành' },
  running: { color: 'text-primary', bg: 'bg-primary', icon: 'autorenew', label: 'Đang chạy' },
  waiting: { color: 'text-warning', bg: 'bg-warning', icon: 'hourglass_top', label: 'Chờ duyệt' },
  failed: { color: 'text-danger', bg: 'bg-danger', icon: 'error', label: 'Lỗi' },
};

export default function TracePage() {
  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Agent Trace</h2>
          <p className="font-default text-default text-text-secondary">Run #RUN-2026-07-001 — Đối soát kỳ 07/2026</p>
        </div>
        <span className="inline-flex items-center px-4 py-2 rounded-full bg-warning-light text-warning font-label-caps text-label-caps">
          <span className="material-symbols-outlined text-sm mr-1">hourglass_top</span>
          Chờ duyệt
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-default p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-section-header text-section-header text-text-primary">Kế hoạch thực thi</h3>
          <span className="font-data-mono text-data-mono text-text-secondary">Started: 10:24:01</span>
        </div>
        <div className="relative pl-12 space-y-6 pb-4">
          <div className="timeline-line" style={{ width: '2px', left: '20px' }} />
          {mockSteps.map((step, i) => {
            const cfg = statusConfig[step.status] ?? statusConfig.completed;
            return (
              <div key={i} className="relative group">
                <div className={`absolute -left-[32px] top-6 w-4 h-4 rounded-full ${cfg.bg} border-4 border-white z-10 ${step.status === 'waiting' ? 'agent-pulse' : ''}`} />
                <div className="bg-white border border-border-default rounded-xl p-5 shadow-sm hover:shadow-md transition-all group-hover:border-primary/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-2xl">smart_toy</span>
                      </div>
                      <div>
                        <h4 className="font-section-header text-[15px] text-text-primary">{step.description}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-surface-container-low border border-border-default font-data-mono text-[11px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[12px] mr-1">function</span>
                            {step.tool}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-surface-container-low border border-border-default font-data-mono text-[11px] text-on-surface-variant">
                            {step.agent}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-caps text-label-caps text-xs ${cfg.color} bg-surface-container-low`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-data-mono text-data-mono text-text-secondary">{step.timestamp}</p>
                      <p className="font-data-mono text-data-mono text-text-tertiary text-xs">{step.duration}</p>
                      {step.confidence < 1.0 && (
                        <p className="font-data-mono text-data-mono text-primary text-xs mt-1">Confidence: {(step.confidence * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>
                  {step.status === 'waiting' && (
                    <div className="mt-4 pt-4 border-t border-border-default flex items-center gap-3">
                      <button className="primary-gradient text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <span className="material-symbols-outlined text-sm">check</span>
                        Duyệt
                      </button>
                      <button className="bg-white border border-danger text-danger px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-danger-light transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
