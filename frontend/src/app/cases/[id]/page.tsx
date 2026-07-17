'use client';

import { AppShell } from '@/components/AppShell';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  return (
    <AppShell>
      <div className="flex items-center gap-4 border-b border-border-default pb-6">
        <Link href="/cases" className="text-text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-1">{caseId}</h2>
          <p className="font-default text-default text-text-secondary">Salon Hoa — Kỳ 07/2026</p>
        </div>
        <span className="ml-auto inline-flex items-center px-4 py-2 rounded-full bg-warning-light text-warning font-label-caps text-label-caps">
          Đang mở
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-border-default p-6">
            <h3 className="font-section-header text-section-header text-text-primary mb-4">Tóm tắt đối soát</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Tổng giao dịch</p>
                <p className="font-data-mono text-data-mono text-text-primary text-lg">53</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Đã khớp</p>
                <p className="font-data-mono text-data-mono text-success text-lg">48</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Ngoại lệ</p>
                <p className="font-data-mono text-data-mono text-warning text-lg">5</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Tỷ lệ khớp</p>
                <p className="font-data-mono text-data-mono text-primary text-lg">90.6%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border-default p-6">
            <h3 className="font-section-header text-section-header text-text-primary mb-4">Ngoại lệ trong hồ sơ</h3>
            <div className="space-y-3">
              {[
                { id: 'EX-001', desc: 'SEPAY-0006 — Không tìm thấy đơn hàng (80,000₫)', status: 'Chờ xử lý' },
                { id: 'EX-002', desc: 'SEPAY-0011 — Trùng lặp giao dịch (50,000₫)', status: 'Chờ xử lý' },
                { id: 'EX-003', desc: 'SEPAY-0016 — Số tiền không khớp (5,000,000₫)', status: 'Chờ xử lý' },
                { id: 'EX-004', desc: 'SEPAY-0018 — Thiếu hóa đơn (200,000₫)', status: 'Chờ xử lý' },
                { id: 'EX-005', desc: 'CASH-001 — Chênh lệch quỹ (-120,000₫)', status: 'Chờ xử lý' },
              ].map((ex) => (
                <div key={ex.id} className="flex items-center justify-between p-3 border border-border-default rounded-lg hover:bg-surface-container-lowest transition-colors">
                  <div>
                    <span className="font-data-mono text-data-mono text-text-primary">{ex.id}</span>
                    <p className="font-body text-body text-text-secondary mt-1">{ex.desc}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-warning-light text-warning font-label-caps text-label-caps text-xs">
                    {ex.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-border-default p-6">
            <h3 className="font-section-header text-section-header text-text-primary mb-4">Thông tin hồ sơ</h3>
            <div className="space-y-3">
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Merchant</p>
                <p className="font-body text-body text-text-primary">Salon Hoa (M001)</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Kỳ</p>
                <p className="font-data-mono text-data-mono text-text-primary">2026-07</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">RM phụ trách</p>
                <p className="font-body text-body text-text-secondary">Chưa phân công</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Ngày tạo</p>
                <p className="font-data-mono text-data-mono text-text-secondary">17/07/2026</p>
              </div>
            </div>
            <button className="mt-4 w-full primary-gradient text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Phân công RM
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border-default p-6">
            <h3 className="font-section-header text-section-header text-text-primary mb-4">Ghi chú</h3>
            <textarea
              placeholder="Thêm ghi chú..."
              className="w-full bg-white border border-border-default rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary text-body min-h-[100px] resize-none"
            />
            <button className="mt-3 w-full bg-white border border-border-default text-text-primary py-2 rounded-lg font-medium hover:bg-surface-container-low transition-colors">
              Lưu ghi chú
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
