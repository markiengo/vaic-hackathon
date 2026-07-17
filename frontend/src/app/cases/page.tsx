'use client';

import { AppShell } from '@/components/AppShell';
import Link from 'next/link';
import type { Case } from '@/types';

const mockCases: Case[] = [
  { id: 'CASE-001', merchant_id: 'M001', merchant_name: 'Salon Hoa', period: '2026-07', status: 'open', assigned_rm: null, message: null },
  { id: 'CASE-002', merchant_id: 'M001', merchant_name: 'Salon Hoa', period: '2026-06', status: 'resolved', assigned_rm: 'Nguyễn Văn A', message: 'Đã xử lý ngoại lệ kỳ 06' },
  { id: 'CASE-003', merchant_id: 'M001', merchant_name: 'Salon Hoa', period: '2026-05', status: 'resolved', assigned_rm: 'Nguyễn Văn A', message: 'Đã xuất báo cáo thuế' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Đang mở', color: 'bg-warning-light text-warning' },
  resolved: { label: 'Đã giải quyết', color: 'bg-success-light text-success' },
  pending: { label: 'Chờ xử lý', color: 'bg-secondary-light text-secondary' },
};

export default function CasesPage() {
  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Hồ sơ</h2>
          <p className="font-default text-default text-text-secondary">Quản lý hồ sơ đối soát thuế</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-strong text-text-secondary font-label-caps text-label-caps uppercase">
                <th className="p-4">Mã hồ sơ</th>
                <th className="p-4">Merchant</th>
                <th className="p-4">Kỳ</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">RM phụ trách</th>
                <th className="p-4">Ghi chú</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="font-body text-body divide-y divide-border-default">
              {mockCases.map((c) => {
                const cfg = statusConfig[c.status] ?? statusConfig.open;
                return (
                  <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="p-4 font-data-mono text-data-mono text-text-primary">{c.id}</td>
                    <td className="p-4">{c.merchant_name}</td>
                    <td className="p-4 font-data-mono text-data-mono">{c.period}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-caps text-label-caps text-xs ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary">{c.assigned_rm ?? '—'}</td>
                    <td className="p-4 text-text-secondary max-w-xs truncate">{c.message ?? '—'}</td>
                    <td className="p-4 text-right">
                      <Link href={`/cases/${c.id}`} className="text-secondary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
