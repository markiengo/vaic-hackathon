'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { fetchDashboard } from '@/lib/api';
import { useStore } from '@/lib/store';
import Link from 'next/link';

export default function DashboardPage() {
  const { merchantId, period } = useStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', merchantId, period],
    queryFn: () => fetchDashboard(merchantId, period),
  });

  const stats = data ?? { total_transactions: 0, reconciliation_rate: 0, open_exceptions: 0, tax_ready: false, matched: 0, pending: 0, exceptions: 0 };

  const exceptions = [
    { id: 'TX-9921', type: 'Sai lệch VAT', amount: 450000, time: '10:24 AM', status: 'Chờ xử lý' },
    { id: 'TX-8842', type: 'Thiếu mã ĐVCNTT', amount: 1250000, time: '09:15 AM', status: 'Đang kiểm tra' },
    { id: 'TX-7731', type: 'Sai tỷ lệ phí', amount: 15500, time: 'Hôm qua', status: 'Chờ xử lý' },
    { id: 'TX-6690', type: 'Lỗi hoàn tiền thuế', amount: 3000000, time: 'Hôm qua', status: 'Đang kiểm tra' },
    { id: 'TX-5512', type: 'Trùng lặp chứng từ', amount: 850000, time: '2 ngày trước', status: 'Chờ xử lý' },
  ];

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  return (
    <AppShell>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Xin chào, Nguyễn Văn A</h2>
          <p className="font-default text-default text-text-secondary">Dưới đây là tóm tắt công việc đối soát và ngoại lệ thuế hôm nay.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-secondary text-secondary font-default text-default px-4 py-2 rounded-lg hover:bg-secondary-light transition-colors duration-200 shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined">download</span>
            Xuất báo cáo thuế
          </button>
          <Link href="/trace" className="primary-gradient text-white font-default text-default px-4 py-2 rounded-lg hover:opacity-90 transition-opacity duration-200 shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined">play_arrow</span>
            Bắt đầu đối soát
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Tổng giao dịch" value={isLoading ? '...' : fmt(stats.total_transactions)} icon="receipt_long" color="primary" trend="+5.2% hôm nay" trendColor="success" />
        <StatCard label="Cần đối soát" value={isLoading ? '...' : fmt(stats.pending)} icon="pending_actions" color="warning" trend="Ưu tiên xử lý" trendColor="text-secondary" />
        <StatCard label="Ngoại lệ mới" value={isLoading ? '...' : fmt(stats.open_exceptions)} icon="error_outline" color="danger" trend="+12 so với hqua" trendColor="danger" />
        <StatCard label="Báo cáo sẵn sàng" value={isLoading ? '...' : (stats.tax_ready ? 'Sẵn sàng' : 'Chưa')} icon="task_alt" color="success" trend={stats.tax_ready ? 'Sẵn sàng kết xuất' : 'Cần xử lý'} trendColor={stats.tax_ready ? 'success' : 'warning'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-border-default p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-section-header text-section-header text-text-primary">Tiến độ đối soát</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-48 h-48 rounded-full border-[16px] border-surface-variant relative flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-[16px] border-primary"
                style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 50%)', transform: `rotate(${45 + (stats.reconciliation_rate / 100) * 270}deg)` }}
              />
              <div className="text-center z-10">
                <span className="block font-hero-numbers text-hero-numbers text-text-primary">{stats.reconciliation_rate}%</span>
                <span className="block font-label-caps text-label-caps text-text-secondary">Khớp đúng</span>
              </div>
            </div>
            <div className="w-full mt-8 space-y-3">
              <LegendRow color="bg-primary" label="Đã khớp" value={fmt(stats.matched)} />
              <LegendRow color="bg-warning" label="Chờ xử lý" value={fmt(stats.pending)} />
              <LegendRow color="bg-danger" label="Ngoại lệ" value={fmt(stats.exceptions)} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-border-default overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border-default flex justify-between items-center surface-gradient">
            <h3 className="font-section-header text-section-header text-text-primary">Ngoại lệ cần xử lý gấp</h3>
            <Link href="/exceptions" className="font-label-caps text-label-caps text-primary hover:underline">Xem tất cả</Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-strong text-text-secondary font-label-caps text-label-caps uppercase">
                  <th className="p-4 whitespace-nowrap">Mã GD</th>
                  <th className="p-4 whitespace-nowrap">Loại lỗi</th>
                  <th className="p-4 text-right whitespace-nowrap">Giá trị (VND)</th>
                  <th className="p-4 whitespace-nowrap">Thời gian</th>
                  <th className="p-4 whitespace-nowrap">Trạng thái</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="font-body text-body divide-y divide-border-default">
                {exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="p-4 font-data-mono text-data-mono text-text-primary">{ex.id}</td>
                    <td className="p-4">{ex.type}</td>
                    <td className="p-4 text-right font-data-mono text-data-mono text-text-primary">{fmt(ex.amount)}</td>
                    <td className="p-4 text-text-secondary font-data-mono">{ex.time}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-caps text-label-caps text-xs ${ex.status === 'Chờ xử lý' ? 'bg-warning-light text-warning' : 'bg-secondary-light text-secondary'}`}>
                        {ex.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href="/exceptions" className="text-secondary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon, color, trend, trendColor }: { label: string; value: string; icon: string; color: string; trend: string; trendColor: string }) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary-light',
    warning: 'text-warning bg-warning-light',
    danger: 'text-danger bg-danger-light',
    success: 'text-success bg-success-light',
  };
  const trendMap: Record<string, string> = {
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
    'text-secondary': 'text-text-secondary',
  };
  return (
    <div className="surface-gradient rounded-xl p-6 shadow-sm hover:shadow-card-hover transition-shadow duration-200 border border-border-default relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-16 h-16 bg-${color}-light rounded-bl-full opacity-50 group-hover:scale-110 transition-transform`} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-section-header text-section-header text-text-secondary">{label}</h3>
        <span className={`material-symbols-outlined p-2 rounded-full ${colorMap[color]}`}>{icon}</span>
      </div>
      <p className="font-hero-numbers text-hero-numbers text-text-primary">{value}</p>
      <div className={`mt-2 flex items-center font-label-caps text-label-caps ${trendMap[trendColor]}`}>
        {trendColor === 'success' && <span className="material-symbols-outlined text-sm mr-1">trending_up</span>}
        <span>{trend}</span>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center font-body text-body">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
      <span className="font-data-mono text-data-mono text-text-primary">{value}</span>
    </div>
  );
}
