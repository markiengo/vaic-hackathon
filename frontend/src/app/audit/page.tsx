'use client';

import { AppShell } from '@/components/AppShell';
import type { AuditEvent } from '@/types';

const mockEvents: AuditEvent[] = [
  { id: '1', timestamp: '10:24:12', agent: 'MerchantOps', tool: 'request_human_approval', action: 'Chờ duyệt', details: 'Phân loại SEPAY-0016 — 5,000,000₫' },
  { id: '2', timestamp: '10:24:10', agent: 'TaxCompliance', tool: 'check_required_fields', action: 'Kiểm tra', details: '6 mục readiness — 4 đạt, 2 chưa đạt' },
  { id: '3', timestamp: '10:24:08', agent: 'MerchantOps', tool: 'classify_exception', action: 'Phân loại', details: '5 ngoại lệ phân loại — avg confidence 88%' },
  { id: '4', timestamp: '10:24:05', agent: 'Reconciliation', tool: 'score_match_candidates', action: 'Đối soát', details: '23/23 giao dịch — 20 khớp, 3 ngoại lệ' },
  { id: '5', timestamp: '10:24:03', agent: 'Reconciliation', tool: 'fetch_sales', action: 'Lấy dữ liệu', details: '30 giao dịch bán hàng từ POS' },
  { id: '6', timestamp: '10:24:02', agent: 'Reconciliation', tool: 'fetch_bank_transactions', action: 'Lấy dữ liệu', details: '23 giao dịch ngân hàng từ SePay' },
  { id: '7', timestamp: '10:24:01', agent: 'Planner', tool: 'create_plan', action: 'Lập kế hoạch', details: 'Kế hoạch đối soát 4 bước' },
  { id: '8', timestamp: '09:15:30', agent: 'System', tool: 'webhook_received', action: 'Webhook', details: 'SePay webhook — giao dịch mới 200,000₫' },
  { id: '9', timestamp: '08:00:00', agent: 'System', tool: 'daily_reconciliation_start', action: 'Khởi tạo', details: 'Đối soát hàng ngày kỳ 07/2026' },
];

const agentColors: Record<string, string> = {
  Planner: 'bg-secondary-light text-secondary',
  Reconciliation: 'bg-primary-light text-primary',
  MerchantOps: 'bg-warning-light text-warning',
  TaxCompliance: 'bg-success-light text-success',
  System: 'bg-surface-container-low text-text-secondary',
};

export default function AuditPage() {
  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Audit Log</h2>
          <p className="font-default text-default text-text-secondary">Lịch sử hoạt động agent — kỳ 07/2026</p>
        </div>
        <button className="bg-white border border-secondary text-secondary px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-secondary-light transition-colors">
          <span className="material-symbols-outlined">download</span>
          Xuất CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-strong text-text-secondary font-label-caps text-label-caps uppercase">
                <th className="p-4 whitespace-nowrap">Thời gian</th>
                <th className="p-4 whitespace-nowrap">Agent</th>
                <th className="p-4 whitespace-nowrap">Tool</th>
                <th className="p-4 whitespace-nowrap">Hành động</th>
                <th className="p-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="font-body text-body divide-y divide-border-default">
              {mockEvents.map((event) => (
                <tr key={event.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-4 font-data-mono text-data-mono text-text-secondary whitespace-nowrap">{event.timestamp}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-caps text-label-caps text-xs ${agentColors[event.agent] ?? 'bg-surface-container-low text-text-secondary'}`}>
                      {event.agent}
                    </span>
                  </td>
                  <td className="p-4 font-data-mono text-data-mono text-on-surface-variant whitespace-nowrap">{event.tool}</td>
                  <td className="p-4 whitespace-nowrap">{event.action}</td>
                  <td className="p-4 text-text-primary">{event.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
