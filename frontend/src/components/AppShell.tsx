'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
  { href: '/exceptions', label: 'Ngoại lệ', icon: 'priority_high' },
  { href: '/tax', label: 'Báo cáo thuế', icon: 'description' },
  { href: '/cases', label: 'Hồ sơ', icon: 'assignment' },
  { href: '/trace', label: 'Agent Trace', icon: 'location_searching' },
  { href: '/audit', label: 'Audit', icon: 'history_edu' },
  { href: '/pos', label: 'Mini POS', icon: 'point_of_sale' },
  { href: '/confirm', label: 'Xác nhận', icon: 'check_circle' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 z-50 bg-surface-container-low border-r border-border-default py-stack-lg shadow-sm">
      <div className="px-4 mb-stack-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg primary-gradient flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-2xl">account_balance</span>
        </div>
        <div>
          <h1 className="font-section-header text-section-header font-bold text-on-surface">TaxLens</h1>
          <p className="font-label-caps text-label-caps text-text-secondary">Merchant TaxOps</p>
        </div>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-stack-md px-4 py-3 rounded-lg font-label-caps text-label-caps uppercase transition-transform duration-200 active:scale-95',
                active
                  ? 'bg-primary-light text-primary font-semibold hover:translate-x-1'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:translate-x-1',
              )}
            >
              <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-2 mt-auto space-y-1">
        <Link href="#" className="flex items-center gap-stack-md px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-lg font-label-caps text-label-caps uppercase transition-transform hover:translate-x-1 duration-200">
          <span className="material-symbols-outlined">settings</span>
          <span>Cài đặt</span>
        </Link>
        <Link href="#" className="flex items-center gap-stack-md px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-lg font-label-caps text-label-caps uppercase transition-transform hover:translate-x-1 duration-200">
          <span className="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
        </Link>
      </div>
    </aside>
  );
}

export function Header() {
  return (
    <header className="flex justify-between items-center px-8 w-full h-16 glass-surface sticky top-0 z-40 border-b border-border-default shadow-sm">
      <div className="flex items-center space-x-6">
        <h1 className="font-page-title text-page-title text-primary font-bold">TaxLens</h1>
        <div className="flex items-center space-x-2 cursor-pointer">
          <span className="text-on-surface-variant font-label-caps text-label-caps">Salon Hoa</span>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">expand_more</span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors duration-200">
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors duration-200">
          <span className="material-symbols-outlined text-on-surface-variant">help</span>
        </button>
        <div className="w-8 h-8 rounded-full primary-gradient flex items-center justify-center text-white text-sm font-semibold">
          NV
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 overflow-y-auto bg-[#F9FAFB]">
        <Header />
        <div className="px-container-margin py-8 max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
