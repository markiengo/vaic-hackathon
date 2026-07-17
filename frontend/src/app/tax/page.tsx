'use client';

import { AppShell } from '@/components/AppShell';
import type { TaxReadinessReport } from '@/types';

const mockReport: TaxReadinessReport = {
  rule_version: '2026.07',
  effective_from: '2021-07-01',
  legal_source: 'Thông tư 40/2021/TT-BTC',
  ready: false,
  checklist: [
    { item: 'merchant_name', label: 'Tên merchant', passed: true, value: 'Salon Hoa', details: 'Khớp với đăng ký kinh doanh' },
    { item: 'tax_id', label: 'Mã số thuế', passed: true, value: '0123456789', details: 'Định dạng hợp lệ' },
    { item: 'revenue_total', label: 'Tổng doanh thu', passed: true, value: '42,500,000₫', details: 'Tổng từ 30 giao dịch bán hàng' },
    { item: 'invoice_count', label: 'Độ phủ hóa đơn', passed: false, value: '28/30 (93.3%)', details: '2 giao dịch chưa có hóa đơn — cần xuất bổ sung' },
    { item: 'cash_revenue', label: 'Doanh thu tiền mặt', passed: false, value: 'Chênh lệch 120,000₫', details: 'Tiền đếm 5,080,000₫ khác dự kiến 5,200,000₫' },
    { item: 'bank_revenue', label: 'Doanh thu ngân hàng', passed: true, value: '23 giao dịch đã đối soát', details: 'Khớp với sao kê ngân hàng' },
  ],
};

export default function TaxPage() {
  const report = mockReport;
  const passed = report.checklist.filter((c) => c.passed).length;
  const total = report.checklist.length;

  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Sẵn sàng thuế</h2>
          <p className="font-default text-default text-text-secondary">Checklist đối soát dữ liệu thuế kỳ 07/2026</p>
        </div>
        <button
          disabled={!report.ready}
          className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${report.ready ? 'primary-gradient text-white hover:opacity-90 shadow-md' : 'bg-surface-container-low text-text-tertiary cursor-not-allowed'}`}
        >
          <span className="material-symbols-outlined">download</span>
          Xuất báo cáo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-default p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">gavel</span>
          </div>
          <div>
            <p className="font-section-header text-section-header text-text-primary">Rule version: {report.rule_version}</p>
            <p className="font-body text-body text-text-secondary">
              Effective: {report.effective_from} | Source: {report.legal_source}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-hero-numbers text-hero-numbers text-text-primary">{passed}/{total}</p>
          <p className="font-label-caps text-label-caps text-text-secondary uppercase">Mục đạt</p>
        </div>
      </div>

      <div className={`rounded-xl p-6 border-l-4 flex items-center gap-4 ${report.ready ? 'bg-success-light border-success' : 'bg-warning-light border-warning'}`}>
        <span className={`material-symbols-outlined text-3xl ${report.ready ? 'text-success' : 'text-warning'}`}>
          {report.ready ? 'check_circle' : 'warning'}
        </span>
        <div>
          <h3 className={`font-section-header text-section-header ${report.ready ? 'text-success' : 'text-warning'}`}>
            {report.ready ? 'Data sẵn sàng cho draft export' : 'Chưa sẵn sàng — cần xử lý các mục chưa đạt'}
          </h3>
          {!report.ready && (
            <p className="font-body text-body text-text-secondary mt-1">
              {report.checklist.filter((c) => !c.passed).map((c) => c.label).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {report.checklist.map((item) => (
          <div
            key={item.item}
            className={`bg-white rounded-xl shadow-sm border border-border-default p-5 flex items-start gap-4 ${item.passed ? '' : 'border-l-4 border-l-warning'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.passed ? 'bg-success-light' : 'bg-warning-light'}`}>
              <span className={`material-symbols-outlined ${item.passed ? 'text-success' : 'text-warning'}`}>
                {item.passed ? 'check' : 'priority_high'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-section-header text-section-header text-text-primary">{item.label}</h4>
                <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-caps text-label-caps text-xs ${item.passed ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>
                  {item.passed ? 'Đạt' : 'Chưa đạt'}
                </span>
              </div>
              <p className="font-data-mono text-data-mono text-text-primary mt-1">{item.value}</p>
              <p className="font-body text-body text-text-secondary mt-1">{item.details}</p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
